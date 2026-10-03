export type BoardPreset = {id:string;name:string;background:string;pattern:string;ink:string};
export const BOARD_PRESETS:BoardPreset[]=[
  {id:'chalk',name:'Classic chalkboard',background:'#163d30',pattern:'none',ink:'#f8f4df'},
  {id:'paper',name:'Paper notebook',background:'#fffdf5',pattern:'lines',ink:'#253649'},
  {id:'math',name:'Mathematics grid',background:'#e9f1f7',pattern:'grid',ink:'#133a5b'},
  {id:'dark',name:'Night board',background:'#18212b',pattern:'dots',ink:'#f4f4f5'},
  {id:'green',name:'Bright green board',background:'#83d131',pattern:'none',ink:'#10151b'},
  {id:'white',name:'Whiteboard',background:'#ffffff',pattern:'none',ink:'#142b39'},
];
export function validateBoardPresets(value:unknown):BoardPreset[]{
  if(!Array.isArray(value))return [];
  const ids=new Set<string>();
  return value.filter((p):p is BoardPreset=>{
    if(!p||typeof p!=='object'||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>48||!['none','grid','dots','lines'].includes(p.pattern)||![p.background,p.ink].every(c=>typeof c==='string'&&/^#[a-f0-9]{6}$/i.test(c)))return false;
    ids.add(p.id);return true;
  }).slice(0,12).map(p=>({id:p.id,name:p.name.trim(),background:p.background,pattern:p.pattern,ink:p.ink}));
}
