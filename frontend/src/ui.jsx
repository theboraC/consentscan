import { motion } from 'framer-motion';

export const inp = 'w-full bg-white border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-ink placeholder:text-mute/60';
export const card = 'bg-white border border-line rounded-lg';

export const Btn = ({ v = 'primary', className = '', ...p }) => (
  <button {...p} className={`px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50 cursor-pointer ${v === 'primary' ? 'bg-ink text-white hover:bg-ink/85' : v === 'danger' ? 'text-fail border border-fail/30 hover:bg-fail/5' : 'bg-white border border-line hover:border-ink'} ${className}`} />
);

const tone = { pass: 'text-pass bg-pass/10', fail: 'text-fail bg-fail/10', warn: 'text-crumb bg-crumb/10' };
const label = { pass: 'Pass', fail: 'Fail', warn: 'Review' };
export const Pill = ({ s }) => <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tone[s]}`}>{label[s]}</span>;

export function Ring({ score, size = 144 }) {
  const r = 52, c = 2 * Math.PI * r, col = score >= 80 ? '#0e8a6a' : score >= 50 ? '#c77b1f' : '#c23a4d';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} stroke="#e6eaef" strokeWidth="9" fill="none" />
        <motion.circle cx="60" cy="60" r={r} stroke={col} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }} transition={{ duration: 1.1, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-display text-4xl font-bold">{score}</div>
    </div>
  );
}

const catTone = { 'Strictly necessary': 'bg-ink/5 text-ink', Functional: 'bg-ink/5 text-ink', Analytics: 'bg-crumb/15 text-crumb', Marketing: 'bg-fail/10 text-fail', Unknown: 'bg-line text-mute' };
export function CookieTable({ list }) {
  if (!list) return <p className="text-sm text-mute p-4">This step could not be tested because the banner has no matching button.</p>;
  if (!list.length) return <p className="text-sm text-mute p-4">No cookies were set at this stage.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-mute border-b border-line">{['Cookie', 'Domain', 'Category', 'Party', 'Expires'].map((h) => <th key={h} className="font-medium py-2 px-3">{h}</th>)}</tr></thead>
        <tbody>{list.map((c, i) => (
          <tr key={i} className="border-b border-line/60 last:border-0">
            <td className="py-2 px-3 font-medium break-all">{c.name}</td><td className="px-3 text-mute">{c.domain}</td>
            <td className="px-3"><span className={`text-xs px-2 py-0.5 rounded-full ${catTone[c.category]}`}>{c.category}</span></td>
            <td className="px-3 text-mute">{c.party}</td><td className="px-3 text-mute whitespace-nowrap">{c.expires}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}
