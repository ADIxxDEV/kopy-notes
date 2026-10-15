import type {TextObject} from '../db/schema';
const direct=(node:Element|undefined,name:string)=>node?Array.from(node.children).find(e=>e.localName===name):undefined;
const value=(node:Element|undefined,name:string)=>node?.getAttribute(name)??'';
const number=(v:string,fallback:number)=>v!==''&&Number.isFinite(Number(v))?Number(v):fallback;
type Box={x:number;y:number;w:number;h:number;rotation:number};
type Style={fontSize:number;fontFamily:string;bold:boolean;italic?:boolean;color:string};
/** Convert Office text into measured, editable runs instead of a fixed vertical offset. */
export function pptText(node:Element,box:Box,inherited?:Element,masterStyle?:Element):TextObject[]{
 const body=direct(node,'txBody');if(!body)return [];
 const inheritedBody=direct(inherited,'txBody'),bodyPr=direct(body,'bodyPr')??direct(inheritedBody,'bodyPr');
 const inset=(key:string,fallback:number)=>number(value(bodyPr,key),fallback*9525)/9525;
 const left=inset('lIns',9.6),right=inset('rIns',9.6),top=inset('tIns',4.8),bottom=inset('bIns',4.8);
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw new Error('Could not lay out slide text.');
 const defaultStyle:Style={fontSize:24*96/72,fontFamily:'Arial',bold:false,color:'#203344'};
 const style=(element:Element|undefined,base:Style):Style=>{
  const latin=direct(element,'latin'),fill=direct(element,'solidFill'),rgb=direct(fill,'srgbClr');
  const color=value(rgb,'val');const face=value(latin,'typeface');
  return {fontSize:Math.max(1,number(value(element,'sz'),base.fontSize*75)/75),fontFamily:/^Arimo(?:\s|$)/i.test(face)?'Arial':face&&!face.startsWith('+')?face:base.fontFamily,bold:value(element,'b')===''?base.bold:['1','true'].includes(value(element,'b')),italic:value(element,'i')===''?base.italic:['1','true'].includes(value(element,'i')),color:/^[a-f0-9]{6}$/i.test(color)?'#'+color:base.color};
 };
 const font=(s:Style)=>`${s.italic?'italic ':''}${s.bold?'700 ':''}${s.fontSize}px "${s.fontFamily.replace(/["\\]/g,'')}"`;
 const objects:TextObject[]=[];let y=0;
 for(const paragraph of Array.from(body.children).filter(e=>e.localName==='p')){
  const props=direct(paragraph,'pPr'),level=number(value(props,'lvl'),0);
  const list=direct(body,'lstStyle')??direct(inheritedBody,'lstStyle');
  const masterProps=direct(masterStyle,`lvl${level+1}pPr`);
  const inheritedProps=direct(list,`lvl${level+1}pPr`)??direct(Array.from(inheritedBody?.children??[]).find(e=>e.localName==='p'),'pPr')??masterProps;
  const base=style(direct(props,'defRPr'),style(direct(inheritedProps,'defRPr'),style(direct(masterProps,'defRPr'),style(direct(Array.from(inheritedBody?.children??[]).find(e=>e.localName==='p'),'endParaRPr'),defaultStyle))));
  const spacing=(key:string)=>{const el=direct(props,key)??direct(inheritedProps,key);return number(value(direct(el,'spcPts'),'val'),0)/75;};
  const indent=number(value(props,'marL'),number(value(inheritedProps,'marL'),0))/9525;
  const alignment=value(props,'algn')||value(inheritedProps,'algn')||'l';
  const available=Math.max(1,box.w-left-right-indent);
  const lines:{text:string;style:Style;width:number}[][]=[[]];let used=0;
  const nextLine=()=>{lines.push([]);used=0;};
  for(const child of Array.from(paragraph.children)){
   if(child.localName==='br'){nextLine();continue;}if(!['r','fld'].includes(child.localName))continue;
   const s=style(direct(child,'rPr'),base),text=direct(child,'t')?.textContent??'';ctx.font=font(s);
   for(const token of text.match(/\s+|\S+/g)??[]){
    let width=ctx.measureText(token).width;
    if(value(bodyPr,'wrap')!=='none'&&used+width>available&&used>0&&!/^\s+$/.test(token))nextLine();
    // A long URL or uninterrupted word must also respect the text box width.
    if(value(bodyPr,'wrap')!=='none'&&width>available){for(const character of token){width=ctx.measureText(character).width;if(used+width>available&&used>0)nextLine();lines.at(-1)!.push({text:character,style:s,width});used+=width;}}
    else{lines.at(-1)!.push({text:token,style:s,width});used+=width;}
   }
  }
  y+=spacing('spcBef');
  for(const line of lines){
   const size=line.length?Math.max(...line.map(run=>run.style.fontSize)):base.fontSize;
   const lineSpacing=direct(props,'lnSpc')??direct(inheritedProps,'lnSpc');
   const points=value(direct(lineSpacing,'spcPts'),'val'),percent=value(direct(lineSpacing,'spcPct'),'val');
   const advance=points?number(points,size*75)/75:size*(percent?number(percent,100000)/100000:1.2);
   const total=line.reduce((sum,run)=>sum+run.width,0);let x=left+indent+(alignment==='ctr'?(available-total)/2:alignment==='r'?available-total:0);
   const merged:typeof line=[];for(const run of line){const last=merged.at(-1);if(last&&JSON.stringify(last.style)===JSON.stringify(run.style)){last.text+=run.text;last.width+=run.width;}else merged.push({...run});}
   for(const run of merged){if(run.text.trim())objects.push({id:crypto.randomUUID(),kind:'text',x:box.x+x,y:box.y+top+y+(size-run.style.fontSize)*.8,text:run.text,...run.style});x+=run.width;}
   y+=Math.max(1,advance);
  }
  y+=spacing('spcAft');
 }
 const anchor=value(bodyPr,'anchor'),shift=anchor==='ctr'?Math.max(0,(box.h-top-bottom-y)/2):anchor==='b'?Math.max(0,box.h-top-bottom-y):0;
 const cx=box.x+box.w/2,cy=box.y+box.h/2;
 for(const item of objects){item.y+=shift;if(box.rotation){ctx.font=font(item);const w=ctx.measureText(item.text).width,h=item.fontSize*1.25,x=item.x+w/2,z=item.y+h/2;item.x=cx+(x-cx)*Math.cos(box.rotation)-(z-cy)*Math.sin(box.rotation)-w/2;item.y=cy+(x-cx)*Math.sin(box.rotation)+(z-cy)*Math.cos(box.rotation)-h/2;item.rotation=box.rotation;}}
 return objects;
}
