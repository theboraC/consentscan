import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import ExcelJS from 'exceljs';
import { User, Workspace, Membership, Invite, Location, Scan, Contact } from './models.js';
import { scan, enqueue } from './scanner.js';
import { mail } from './mail.js';
import { OAuth2Client } from 'google-auth-library';

const { JWT_SECRET = 'dev-secret', FRONTEND_URL = 'http://localhost:5173', MONGODB_URI, PORT = 8080, ADMIN_EMAIL } = process.env;
const FRONT = FRONTEND_URL.split(',')[0];
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const rnd = () => crypto.randomBytes(24).toString('hex');
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sign = (u) => jwt.sign({ id: u._id }, JWT_SECRET, { expiresIn: '30d' });
const EDIT = ['owner', 'editor'];

const app = express();
app.use(cors({ origin: FRONTEND_URL.split(',') }));
app.use(express.json({ limit: '5mb' }));
app.get('/health', (_, res) => res.send('ok'));

// ---------- middleware ----------
const auth = async (req, res, next) => {
  try {
    const { id } = jwt.verify((req.headers.authorization || '').slice(7), JWT_SECRET);
    req.user = await User.findById(id);
    if (!req.user) throw new Error();
    next();
  } catch { res.status(401).json({ error: 'Please sign in again' }); }
};
const ws = (roles) => async (req, res, next) => {
  const m = await Membership.findOne({ user: req.user._id, workspace: req.headers['x-workspace'] });
  if (!m || (roles && !roles.includes(m.role))) return res.status(403).json({ error: 'You do not have access to do that in this workspace' });
  req.m = m; req.wsId = m.workspace; next();
};

// ---------- auth ----------
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 8) return res.status(400).json({ error: 'Enter your name, email and a password of 8+ characters' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'That email is already registered' });
  const verifyToken = rnd();
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10), verifyToken });
  const w = await Workspace.create({ name: `${name}'s workspace`, owner: u._id });
  await Membership.create({ user: u._id, workspace: w._id, role: 'owner' });
  mail(u.email, 'Verify your ConsentScan email', `<p>Hi ${esc(name)},</p><p><a href="${FRONT}/verify/${verifyToken}">Verify your email</a> to finish setting up ConsentScan.</p>`);
  res.json({ token: sign(u) });
});
app.post('/api/auth/login', async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || !u.password || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(401).json({ error: 'Email or password is incorrect' });
  res.json({ token: sign(u) });
});
   app.post('/api/auth/google', async (req, res) => {
     try {
       const ticket = await googleClient.verifyIdToken({ idToken: req.body.credential, audience: process.env.GOOGLE_CLIENT_ID });
       const p = ticket.getPayload();
       if (!p.email || !p.email_verified) return res.status(400).json({ error: 'Your Google email is not verified' });
       let u = await User.findOne({ email: p.email.toLowerCase() });
       if (!u) {
         u = await User.create({ name: p.name || p.email.split('@')[0], email: p.email, verified: true });
         const w = await Workspace.create({ name: `${u.name}'s workspace`, owner: u._id });
         await Membership.create({ user: u._id, workspace: w._id, role: 'owner' });
       } else if (!u.verified) { u.verified = true; await u.save(); }
       res.json({ token: sign(u) });
     } catch { res.status(401).json({ error: 'Google sign-in failed. Please try again.' }); }
   });
app.get('/api/auth/verify/:token', async (req, res) => {
  const u = await User.findOneAndUpdate({ verifyToken: req.params.token }, { verified: true, verifyToken: null });
  u ? res.json({ ok: true }) : res.status(400).json({ error: 'This verification link is invalid or already used' });
});
app.post('/api/auth/forgot', async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (u) {
    u.resetToken = rnd(); u.resetExp = new Date(Date.now() + 3600e3); await u.save();
    mail(u.email, 'Reset your ConsentScan password', `<p><a href="${FRONT}/reset/${u.resetToken}">Choose a new password</a>. This link expires in one hour.</p>`);
  }
  res.json({ ok: true });
});
app.post('/api/auth/reset', async (req, res) => {
  const u = await User.findOne({ resetToken: req.body.token, resetExp: { $gt: new Date() } });
  if (!u || !req.body.password || req.body.password.length < 8) return res.status(400).json({ error: 'The link has expired or the password is too short' });
  u.password = await bcrypt.hash(req.body.password, 10); u.resetToken = null; await u.save();
  res.json({ ok: true });
});
app.get('/api/me', auth, async (req, res) => {
  const ms = await Membership.find({ user: req.user._id }).populate('workspace', 'name');
  res.json({
    user: { id: req.user._id, name: req.user.name, email: req.user.email, verified: req.user.verified },
    workspaces: ms.map((m) => ({ id: m.workspace._id, name: m.workspace.name, role: m.role })),
  });
});
app.post('/api/workspaces', auth, async (req, res) => {
  const w = await Workspace.create({ name: req.body.name || 'New workspace', owner: req.user._id });
  await Membership.create({ user: req.user._id, workspace: w._id, role: 'owner' });
  res.json({ id: w._id });
});

