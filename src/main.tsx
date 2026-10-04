import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import { AppProvider } from '@/lib/app-context';
import { ToastProvider } from '@/lib/toast';
import { useLocation } from '@/lib/navigation';
import Home from '@/app/page';
import Onboarding from '@/app/onboarding/page';
import Library from '@/app/library/page';
import Board from '@/app/board/[id]/page';
import '@/app/globals.css';
import '@/app/reference-ui.css';
if (import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js').catch(error => import.meta.env.DEV && console.warn('Offline cache could not initialize', error)); });
}
function App() {
  const location = useLocation();
  useEffect(() => { void navigator.storage?.persist?.(); }, []);
  const page = location.startsWith('/board/') ? <Board key={location.split('?')[0]}/> : location.startsWith('/library') ? <Library/> : location === '/onboarding' ? <Onboarding/> : <Home/>;
  return <AppProvider><ToastProvider>{page}</ToastProvider></AppProvider>;
}
createRoot(document.getElementById('root')!).render(<App/>);
