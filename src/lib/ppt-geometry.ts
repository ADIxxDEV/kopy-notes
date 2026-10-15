const direct=(node:Element|undefined,name:string)=>node?Array.from(node.children).find(e=>e.localName===name):undefined;
const num=(node:Element|undefined,key:string,fallback=0)=>{const text=node?.getAttribute(key);return text&&Number.isFinite(Number(text))?Number(text):fallback;};
export function pptBounds(node:Element,fallback?:Element){
 const properties=direct(node,'spPr')??node,transform=direct(properties,'xfrm')??direct(direct(fallback,'spPr'),'xfrm');
 const offset=direct(transform,'off'),extent=direct(transform,'ext');let x=num(offset,'x')/9525,y=num(offset,'y')/9525,w=num(extent,'cx',1905000)/9525,h=num(extent,'cy',952500)/9525;
 let rotation=num(transform,'rot')/60000*Math.PI/180,scaleX=1,scaleY=1,mirrorX=['1','true'].includes(transform?.getAttribute('flipH')??''),mirrorY=['1','true'].includes(transform?.getAttribute('flipV')??'');
 for(let parent=node.parentElement;parent;parent=parent.parentElement){if(parent.localName!=='grpSp')continue;
  const tx=direct(direct(parent,'grpSpPr'),'xfrm'),off=direct(tx,'off'),ext=direct(tx,'ext'),childOff=direct(tx,'chOff'),childExt=direct(tx,'chExt');
  const childW=num(childExt,'cx'),childH=num(childExt,'cy');if(childW<=0||childH<=0)continue;
  const sx=num(ext,'cx')/childW,sy=num(ext,'cy')/childH;if(sx<=0||sy<=0)continue;
  const ox=num(off,'x')/9525,oy=num(off,'y')/9525,gw=num(ext,'cx')/9525,gh=num(ext,'cy')/9525;
  x=ox+(x-num(childOff,'x')/9525)*sx;y=oy+(y-num(childOff,'y')/9525)*sy;w*=sx;h*=sy;scaleX*=sx;scaleY*=sy;
  if(['1','true'].includes(tx?.getAttribute('flipH')??'')){x=2*ox+gw-x-w;mirrorX=!mirrorX;rotation=-rotation;}
  if(['1','true'].includes(tx?.getAttribute('flipV')??'')){y=2*oy+gh-y-h;mirrorY=!mirrorY;rotation=-rotation;}
  const angle=num(tx,'rot')/60000*Math.PI/180,cx=ox+gw/2,cy=oy+gh/2,dx=x+w/2-cx,dy=y+h/2-cy;
  x=cx+dx*Math.cos(angle)-dy*Math.sin(angle)-w/2;y=cy+dx*Math.sin(angle)+dy*Math.cos(angle)-h/2;rotation+=angle;
 }
 return{x,y,w,h,rotation,scaleX,scaleY,mirrorX,mirrorY};
}
