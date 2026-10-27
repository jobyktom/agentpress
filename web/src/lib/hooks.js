import { useCallback, useEffect, useRef, useState } from 'react';
import { api, streamUrl } from './api';

export function useFetch(path, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true }));
    return api(path).then((data) => setState({ data, error: null, loading: false })).catch((error) => setState({ data: null, error, loading: false }));
  }, [path]); // eslint-disable-line
  useEffect(() => { load(); }, [load, ...deps]); // eslint-disable-line
  return { ...state, reload: load, setData: (fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })) };
}

export function useStream(path, handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!path) return;
    const es = new EventSource(streamUrl(path));
    for (const type of ['message', 'conversation', 'log', 'status', 'inbox', 'typing']) {
      es.addEventListener(type, (e) => ref.current[type]?.(JSON.parse(e.data)));
    }
    return () => es.close();
  }, [path]);
}
