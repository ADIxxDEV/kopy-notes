import { useEffect, useState } from 'react';
import { FloatingWindow } from './FloatingWindow';
import { LIVE_COMMENTS_STORAGE_KEY, readSavedCommentConnection, resolveLiveCommentSource, type LiveCommentKind, type LiveCommentSource } from '@/lib/live-comments';
import './LiveComments.css';

function savedConnection() {
  try { return readSavedCommentConnection(localStorage.getItem(LIVE_COMMENTS_STORAGE_KEY)); }
  catch { return null; }
}
function isMobileYouTube() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

export function LiveComments({ onClose }: { onClose: () => void }) {
  const [saved] = useState(savedConnection);
  const [kind,setKind] = useState<LiveCommentKind>(saved?.kind ?? 'youtube');
  const [input,setInput] = useState(saved?.input ?? '');
  const [connection,setConnection] = useState<LiveCommentSource | null>(null);
  const [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [online,setOnline] = useState(navigator.onLine);
  const [reload,setReload] = useState(0), [height,setHeight] = useState(340);
  const mobileYouTube = connection?.kind === 'youtube' && isMobileYouTube();
  const unsupportedDomain = connection?.kind === 'youtube' && !['http:','https:'].includes(location.protocol);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online',update);window.addEventListener('offline',update);
    return () => {window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[]);
  function connect() {
    setError('');setNotice('');
    try {
      const source = resolveLiveCommentSource(input,kind,location.hostname,location.origin);
      setConnection(source);setReload(value => value+1);
    } catch (failure) {setError(failure instanceof Error ? failure.message : 'Could not connect to this comment source.');}
  }
  function save() {
    setError('');setNotice('');
    try {
      resolveLiveCommentSource(input,kind,location.hostname,location.origin);
      localStorage.setItem(LIVE_COMMENTS_STORAGE_KEY,JSON.stringify({kind,input:input.trim()}));
      setNotice('Connection saved on this device. Click Connect each time you open comments.');
    } catch (failure) {setError(failure instanceof Error ? failure.message : 'Could not save the connection on this device.');}
  }
  function forget() {
    try {localStorage.removeItem(LIVE_COMMENTS_STORAGE_KEY);setNotice('Saved connection removed.');setError('');}
    catch {setError('Could not remove the saved connection on this device.');}
  }
  return <FloatingWindow title="Live comments" initialX={Math.max(8,window.innerWidth-450)} initialY={80} width={420} onClose={onClose}>
    <div className="live-comments">
      <form onSubmit={event => {event.preventDefault();connect();}} className="live-comments-form">
        <label>Comment source<select className="kn-focus" value={kind} onChange={event=>{setKind(event.target.value as LiveCommentKind);setError('');}}><option value="youtube">YouTube live chat</option><option value="url">Comment page URL</option></select></label>
        <label>{kind==='youtube'?'Video ID or live stream URL':'HTTPS comment URL'}<input className="kn-focus" aria-label={kind==='youtube'?'YouTube video ID or live URL':'Comment page URL'} type="text" inputMode="url" autoComplete="off" spellCheck={false} maxLength={4096} placeholder={kind==='youtube'?'youtube.com/live/… or video ID':'https://example.com/comments'} value={input} onChange={event=>{setInput(event.target.value);setError('');}}/></label>
        <p className="live-comments-hint">Connect loads the chosen service. The board works offline; live comments require internet.</p>
        <div className="live-comments-actions"><button type="submit" className="kn-focus live-comments-primary" disabled={!input.trim()}>Connect</button><button type="button" className="kn-focus" onClick={save} disabled={!input.trim()}>Save connection</button><button type="button" className="kn-focus" onClick={forget}>Forget saved</button></div>
      </form>
      {error && <p role="alert" className="live-comments-error">{error}</p>}
      {notice && <p role="status" className="live-comments-hint">{notice}</p>}
      {!online && <p role="status" className="live-comments-hint">You are offline. Reconnect to the internet to view live comments.</p>}
      {connection && <section aria-label="Connected comments" className="live-comments-connected">
        <div className="live-comments-source"><strong>{connection.label}</strong><button type="button" className="kn-focus" onClick={()=>{setConnection(null);setError('');}}>Disconnect</button></div>
        <div className="live-comments-actions"><a className="kn-focus" href={connection.externalUrl} target="_blank" rel="noopener noreferrer">{connection.kind==='youtube'?'Open chat on YouTube ↗':'Open comment page ↗'}</a><button type="button" className="kn-focus" disabled={!online||mobileYouTube||unsupportedDomain} onClick={()=>{setError('');setReload(value=>value+1);}}>Reload comments</button></div>
        {mobileYouTube ? <p className="live-comments-hint">YouTube does not support embedded live chat on mobile web, including iPad. Use Open chat on YouTube to view the stream and its chat.</p> : unsupportedDomain ? <p className="live-comments-hint">YouTube chat embedding needs a website domain. Use Open chat on YouTube from this app.</p> : <>
          <label className="live-comments-height">Chat height<input aria-label="Comments panel height" type="range" min={220} max={600} step={20} value={height} onChange={event=>setHeight(Number(event.target.value))}/></label>
          {online && <iframe key={`${connection.url}:${reload}`} className="live-comments-frame" style={{height}} title="Live comment stream" src={connection.url} sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" referrerPolicy={connection.kind==='youtube'?'strict-origin-when-cross-origin':'no-referrer'} onError={()=>setError('The comment page could not load. Reload it or open it in a new tab.')}/>}
          <p className="live-comments-hint">A blank or blocked frame may mean the service prevents embedding. Open it in a new tab. YouTube chat must be enabled on an active live stream.</p>
        </>}
      </section>}
    </div>
  </FloatingWindow>;
}
