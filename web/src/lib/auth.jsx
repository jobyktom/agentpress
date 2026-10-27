import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, llm: false, loading: Boolean(getToken()) });
  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then((r) => setState({ user: r.user, llm: r.llm, loading: false })).catch(() => setState({ user: null, loading: false }));
  }, []);
  const signIn = async (path, body) => {
    const r = await api(path, { method: 'POST', body });
    setToken(r.token);
    const me = await api('/auth/me');
    setState({ user: me.user, llm: me.llm, loading: false });
    return r.user;
  };
  const signOut = async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setToken(null); setState({ user: null, loading: false }); };
  return <AuthCtx.Provider value={{ ...state, signIn, signOut }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
