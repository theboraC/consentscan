import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { useAuth } from './auth.jsx';
import { inp, card } from './ui.jsx';

const COLS = [
  ['todo', 'To Do', 'border-t-pass'],
  ['progress', 'In Progress', 'border-t-crumb'],
  ['done', 'Completed', 'border-t-ink'],
];

function AddBox({ onAdd }) {
  const [open, setOpen] = useState(false), [title, setTitle] = useState('');
  if (!open) return <button onClick={() => setOpen(true)} className={`${card} w-full py-2.5 text-sm text-pass font-medium hover:border-ink cursor-pointer`}>Add a new task</button>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onAdd(title.trim()); setTitle(''); setOpen(false); } }} className="space-y-2">
      <input autoFocus className={inp} placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Task title" />
      <div className="flex gap-2">
        <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-ink text-white cursor-pointer">Add</button>
        <button type="button" onClick={() => { setOpen(false); setTitle(''); }} className="px-3 py-1.5 rounded-lg text-sm text-mute hover:text-ink cursor-pointer">Cancel</button>
      </div>
    </form>
  );
}

export default function Tasks() {
  const { ws } = useAuth(); const canEdit = ws?.role !== 'viewer';
  const [tasks, setTasks] = useState([]), [members, setMembers] = useState([]), [err, setErr] = useState(''), [drag, setDrag] = useState(null), [over, setOver] = useState('');

  const load = useCallback(async () => { try { setTasks(await api('/tasks')); } catch (e) { setErr(e.message); } }, []);
  useEffect(() => {
    load();
    api('/team').then((t) => setMembers(t.members)).catch(() => {});
    const id = setInterval(load, 8000); // so teammates see each other's changes
    return () => clearInterval(id);
  }, [load]);

  const update = async (id, patch) => {
    if (patch.status) setTasks((ts) => ts.map((t) => (t._id === id ? { ...t, status: patch.status } : t)));
    try { await api('/tasks/' + id, { method: 'PATCH', body: patch }); setErr(''); } catch (e) { setErr(e.message); }
    load();
  };
  const add = async (status, title) => {
    try { const t = await api('/tasks', { method: 'POST', body: { title, status } }); setTasks((ts) => [...ts, t]); setErr(''); } catch (e) { setErr(e.message); }
  };
  const remove = async (id) => {
    if (!confirm('Delete this task?')) return;
    setTasks((ts) => ts.filter((t) => t._id !== id));
    try { await api('/tasks/' + id, { method: 'DELETE' }); } catch (e) { setErr(e.message); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl">Tasks</h1>
        <p className="text-mute mt-1">Everyone in <b>{ws?.name}</b> sees this board. Invite a friend from the Team page.{!canEdit && ' You have view-only access.'}</p>
      </div>
      {err && <p className="text-sm text-fail" role="alert">{err}</p>}
      <div className="grid md:grid-cols-3 gap-4 items-start">
        {COLS.map(([key, label, accent]) => {
          const list = tasks.filter((t) => t.status === key);
          return (
            <section key={key} onDragOver={(e) => { if (canEdit) { e.preventDefault(); setOver(key); } }} onDragLeave={() => setOver('')}
              onDrop={() => { if (drag) update(drag, { status: key }); setDrag(null); setOver(''); }}
              className={`rounded-lg p-3 space-y-3 border border-line border-t-4 ${accent} ${over === key ? 'bg-white' : 'bg-paper'}`} aria-label={label}>
              <h2 className="font-display font-bold flex items-center gap-2">{label}<span className="text-xs font-medium text-mute bg-white border border-line rounded-full px-2 py-0.5">{list.length}</span></h2>
              {list.map((t) => (
                <article key={t._id} draggable={canEdit} onDragStart={() => setDrag(t._id)} onDragEnd={() => { setDrag(null); setOver(''); }}
                  className={`${card} p-3 ${canEdit ? 'cursor-grab' : ''}`}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1 accent-[#0e8a6a]" checked={t.status === 'done'} disabled={!canEdit} aria-label="Mark complete"
                      onChange={() => update(t._id, { status: t.status === 'done' ? 'todo' : 'done' })} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-mute">T-{t.number}</p>
                      <p className={`text-sm font-medium break-words ${t.status === 'done' ? 'line-through text-mute' : ''}`}>{t.title}</p>
                    </div>
                    {canEdit && <button onClick={() => remove(t._id)} aria-label="Delete task" className="text-mute hover:text-fail text-lg leading-none cursor-pointer">×</button>}
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <select className={`${inp} !w-auto !py-1 !text-xs`} value={t.assignee?._id || ''} disabled={!canEdit} aria-label="Assign to"
                      onChange={(e) => update(t._id, { assignee: e.target.value || null })}>
                      <option value="">Unassigned</option>
                      {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                    </select>
                    <select className={`${inp} !w-auto !py-1 !text-xs`} value={t.status} disabled={!canEdit} aria-label="Move to"
                      onChange={(e) => update(t._id, { status: e.target.value })}>
                      {COLS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </div>
                </article>
              ))}
              {canEdit && <AddBox onAdd={(title) => add(key, title)} />}
            </section>
          );
        })}
      </div>
    </div>
  );
}