// ---------- scanning ----------
const limiter = rateLimit({ windowMs: 3600e3, limit: 30, keyGenerator: (r) => String(r.user._id), validate: false, message: { error: 'Scan limit reached (30 per hour). Try again later.' } });
app.post('/api/scan', auth, limiter, async (req, res) => {
  try { res.json(await enqueue(() => scan(String(req.body.url || '').trim()))); }
  catch (e) { res.status(422).json({ error: e.message.split('\n')[0] }); }
});

// ---------- locations ----------
app.get('/api/locations', auth, ws(), async (req, res) => {
  const locs = await Location.find({ workspace: req.wsId }).sort('name').lean();
  const counts = await Scan.aggregate([{ $match: { workspace: req.wsId } }, { $group: { _id: '$location', n: { $sum: 1 } } }]);
  res.json(locs.map((l) => ({ ...l, count: counts.find((c) => String(c._id) === String(l._id))?.n || 0 })));
});
app.post('/api/locations', auth, ws(EDIT), async (req, res) => {
  if (!req.body.name?.trim()) return res.status(400).json({ error: 'Give the location a name' });
  res.json(await Location.create({ workspace: req.wsId, name: req.body.name.trim(), createdBy: req.user._id }));
});
app.patch('/api/locations/:id', auth, ws(EDIT), async (req, res) => {
  res.json(await Location.findOneAndUpdate({ _id: req.params.id, workspace: req.wsId }, { name: req.body.name }, { new: true }));
});
app.delete('/api/locations/:id', auth, ws(EDIT), async (req, res) => {
  await Scan.deleteMany({ location: req.params.id, workspace: req.wsId });
  await Location.deleteOne({ _id: req.params.id, workspace: req.wsId });
  res.json({ ok: true });
});

// ---------- saved scans ----------
app.get('/api/scans', auth, ws(), async (req, res) => {
  const f = { workspace: req.wsId };
  if (req.query.location) f.location = req.query.location;
  if (req.query.q) f.url = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  res.json(await Scan.find(f).select('url score createdAt location savedBy').sort('-createdAt').limit(300).populate('savedBy', 'name').populate('location', 'name'));
});
app.get('/api/scans/:id', auth, ws(), async (req, res) => {
  const s = await Scan.findOne({ _id: req.params.id, workspace: req.wsId });
  s ? res.json(s) : res.status(404).json({ error: 'Scan not found' });
});
app.post('/api/scans', auth, ws(EDIT), async (req, res) => {
  const { result: r, locationId } = req.body;
  if (!r?.url || !(await Location.exists({ _id: locationId, workspace: req.wsId }))) return res.status(400).json({ error: 'Choose a location to save into' });
  const s = await Scan.create({ ...r, workspace: req.wsId, location: locationId, savedBy: req.user._id });
  res.json({ id: s._id });
});
app.delete('/api/scans/:id', auth, ws(EDIT), async (req, res) => {
  await Scan.deleteOne({ _id: req.params.id, workspace: req.wsId });
  res.json({ ok: true });
});

