import {validateBoardPresets,BOARD_PRESETS,type BoardPreset} from './board-presets';
export const THEME_SCHEMA='org.kopynotes.theme';
export const THEME_ICON_IDS=['pen','pencil','paint','chinese','crayon','stamp','highlighter','laser','eraser','select','hand','shapes','tools','menu','import','save','export','board','layers','plus','chevronLeft','chevronRight','undo','redo','text','flipHorizontal','penPreview','pencilPreview','paintPreview','chinesePreview','crayonPreview','stampPreview','highlighterPreview','laserPreview'] as const;
export type ThemeIconId=typeof THEME_ICON_IDS[number];
export type ThemePack={schema:typeof THEME_SCHEMA;version:1;id:string;name:string;appearance?:'org-note3';attribution?:string;colors:{panel:string;surface:string;ink:string;muted:string;line:string;accent:string};autoContrast:boolean;icons:Partial<Record<ThemeIconId,string>>;boards:BoardPreset[]};
export const BUILTIN_THEMES:ThemePack[]=[
  {schema:THEME_SCHEMA,version:1,id:'kopy-classic',name:'Kopy Classic',colors:{panel:'#f5f3ed',surface:'#e6e4dc',ink:'#253137',muted:'#58676e',line:'#a8b0ae',accent:'#39766b'},autoContrast:true,icons:{},boards:BOARD_PRESETS},
  {schema:THEME_SCHEMA,version:1,id:'kopy-ocean',name:'Ocean',colors:{panel:'#edf6fa',surface:'#d8eaf1',ink:'#123c50',muted:'#4c6b79',line:'#9fbdca',accent:'#267e9a'},autoContrast:true,icons:{},boards:BOARD_PRESETS},
  {schema:THEME_SCHEMA,version:1,id:'kopy-night',name:'Midnight',colors:{panel:'#202b36',surface:'#2b3947',ink:'#f2f5f7',muted:'#b5c4d1',line:'#536573',accent:'#738fb4'},autoContrast:true,icons:{},boards:BOARD_PRESETS},
  {schema:THEME_SCHEMA,version:1,id:'org-note3',name:'org-note3',appearance:'org-note3',colors:{panel:'#f5f5f3',surface:'#dededc',ink:'#25272a',muted:'#56595b',line:'#b6b9bb',accent:'#407db2'},autoContrast:false,icons:{},boards:[{id:'note-green',name:'Note green',background:'#95c459',pattern:'none',ink:'#111111'},...BOARD_PRESETS]},
];
export function isRasterData(value:unknown):value is string{return typeof value==='string'&&value.length<=750000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);}
export function parseThemePack(value:unknown):ThemePack{
  if(!value||typeof value!=='object')throw new Error('Choose a Kopy theme pack.');
  const v=value as Record<string,unknown>,colors=v.colors as ThemePack['colors'];
  if(v.schema!==THEME_SCHEMA||v.version!==1)throw new Error('Unsupported theme format or version.');
  if(typeof v.id!=='string'||!/^[a-z0-9_-]{1,80}$/i.test(v.id)||typeof v.name!=='string'||!v.name.trim()||v.name.length>48)throw new Error('A theme needs a valid ID and name.');
  if(!colors||!['panel','surface','ink','muted','line','accent'].every(key=>/^#[a-f\d]{6}$/i.test(String(colors[key as keyof typeof colors]))))throw new Error('Theme colors must be six-digit hex colors.');
  const icons:ThemePack['icons']={};
  if(v.icons&&typeof v.icons==='object')for(const id of THEME_ICON_IDS){const icon=(v.icons as Record<string,unknown>)[id];if(icon!==undefined){if(!isRasterData(icon))throw new Error('Icons must be embedded PNG, JPEG or WebP images under 550 KB.');icons[id]=icon;}}
  if(v.appearance!==undefined&&v.appearance!=='org-note3')throw new Error('Unsupported theme appearance.');
  if(v.attribution!==undefined&&(typeof v.attribution!=='string'||v.attribution.length>1000))throw new Error('Invalid theme attribution.');
  const boards=validateBoardPresets(v.boards);
  if(!Array.isArray(v.boards)||boards.length!==v.boards.length)throw new Error('The theme contains an invalid board preset.');
  const result:ThemePack={schema:THEME_SCHEMA,version:1,id:v.id,name:v.name.trim(),colors:{panel:colors.panel,surface:colors.surface,ink:colors.ink,muted:colors.muted,line:colors.line,accent:colors.accent},autoContrast:v.autoContrast!==false,icons,boards};
  if(v.appearance==='org-note3')result.appearance='org-note3';
  if(typeof v.attribution==='string')result.attribution=v.attribution;
  if(JSON.stringify(result).length>6*1024*1024)throw new Error('Theme packs must be under 6 MB.');return result;
}
export function controlContrast(background:string){const rgb=background.match(/[a-f\d]{2}/gi)?.map(c=>parseInt(c,16))??[0,0,0];return rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>145?{panel:'#253137',ink:'#f5f7f4',line:'#697a80'}:{panel:'#f5f3ed',ink:'#253137',line:'#a8b0ae'};}
/** Keep lossless artwork when it fits; otherwise compress, then reduce dimensions. */
export function fitThemeRaster(canvas:Pick<HTMLCanvasElement,'width'|'height'|'toDataURL'>,draw:(width:number,height:number)=>void,width:number,height:number):string{
  for(let attempt=0;attempt<16;attempt++){
    canvas.width=Math.max(1,Math.round(width));canvas.height=Math.max(1,Math.round(height));
    draw(canvas.width,canvas.height);
    const png=canvas.toDataURL('image/png');if(isRasterData(png))return png;
    for(const quality of [.9,.78,.62,.45]){const result=canvas.toDataURL('image/webp',quality);if(isRasterData(result))return result;}
    if(canvas.width===1&&canvas.height===1)break;
    width*=.72;height*=.72;
  }
  throw new Error('This image could not be prepared. Try another PNG, JPEG or WebP.');
}
export async function themeImage(file:File,maxWidth=1280,maxHeight=720):Promise<string>{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPEG or WebP image.');
  if(file.size>64*1024*1024)throw new Error('Choose an image under 64 MB. Larger images may exceed this device memory.');
  const image=new Image(),url=URL.createObjectURL(file);
  try{await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('The image could not be read.'));image.src=url;});
    if(!image.naturalWidth||!image.naturalHeight)throw new Error('The image has invalid dimensions.');
    const scale=Math.min(1,maxWidth/image.naturalWidth,maxHeight/image.naturalHeight),canvas=document.createElement('canvas');
    return fitThemeRaster(canvas,(width,height)=>{const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image processing is unavailable.');ctx.drawImage(image,0,0,width,height);},image.naturalWidth*scale,image.naturalHeight*scale);
  }finally{image.src='';URL.revokeObjectURL(url);}
}

export function controlPalette(theme:ThemePack,background:string){
 const panel=theme.colors.panel.match(/[a-f\d]{2}/gi)?.map(v=>parseInt(v,16))??[0,0,0];
 if(theme.autoContrast&&panel[0]*.299+panel[1]*.587+panel[2]*.114>=128)return controlContrast(background);
 return{panel:theme.colors.panel,ink:theme.colors.ink,line:theme.colors.line};
}
