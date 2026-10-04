import {useEffect,useState} from 'react';

export function BoardFullscreen(){
  const [focus,setFocus]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{
    document.documentElement.classList.toggle('kn-focus-view',focus);
    return()=>document.documentElement.classList.remove('kn-focus-view');
  },[focus]);
  useEffect(()=>{
    const changed=()=>{if(!document.fullscreenElement)setFocus(false);};
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setFocus(false);};
    document.addEventListener('fullscreenchange',changed);document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('fullscreenchange',changed);document.removeEventListener('keydown',key);};
  },[]);
  async function toggle(){
    setMessage('');
    if(focus){setFocus(false);if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});screen.orientation?.unlock?.();return;}
    setFocus(true);
    try{if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else setMessage('Focus view enabled. For more space on iPad, add Kopy Notes to your Home Screen.');}
    catch{setMessage('Focus view enabled. This browser could not enter fullscreen.');}
  }
  async function landscape(){
    const orientation=screen.orientation as ScreenOrientation&{lock?:(value:string)=>Promise<void>};
    try{if(!orientation?.lock)throw new Error();await orientation.lock('landscape');setMessage('');}
    catch{setMessage('Rotate your tablet to landscape. Turn off rotation lock if needed.');}
  }
  return <div className="kn-fullscreen-controls"><button type="button" aria-label={focus?'Exit fullscreen':'Enter fullscreen'} title={focus?'Exit fullscreen':'Enter fullscreen'} onClick={()=>void toggle()}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={focus?'M3 9h6V3m6 0v6h6M3 15h6v6m6 0v-6h6':'M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6'}/></svg></button>{focus&&<button type="button" aria-label="Landscape orientation" title="Landscape orientation" onClick={()=>void landscape()}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M17 10v4"/></svg></button>}{message&&<button className="kn-screen-hint" onClick={()=>setMessage('')} aria-label={`${message} Dismiss`}>{message}</button>}</div>;
}
