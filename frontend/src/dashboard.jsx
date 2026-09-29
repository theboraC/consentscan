import { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './api';
import { useAuth } from './auth.jsx';
import { Btn, Pill, Ring, CookieTable, inp, card } from './ui.jsx';

export function Layout() {
  const { me, ws, wsId, loading, switchWs, logout } = useAuth(); const nav = useNavigate();
  if (loading) return null;
  if (!me) return <Navigate to="/login" />;
  const tab = ({ isActive }) => `px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-ink text-white' : 'text-mute hover:text-ink'}`;
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-line">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-4 flex-wrap">
          <Link to="/app" className="font-display font-bold text-xl mr-4">ConsentScan</Link>
          <nav className="flex gap-1"><NavLink end to="/app" className={tab}>Scan</NavLink><NavLink to="/app/library" className={tab}>Library</NavLink><NavLink to="/app/team" className={tab}>Team</NavLink></nav>
          <div className="ml-auto flex items-center gap-2">
            <select className={`${inp} !w-auto`} value={wsId || ''} onChange={(e) => switchWs(e.target.value)} aria-label="Workspace">
              {me.workspaces.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.role})</option>)}
            </select>
            <Btn v="ghost" onClick={() => { logout(); nav('/'); }}>Sign out</Btn>
          </div>
        </div>
      </header>
      {!me.user.verified && <p className="bg-crumb/10 text-crumb text-sm text-center py-2">Check your inbox to verify your email address.</p>}
      <main className="max-w-6xl mx-auto px-5 py-8"><Outlet key={wsId} /></main>
    </div>
  );
}

export function Result({ r, footer }) {
  const [stage, setStage] = useState('pre');
  const stages = [['pre', 'Before consent'], ['accept', 'After accept'], ['reject', 'After reject']];
  return (
    <div className="space-y-5">
      <div className={`${card} p-6 flex items-center gap-6 flex-wrap`}>
        <Ring score={r.score} />
        <div className="min-w-0"><p className="text-sm text-mute">Compliance score</p><h2 className="font-display font-bold text-2xl break-all">{r.url}</h2>
          <p className="text-sm text-mute mt-1">{r.checks.filter((c) => c.status === 'pass').length} of {r.checks.length} checks passed. Scanned {new Date(r.scannedAt || r.createdAt).toLocaleString()}.</p></div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {r.checks.map((c) => (
          <motion.div key={c.id} layout className={`${card} p-4 flex gap-3 justify-between`}>
            <div><p className="font-medium">{c.title}</p><p className="text-sm text-mute mt-0.5 break-words">{c.detail}</p></div><Pill s={c.status} />
          </motion.div>))}
      </div>
      <div className={card}>
        <div className="flex gap-1 p-2 border-b border-line flex-wrap" role="tablist">
          {stages.map(([k, l]) => <button key={k} role="tab" aria-selected={stage === k} onClick={() => setStage(k)} className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${stage === k ? 'bg-ink text-white' : 'text-mute hover:text-ink'}`}>{l} <span className="opacity-70">({r.cookies?.[k]?.length ?? '–'})</span></button>)}
        </div>
        <CookieTable list={r.cookies?.[stage]} />
      </div>
      {r.trackers?.length > 0 && <p className="text-sm text-mute">Tracker hosts contacted before consent: {r.trackers.join(', ')}</p>}
      {r.screenshot && <div className={`${card} p-3`}><p className="text-sm text-mute mb-2">Captured banner</p><img src={r.screenshot} alt="Screenshot of the cookie banner" className="rounded border border-line max-h-96 mx-auto" /></div>}
      {footer}
    </div>
  );
}

const steps = ['Opening a clean browser', 'Loading the page before any consent', 'Finding the banner and buttons', 'Clicking Accept and Reject in fresh sessions', 'Checking policy links'];

export function ScanPage() {
  const { ws } = useAuth(); const canEdit = ws?.role !== 'viewer';
  const [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [step, setStep] = useState(0), [res, setRes] = useState(null), [err, setErr] = useState(''), [saved, setSaved] = useState(false);
  const [locs, setLocs] = useState([]), [loc, setLoc] = useState(''), [newLoc, setNewLoc] = useState('');
  useEffect(() => { api('/locations').then((l) => { setLocs(l); setLoc(l[0]?._id || 'new'); }).catch(() => {}); }, []);
  useEffect(() => { if (!busy) return; setStep(0); const t = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 6000); return () => clearInterval(t); }, [busy]);
  const run = async (e) => { e.preventDefault(); setBusy(true); setErr(''); setRes(null); setSaved(false); try { setRes(await api('/scan', { method: 'POST', body: { url } })); } catch (x) { setErr(x.message); } setBusy(false); };
  const save = async () => {
    try {
      let id = loc;
      if (loc === 'new') { const l = await api('/locations', { method: 'POST', body: { name: newLoc || 'General' } }); id = l._id; setLocs([...locs, l]); setLoc(id); }
      await api('/scans', { method: 'POST', body: { result: res, locationId: id } }); setSaved(true);
    } catch (x) { setErr(x.message); }
  };
  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-3xl">Scan a website</h1><p className="text-mute mt-1">A scan takes 20 to 60 seconds. We test it in a clean browser session.</p></div>
      <form onSubmit={run} className="flex gap-2 max-w-2xl"><input className={inp} placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} required aria-label="Website URL" /><Btn disabled={busy}>{busy ? 'Scanning…' : 'Scan website'}</Btn></form>
      {err && <p className="text-fail text-sm" role="alert">{err}</p>}
      <AnimatePresence>{busy && (
        <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${card} p-5 max-w-2xl space-y-2 text-sm`}>
          {steps.map((s, i) => <li key={s} className={i <= step ? 'text-ink' : 'text-mute/50'}>{i < step ? '✓ ' : i === step ? '● ' : '○ '}{s}</li>)}
        </motion.ul>)}</AnimatePresence>
      {res && <Result r={res} footer={canEdit && (
        <div className={`${card} p-5 flex flex-wrap gap-3 items-center`}>
          <span className="font-medium">Save this scan to</span>
          <select className={`${inp} !w-auto`} value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Location">{locs.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}<option value="new">New location…</option></select>
          {loc === 'new' && <input className={`${inp} !w-48`} placeholder="Location name" value={newLoc} onChange={(e) => setNewLoc(e.target.value)} aria-label="New location name" />}
          <Btn onClick={save} disabled={saved}>{saved ? 'Saved' : 'Save scan'}</Btn>
        </div>)} />}
    </div>
  );
}

