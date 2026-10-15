import {initializeAndroidDisplay} from '@/lib/display-annotation';
import {initializeDeviceLibrary} from '@/lib/device-library';
import {SmartKeyboard} from '@/components/SmartKeyboard';
import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useEffect } from 'react';
import { AppProvider } from '@/lib/app-context';
import { ToastProvider } from '@/lib/toast';
import { useLocation } from '@/lib/navigation';
import Home from '@/app/page';
const Onboarding=lazy(()=>import('@/app/onboarding/page'));
const Library=lazy(()=>import('@/app/library/page'));
const Board=lazy(()=>import('@/app/board/[id]/page'));
import '@/app/globals.css';
import '@/app/reference-ui.css';
import '@/app/org-note3.css';
if (import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js').catch(error => import.meta.env.DEV && console.warn('Offline cache could not initialize', error)); });
}
function App() {
  useEffect(()=>{document.documentElement.classList.add("app-ready");},[]);
  const location = useLocation();
  useEffect(() => { void navigator.storage?.persist?.(); }, []);
  const page = location.startsWith('/board/') ? <Board key={location.split('?')[0]}/> : location.startsWith('/library') ? <Library/> : location === '/onboarding' ? <Onboarding/> : <Home/>;
  return <AppProvider><ToastProvider><Suspense fallback={<div role="status" className="grid h-dvh place-items-center bg-base text-ink">Opening your board...</div>}>{page}</Suspense><SmartKeyboard/></ToastProvider></AppProvider>;
}
void Promise.allSettled([initializeDeviceLibrary(),initializeAndroidDisplay()]).then(()=>createRoot(document.getElementById('root')!).render(<App/>));
