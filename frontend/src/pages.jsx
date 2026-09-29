import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, store } from './api';
import { useAuth } from './auth.jsx';
import { Btn, Ring, inp, card } from './ui.jsx';

const Logo = () => (
  <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl">
    <svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="#c77b1f" /><circle cx="9" cy="10" r="1.8" fill="#f3f5f7" /><circle cx="16" cy="9" r="1.4" fill="#f3f5f7" /><circle cx="15" cy="16" r="2" fill="#f3f5f7" /><circle cx="8.5" cy="16" r="1.3" fill="#f3f5f7" /></svg>
    ConsentScan
  </Link>
);
export const Shell = ({ children, narrow }) => (
  <div className="min-h-screen flex flex-col">
    <header className="max-w-6xl w-full mx-auto px-5 py-5 flex items-center justify-between"><Logo />
      <nav className="flex items-center gap-2 text-sm"><Link to="/contact" className="px-3 py-2 text-mute hover:text-ink">Contact</Link><Link to="/login" className="px-3 py-2">Sign in</Link><Link to="/signup"><Btn>Start free</Btn></Link></nav>
    </header>
    <main className={`flex-1 w-full mx-auto px-5 ${narrow ? 'max-w-md' : 'max-w-6xl'}`}>{children}</main>
    <footer className="max-w-6xl w-full mx-auto px-5 py-8 text-sm text-mute border-t border-line mt-16 flex justify-between flex-wrap gap-2">
      <span>ConsentScan gives automated audit findings, not legal advice.</span><Link to="/contact" className="hover:text-ink">Contact us</Link>
    </footer>
  </div>
);

const features = [
  ['Banner and button detection', 'Finds the banner and checks for Accept, Reject and Manage preferences, including common consent platforms and non-English labels.'],
  ['Cookies before consent', 'Loads the site in a clean browser and records every cookie and tracker request before anyone clicks anything.'],
  ['Accept vs. reject comparison', 'Clicks each button in a fresh session and shows which cookies appear or stay.'],
  ['Policy link checks', 'Finds the cookie and privacy policy links and confirms the pages actually load.'],
  ['Saved locations', 'File every scan into named locations like "Client A" or "Competitors" and export them to Excel.'],
  ['Shared workspaces', 'Send an invite link so your team can view or add scans in the same workspace.'],
];

export function Landing() {
  const nav = useNavigate(); const [u, setU] = useState('');
  return (
    <Shell>
      <section className="grid lg:grid-cols-[1.1fr_.9fr] gap-12 items-center pt-10 pb-16">
        <div>
          <h1 className="font-display font-bold text-5xl md:text-6xl leading-[1.02] tracking-tight">Find out what a website tracks before anyone says yes.</h1>
          <p className="mt-5 text-lg text-mute max-w-lg">Paste a link. ConsentScan opens the site like a first-time visitor, checks the cookie banner and policies, and lists every cookie set before and after consent.</p>
          <form onSubmit={(e) => { e.preventDefault(); nav('/signup'); }} className="mt-8 flex gap-2 max-w-lg">
            <input className={inp} placeholder="example.com" value={u} onChange={(e) => setU(e.target.value)} aria-label="Website to scan" />
            <Btn type="submit">Scan a site</Btn>
          </form>
          <p className="mt-3 text-sm text-mute">Free to use. Sign up to run and save scans.</p>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }} className={`${card} p-6 shadow-[0_20px_50px_-30px_rgba(16,27,43,.35)]`}>
          <div className="flex items-center gap-5"><Ring score={42} size={112} />
            <div><p className="text-sm text-mute">Sample report</p><p className="font-display font-bold text-xl">shop.example.com</p><p className="text-sm text-fail mt-1">Failed: 9 cookies set before consent</p></div></div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[['Before consent', 9, 'text-fail'], ['After accept', 17, 'text-ink'], ['After reject', 6, 'text-crumb']].map(([l, n, c]) => (
              <div key={l} className="border border-line rounded-lg py-3"><p className={`font-display font-bold text-3xl ${c}`}>{n}</p><p className="text-xs text-mute">{l}</p></div>))}
          </div>
          <ul className="mt-5 text-sm divide-y divide-line">{[['Cookie banner', 'Pass'], ['Reject button', 'Fail'], ['Cookie policy link', 'Pass']].map(([a, b]) => (
            <li key={a} className="flex justify-between py-2"><span>{a}</span><span className={b === 'Pass' ? 'text-pass' : 'text-fail'}>{b}</span></li>))}</ul>
        </motion.div>
      </section>
      <section className="grid md:grid-cols-3 gap-px bg-line border border-line rounded-lg overflow-hidden">
        {features.map(([t, d]) => <div key={t} className="bg-white p-6"><h3 className="font-display font-bold text-lg">{t}</h3><p className="text-sm text-mute mt-2">{d}</p></div>)}
      </section>
      <section className="mt-16 grid md:grid-cols-3 gap-8">
        {[['Paste a link', 'Any public website works.'], ['We test it in a clean browser', 'No cookies, no history, no clicks until we check the "before" state.'], ['Save and share the report', 'Store it in a location and download everything as Excel.']].map(([t, d], i) => (
          <div key={t}><p className="font-display font-bold text-crumb text-3xl">{i + 1}</p><h3 className="font-semibold mt-1">{t}</h3><p className="text-sm text-mute mt-1">{d}</p></div>))}
      </section>
      <section className="mt-16 max-w-2xl">
        <h2 className="font-display font-bold text-3xl mb-4">Questions</h2>
        {[['Is this legal advice?', 'No. Results are automated findings that help you spot issues. Confirm important cases with a qualified professional.'],
          ['Why did a scan fail to load?', 'Some sites block automated browsers. When that happens the report says results may be incomplete.'],
          ['Can I scan any site?', 'Public http and https sites. Local and private network addresses are blocked for safety.']].map(([q, a]) => (
          <details key={q} className="border-b border-line py-3"><summary className="cursor-pointer font-medium">{q}</summary><p className="text-sm text-mute mt-2">{a}</p></details>))}
      </section>
    </Shell>
  );
}