export function Library() {
  const { ws } = useAuth(); const canEdit = ws?.role !== 'viewer';
  const [locs, setLocs] = useState([]), [scans, setScans] = useState([]), [sel, setSel] = useState(''), [q, setQ] = useState(''), [view, setView] = useState(null), [name, setName] = useState('');
  const load = useCallback(async () => { setLocs(await api('/locations')); setScans(await api(`/scans?location=${sel}&q=${encodeURIComponent(q)}`)); }, [sel, q]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const open = async (id) => setView(await api('/scans/' + id));
  const download = async () => {
    const b = await api('/export?location=' + sel, { blob: true });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'consentscan-export.xlsx'; a.click();
  };
  const add = async (e) => { e.preventDefault(); if (!name.trim()) return; await api('/locations', { method: 'POST', body: { name } }); setName(''); load(); };
  const cur = locs.find((l) => l._id === sel);
  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-6">
      <aside className="space-y-3">
        <h2 className="font-display font-bold text-xl">Locations</h2>
        <button onClick={() => setSel('')} className={`w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer ${!sel ? 'bg-ink text-white' : 'hover:bg-white'}`}>All scans</button>
        {locs.map((l) => <button key={l._id} onClick={() => setSel(l._id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between cursor-pointer ${sel === l._id ? 'bg-ink text-white' : 'hover:bg-white'}`}><span className="truncate">{l.name}</span><span className="opacity-60">{l.count}</span></button>)}
        {canEdit && <form onSubmit={add} className="flex gap-2"><input className={inp} placeholder="New location" value={name} onChange={(e) => setName(e.target.value)} aria-label="New location name" /><Btn v="ghost">Add</Btn></form>}
      </aside>
      <section className="space-y-4 min-w-0">
        <div className="flex flex-wrap gap-2 items-center">
          <h1 className="font-display font-bold text-3xl mr-auto">{cur?.name || 'All scans'}</h1>
          <input className={`${inp} !w-56`} placeholder="Search websites" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <Btn onClick={download}>Download Excel</Btn>
          {cur && canEdit && <>
            <Btn v="ghost" onClick={async () => { const n = prompt('Rename location', cur.name); if (n) { await api('/locations/' + cur._id, { method: 'PATCH', body: { name: n } }); load(); } }}>Rename</Btn>
            <Btn v="danger" onClick={async () => { if (confirm(`Delete "${cur.name}" and its ${cur.count} scan(s)?`)) { await api('/locations/' + cur._id, { method: 'DELETE' }); setSel(''); } }}>Delete</Btn></>}
        </div>
        {!scans.length ? <div className={`${card} p-10 text-center text-mute`}>No saved scans here yet. Run a scan and choose Save scan.</div> :
          <div className={`${card} divide-y divide-line`}>{scans.map((s) => (
            <div key={s._id} className="p-4 flex items-center gap-4 flex-wrap">
              <span className={`font-display font-bold text-2xl w-12 ${s.score >= 80 ? 'text-pass' : s.score >= 50 ? 'text-crumb' : 'text-fail'}`}>{s.score}</span>
              <div className="min-w-0 flex-1"><p className="font-medium truncate">{s.url}</p><p className="text-sm text-mute">{s.location?.name} · saved by {s.savedBy?.name} on {new Date(s.createdAt).toLocaleDateString()}</p></div>
              <Btn v="ghost" onClick={() => open(s._id)}>View</Btn>
              {canEdit && <Btn v="danger" onClick={async () => { if (confirm('Delete this scan?')) { await api('/scans/' + s._id, { method: 'DELETE' }); load(); } }}>Delete</Btn>}
            </div>))}</div>}
      </section>
      <AnimatePresence>{view && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-ink/40 z-50 overflow-y-auto p-4" onClick={() => setView(null)}>
          <div className="max-w-4xl mx-auto bg-paper rounded-lg p-5 my-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-3"><Btn v="ghost" onClick={() => setView(null)}>Close</Btn></div><Result r={view} /></div>
        </motion.div>)}</AnimatePresence>
    </div>
  );
}

export function Team() {
  const { ws, me, reload, switchWs } = useAuth(); const owner = ws?.role === 'owner';
  const [t, setT] = useState({ members: [], invites: [] }), [role, setRole] = useState('editor'), [link, setLink] = useState(''), [wname, setWname] = useState('');
  const load = useCallback(() => api('/team').then(setT), []);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const copy = (l) => navigator.clipboard?.writeText(l);
  return (
    <div className="space-y-8 max-w-3xl">
      <div><h1 className="font-display font-bold text-3xl">Team</h1><p className="text-mute mt-1">Everyone in <b>{ws?.name}</b> sees the same locations and saved scans.</p></div>
      <div className={`${card} divide-y divide-line`}>{t.members.map((m) => (
        <div key={m.id} className="p-4 flex items-center gap-3"><div className="flex-1"><p className="font-medium">{m.name}</p><p className="text-sm text-mute">{m.email}</p></div>
          <span className="text-sm text-mute capitalize">{m.role}</span>
          {owner && m.role !== 'owner' && <Btn v="danger" onClick={async () => { await api('/team/members/' + m.id, { method: 'DELETE' }); load(); }}>Remove</Btn>}</div>))}</div>
      {owner && <div className="space-y-3"><h2 className="font-display font-bold text-xl">Invite someone</h2>
        <div className="flex gap-2 flex-wrap"><select className={`${inp} !w-auto`} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role"><option value="editor">Editor: can scan and save</option><option value="viewer">Viewer: read only</option></select>
          <Btn onClick={async () => { const d = await api('/team/invites', { method: 'POST', body: { role } }); setLink(d.link); copy(d.link); load(); }}>Create invite link</Btn></div>
        {link && <p className="text-sm bg-white border border-line rounded-lg p-3 break-all">Link copied: {link}</p>}
        {t.invites.map((i) => <div key={i.id} className="text-sm flex gap-3 items-center"><span className="capitalize w-14">{i.role}</span><span className="truncate flex-1 text-mute">{i.link}</span><Btn v="ghost" onClick={() => copy(i.link)}>Copy</Btn><Btn v="danger" onClick={async () => { await api('/team/invites/' + i.id, { method: 'DELETE' }); load(); }}>Revoke</Btn></div>)}
        <p className="text-sm text-mute">Links expire after 7 days.</p></div>}
      <div className="space-y-2"><h2 className="font-display font-bold text-xl">New workspace</h2>
        <form className="flex gap-2 max-w-md" onSubmit={async (e) => { e.preventDefault(); const d = await api('/workspaces', { method: 'POST', body: { name: wname } }); await reload(); switchWs(d.id); setWname(''); }}>
          <input className={inp} placeholder="e.g. Agency clients" value={wname} onChange={(e) => setWname(e.target.value)} required aria-label="Workspace name" /><Btn v="ghost">Create</Btn></form></div>
    </div>
  );
}
