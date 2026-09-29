import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, store } from './api';

const Ctx = createContext();
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null), [loading, setLoading] = useState(true), [wsId, setWsId] = useState(store.ws);
  const load = useCallback(async () => {
    if (!store.token) { setMe(null); setLoading(false); return; }
    try {
      const d = await api('/me');
      const cur = d.workspaces.find((w) => w.id === store.ws) || d.workspaces[0];
      store.ws = cur?.id; setWsId(cur?.id); setMe(d);
    } catch { store.token = null; setMe(null); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const ws = me?.workspaces.find((w) => w.id === wsId);
  return (
    <Ctx.Provider value={{ me, ws, wsId, loading, reload: load, switchWs: (id) => { store.ws = id; setWsId(id); }, logout: () => { store.token = null; store.ws = null; setMe(null); } }}>
      {children}
    </Ctx.Provider>
  );
}
