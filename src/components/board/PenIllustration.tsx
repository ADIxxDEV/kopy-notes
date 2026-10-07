/** Original Kopy artwork: no vendor graphics are included in the application. */
export function PenIllustration({kind,color='#39766b'}:{kind:string;color?:string}){
  const wood=kind==='pencil'||kind==='crayon',brush=kind==='paint',laser=kind==='laser';
  return <svg aria-hidden="true" viewBox="0 0 40 64" width="32" height="48" fill="none">
    <path d="M13 60V29h14v31" fill={laser?'#344457':color}/><path d="M14 29v31h3V29" fill="white" opacity=".3"/><path d="M24 29v31h3V29" fill="black" opacity=".2"/>
    <path d="M12 28h16v8H12z" fill={wood?color:'#c5ced1'}/><path d="M12 32h16" stroke="#76858c"/>
    {brush?<><path d="M12 28c-2-10 3-18 10-23-2 10 8 13 5 23z" fill="#c39a69"/><path d="M17 26c-1-7 2-12 5-16" stroke="#71563e" strokeWidth="1.5"/></>:laser?<><path d="M14 28V16h12v12" fill="#a6b7bf"/><path d="M17 16V10h6v6" fill="#ee5b68"/><path d="M20 2v4m-8 1 3 3m13-3-3 3" stroke="#ee5b68" strokeWidth="2" strokeLinecap="round"/></>:kind==='highlighter'?<path d="M12 28V14l16-5v19z" fill={color}/>:<><path d="m13 28 7-23 7 23z" fill={wood?'#e6c195':'#b3c4cb'}/><path d="m18 12 2-7 2 7" fill={wood?'#263a42':color}/>{kind==='crayon'&&<path d="M12 39h16v13H12z" fill="#fff0bf" opacity=".75"/>}</>}
    <path d="M13 60h14" stroke="currentColor" opacity=".4"/>
  </svg>;
}