export function AuthPage({ mode }) {
  const nav = useNavigate(), loc = useLocation(), { reload } = useAuth();
  const [f, setF] = useState({ name: '', email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [forgot, setForgot] = useState(false); const [info, setInfo] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (forgot) { await api('/auth/forgot', { method: 'POST', body: { email: f.email } }); setInfo('If that email has an account, a reset link is on its way.'); }
      else { const d = await api(`/auth/${mode}`, { method: 'POST', body: f }); store.token = d.token; await reload(); nav(loc.state?.next || '/app'); }
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <Shell narrow>
      <div className={`${card} p-7 mt-8`}>
        <h1 className="font-display font-bold text-3xl">{forgot ? 'Reset your password' : mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === 'signup' && !forgot && <input className={inp} placeholder="Your name" value={f.name} onChange={set('name')} required aria-label="Name" />}
          <input className={inp} type="email" placeholder="Email" value={f.email} onChange={set('email')} required aria-label="Email" />
          {!forgot && <input className={inp} type="password" placeholder="Password (8+ characters)" value={f.password} onChange={set('password')} required minLength={8} aria-label="Password" />}
          {err && <p className="text-sm text-fail" role="alert">{err}</p>}{info && <p className="text-sm text-pass">{info}</p>}
          <Btn className="w-full" disabled={busy}>{busy ? 'Working…' : forgot ? 'Send reset link' : mode === 'signup' ? 'Create account' : 'Sign in'}</Btn>
        </form>
        <div className="mt-4 text-sm text-mute flex justify-between">
          {mode === 'login' ? <button type="button" onClick={() => setForgot(!forgot)} className="hover:text-ink cursor-pointer">{forgot ? 'Back to sign in' : 'Forgot password?'}</button> : <span />}
          {mode === 'login' ? <Link className="hover:text-ink" to="/signup" state={loc.state}>Create an account</Link> : <Link className="hover:text-ink" to="/login" state={loc.state}>I already have an account</Link>}
        </div>
      </div>
    </Shell>
  );
}

export function Verify() {
  const { token } = useParams(); const [m, setM] = useState('Checking your link…');
  useEffect(() => { api('/auth/verify/' + token).then(() => setM('Email verified. You can close this tab or continue.')).catch((e) => setM(e.message)); }, [token]);
  return <Shell narrow><div className={`${card} p-7 mt-8`}><h1 className="font-display font-bold text-2xl">Email verification</h1><p className="mt-3 text-mute">{m}</p><Link to="/app"><Btn className="mt-5">Open ConsentScan</Btn></Link></div></Shell>;
}

export function Reset() {
  const { token } = useParams(), nav = useNavigate(); const [p, setP] = useState(''); const [err, setErr] = useState('');
  const go = async (e) => { e.preventDefault(); try { await api('/auth/reset', { method: 'POST', body: { token, password: p } }); nav('/login'); } catch (x) { setErr(x.message); } };
  return <Shell narrow><form onSubmit={go} className={`${card} p-7 mt-8 space-y-3`}><h1 className="font-display font-bold text-2xl">Choose a new password</h1>
    <input className={inp} type="password" minLength={8} required placeholder="New password (8+ characters)" value={p} onChange={(e) => setP(e.target.value)} aria-label="New password" />
    {err && <p className="text-sm text-fail">{err}</p>}<Btn className="w-full">Save password</Btn></form></Shell>;
}

export function Contact() {
  const [f, setF] = useState({ name: '', email: '', message: '' }); const [done, setDone] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = async (e) => { e.preventDefault(); try { await api('/contact', { method: 'POST', body: f }); setDone(true); } catch (x) { setErr(x.message); } };
  return <Shell narrow><div className={`${card} p-7 mt-8`}><h1 className="font-display font-bold text-3xl">Contact us</h1>
    {done ? <p className="mt-4 text-pass">Message sent. We will reply by email.</p> : <form onSubmit={go} className="mt-5 space-y-3">
      <input className={inp} placeholder="Your name" value={f.name} onChange={set('name')} required aria-label="Name" />
      <input className={inp} type="email" placeholder="Email" value={f.email} onChange={set('email')} required aria-label="Email" />
      <textarea className={inp} rows={5} placeholder="How can we help?" value={f.message} onChange={set('message')} required aria-label="Message" />
      {err && <p className="text-sm text-fail">{err}</p>}<Btn className="w-full">Send message</Btn></form>}</div></Shell>;
}

export function Join() {
  const { token } = useParams(), nav = useNavigate(), { me, loading, reload, switchWs } = useAuth(); const [err, setErr] = useState('');
  const join = async () => { try { const d = await api(`/invites/${token}/join`, { method: 'POST' }); await reload(); switchWs(d.workspace); nav('/app/library'); } catch (x) { setErr(x.message); } };
  if (loading) return null;
  return <Shell narrow><div className={`${card} p-7 mt-8`}><h1 className="font-display font-bold text-2xl">You have been invited to a workspace</h1>
    {me ? <Btn className="mt-5" onClick={join}>Join workspace</Btn> : <div className="mt-5 flex gap-2"><Link to="/signup" state={{ next: '/join/' + token }}><Btn>Create account</Btn></Link><Link to="/login" state={{ next: '/join/' + token }}><Btn v="ghost">Sign in</Btn></Link></div>}
    {err && <p className="text-sm text-fail mt-3">{err}</p>}</div></Shell>;
}
