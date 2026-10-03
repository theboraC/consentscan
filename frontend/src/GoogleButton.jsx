import { useEffect, useRef } from 'react';
import { api, store } from './api';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleButton({ onDone, onError }) {
  const box = useRef(null);
  useEffect(() => {
    if (!CLIENT_ID) return;
    const init = () => {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (resp) => {
          try {
            const d = await api('/auth/google', { method: 'POST', body: { credential: resp.credential } });
            store.token = d.token;
            await onDone();
          } catch (e) { onError(e.message); }
        },
      });
      window.google.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', text: 'continue_with', width: 320 });
    };
    if (window.google?.accounts?.id) { init(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = init;
    document.body.appendChild(s);
  }, []);
  if (!CLIENT_ID) return null;
  return <div ref={box} className="flex justify-center" />;
}