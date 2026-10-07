export type BoardPreset = {id:string;name:string;background:string;pattern:string;ink:string;image?:string};
export const BOARD_PRESETS:BoardPreset[]=[
  {id:'chalk',name:'Classic chalkboard',background:'#163d30',pattern:'none',ink:'#f8f4df'},
  {id:'paper',name:'Paper notebook',background:'#fffdf5',pattern:'lines',ink:'#253649'},
  {id:'math',name:'Mathematics grid',background:'#e9f1f7',pattern:'grid',ink:'#133a5b'},
  {id:'dark',name:'Night board',background:'#18212b',pattern:'dots',ink:'#f4f4f5'},
  {id:'green',name:'Bright green board',background:'#83d131',pattern:'none',ink:'#10151b'},
  {id:'white',name:'Whiteboard',background:'#ffffff',pattern:'none',ink:'#142b39'},
  {id:'blueprint',name:'Blueprint',background:'#193e61',pattern:'grid',ink:'#f0f6ff'},
  {id:'cream',name:'Warm ruled paper',background:'#faf1da',pattern:'lines',ink:'#394345'},
  {id:'staff',name:'Music staff',background:'#fffdf5',pattern:'staff',ink:'#23343b'},
  {id:'writing',name:'Handwriting guide',background:'#fffaf0',pattern:'handwriting',ink:'#243743'},
  {id:'isometric',name:'Isometric paper',background:'#f0f5ee',pattern:'isometric',ink:'#273c34'},
];
export function validateBoardPresets(value:unknown):BoardPreset[]{
  if(!Array.isArray(value))return [];
  const ids=new Set<string>();
  return value.filter((p):p is BoardPreset=>{
    if(!p||typeof p!=='object'||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>48||!['none','grid','dots','lines','staff','handwriting','isometric'].includes(p.pattern)||![p.background,p.ink].every(c=>typeof c==='string'&&/^#[a-f0-9]{6}$/i.test(c))||(p.image!==undefined&&(typeof p.image!=='string'||p.image.length>750000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(p.image))))return false;
    ids.add(p.id);return true;
  }).slice(0,24).map(p=>({id:p.id,name:p.name.trim(),background:p.background,pattern:p.pattern,ink:p.ink,...(p.image?{image:p.image}:{})}));
}
