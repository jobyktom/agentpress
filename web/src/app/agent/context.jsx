import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';

const Ctx = createContext(null);

// Holds the agent's working copy. Edits apply locally right away and are
// autosaved after a short pause; Publish snapshots the saved working copy.
export function AgentProvider({ aid, children }) {
  const [agent, setAgent] = useState(null);
  const [saving, setSaving] = useState('saved');
  const [error, setError] = useState(null);
  const timer = useRef(null);
  const pending = useRef(null);

  useEffect(() => {
    setAgent(null);
    api(`/agents/${aid}`).then(setAgent).catch(setError);
  }, [aid]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const body = pending.current;
    if (!body) return;
    pending.current = null;
    setSaving('saving');
    try {
      const a = await api(`/agents/${aid}`, { method: 'PATCH', body });
      setAgent((cur) => ({ ...cur, hasUnpublishedChanges: a.hasUnpublishedChanges, updatedAt: a.updatedAt }));
      setSaving(pending.current ? 'pending' : 'saved');
    } catch (e) { setSaving('error'); setError(e); }
  }, [aid]);

  const patch = useCallback((changes) => {
    setAgent((cur) => {
      const next = { ...cur, ...changes };
      pending.current = { name: next.name, description: next.description, color: next.color, config: next.config };
      return next;
    });
    setSaving('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }, [flush]);

  const updateConfig = useCallback((fn) => {
    setAgent((cur) => {
      const config = typeof fn === 'function' ? fn(structuredClone(cur.config)) : fn;
      pending.current = { name: cur.name, description: cur.description, color: cur.color, config };
      return { ...cur, config, hasUnpublishedChanges: true };
    });
    setSaving('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }, [flush]);

  const publish = async (note) => {
    await flush();
    const a = await api(`/agents/${aid}/publish`, { method: 'POST', body: { note } });
    setAgent((cur) => ({ ...cur, ...a }));
    return a;
  };

  const replace = (a) => setAgent((cur) => ({ ...cur, ...a }));

  useEffect(() => () => { flush(); }, [flush]);
  useEffect(() => {
    const h = (e) => { if (pending.current) { flush(); e.preventDefault(); } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [flush]);

  const canEdit = agent && agent.role !== 'viewer';
  return <Ctx.Provider value={{ agent, config: agent?.config, saving, error, patch, updateConfig, publish, flush, replace, canEdit }}>{children}</Ctx.Provider>;
}

export const useAgent = () => useContext(Ctx);