// ---------- Excel export ----------
app.get('/api/export', auth, ws(), async (req, res) => {
  const f = { workspace: req.wsId }; if (req.query.location) f.location = req.query.location;
  const scans = await Scan.find(f).sort('-createdAt').populate('savedBy', 'name').populate('location', 'name');
  const wb = new ExcelJS.Workbook();
  const sum = wb.addWorksheet('Summary'), ck = wb.addWorksheet('Cookies'), chk = wb.addWorksheet('Checks');
  sum.columns = ['Website', 'Score', 'Location', 'Saved by', 'Saved on', 'Banner', 'Accept', 'Reject', 'Manage preferences', 'Non-essential cookies before consent', 'Cookie policy', 'Privacy policy'].map((h) => ({ header: h, width: h.length + 10 }));
  ck.columns = ['Website', 'Stage', 'Cookie', 'Domain', 'Category', 'Party', 'Expires', 'Secure', 'HttpOnly', 'SameSite'].map((h) => ({ header: h, width: 18 }));
  chk.columns = [{ header: 'Website', width: 34 }, { header: 'Check', width: 30 }, { header: 'Result', width: 10 }, { header: 'Details', width: 90 }];
  for (const s of scans) {
    const st = (id) => (s.checks.find((c) => c.id === id)?.status || 'n/a').toUpperCase();
    sum.addRow([s.url, s.score, s.location?.name, s.savedBy?.name, s.createdAt, st('banner'), st('accept'), st('reject'), st('manage'), st('pre'), st('cookiePolicy'), st('privacyPolicy')]);
    for (const [stage, list] of [['Before consent', s.cookies?.pre], ['After accept', s.cookies?.accept], ['After reject', s.cookies?.reject]])
      for (const c of list || []) ck.addRow([s.url, stage, c.name, c.domain, c.category, c.party, c.expires, c.secure, c.httpOnly, c.sameSite]);
    for (const c of s.checks) chk.addRow([s.url, c.title, c.status.toUpperCase(), c.detail]);
  }
  for (const sh of [sum, ck, chk]) { sh.getRow(1).font = { bold: true }; sh.views = [{ state: 'frozen', ySplit: 1 }]; }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="consentscan-export.xlsx"');
  await wb.xlsx.write(res); res.end();
});

// ---------- team & invites ----------
app.get('/api/team', auth, ws(), async (req, res) => {
  const members = await Membership.find({ workspace: req.wsId }).populate('user', 'name email');
  const invites = req.m.role === 'owner' ? await Invite.find({ workspace: req.wsId, expires: { $gt: new Date() } }) : [];
  res.json({ members: members.map((m) => ({ id: m._id, name: m.user.name, email: m.user.email, role: m.role })), invites: invites.map((i) => ({ id: i._id, role: i.role, link: `${FRONT}/join/${i.token}`, expires: i.expires })) });
});
app.post('/api/team/invites', auth, ws(['owner']), async (req, res) => {
  const role = req.body.role === 'viewer' ? 'viewer' : 'editor';
  const i = await Invite.create({ workspace: req.wsId, token: rnd(), role, expires: new Date(Date.now() + 7 * 864e5) });
  res.json({ link: `${FRONT}/join/${i.token}` });
});
app.delete('/api/team/invites/:id', auth, ws(['owner']), async (req, res) => { await Invite.deleteOne({ _id: req.params.id, workspace: req.wsId }); res.json({ ok: true }); });
app.delete('/api/team/members/:id', auth, ws(['owner']), async (req, res) => { await Membership.deleteOne({ _id: req.params.id, workspace: req.wsId, role: { $ne: 'owner' } }); res.json({ ok: true }); });
app.post('/api/invites/:token/join', auth, async (req, res) => {
  const i = await Invite.findOne({ token: req.params.token, expires: { $gt: new Date() } });
  if (!i) return res.status(400).json({ error: 'This invite link has expired or was revoked' });
  await Membership.updateOne({ user: req.user._id, workspace: i.workspace }, { $setOnInsert: { role: i.role } }, { upsert: true });
  res.json({ workspace: i.workspace });
});

// ---------- contact ----------
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Fill in your name, email and message' });
  await Contact.create({ name, email, message });
  if (ADMIN_EMAIL) mail(ADMIN_EMAIL, `ConsentScan contact from ${esc(name)}`, `<p>${esc(message)}</p><p>${esc(name)} &lt;${esc(email)}&gt;</p>`);
  res.json({ ok: true });
});

app.use((e, req, res, next) => { console.error(e); res.status(500).json({ error: 'Something went wrong on our side' }); });
await mongoose.connect(MONGODB_URI);
app.listen(PORT, () => console.log('ConsentScan API listening on ' + PORT));
