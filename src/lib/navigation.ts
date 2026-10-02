import { useMemo, useSyncExternalStore } from 'react';
const subscribe = (listener: () => void) => { window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); };
export function useLocation() { return useSyncExternalStore(subscribe, () => window.location.hash.slice(1) || '/', () => '/'); }
export function useRouter() { return useMemo(() => ({ push: (path: string) => { window.location.hash = path; }, replace: (path: string) => { window.location.replace('#' + path); } }), []); }
export function useSearchParams() { const path = useLocation(); return useMemo(() => new URLSearchParams(path.split('?')[1] || ''), [path]); }
export function useParams() { const path = useLocation(); return { id: path.split('?')[0].split('/')[2] }; }
