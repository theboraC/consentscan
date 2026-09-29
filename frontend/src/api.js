const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const ls = (k) => ({ get: () => localStorage.getItem(k), set: (v) => (v ? localStorage.setItem(k, v) : localStorage.removeItem(k)) });
const T = ls('cs_token'), W = ls('cs_ws');
export const store = { get token() { return T.get(); }, set token(v) { T.set(v); }, get ws() { return W.get(); }, set ws(v) { W.set(v); } };

export async function api(path, { method = 'GET', body, blob } = {}) {
  const r = await fetch(BASE + '/api' + path, {
    method, body: body && JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(store.token && { Authorization: 'Bearer ' + store.token }), ...(store.ws && { 'x-workspace': store.ws }) },
  });
  if (blob && r.ok) return r.blob();
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
