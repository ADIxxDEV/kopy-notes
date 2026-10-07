export type Rect={x:number;y:number;width:number;height:number};
export function toolPopupPosition(anchor:Rect,popup:{width:number;height:number},toolbar:Rect|undefined,viewport:{width:number;height:number},gap=0,sidePanel=false,obstacles:Rect[]=[]){
 const margin=8,g=Math.max(0,Math.min(64,gap));let maxWidth=viewport.width-16,maxHeight=viewport.height-16;
 let x=anchor.x+anchor.width/2-popup.width/2,y=anchor.y-popup.height-g;
 if(sidePanel){
  const right=viewport.width-margin-anchor.x-anchor.width-g,left=anchor.x-g-margin;
  const useRight=right>=popup.width||(left<popup.width&&right>=left);
  maxWidth=Math.max(44,useRight?right:left);
  x=useRight?anchor.x+anchor.width+g:anchor.x-g-Math.min(popup.width,maxWidth);
  y=anchor.y;if(toolbar&&toolbar.width>=toolbar.height){maxHeight=Math.max(44,toolbar.y-g-margin);y=Math.min(y,toolbar.y-g-Math.min(popup.height,maxHeight));}
 }else if(toolbar&&toolbar.height>toolbar.width){
  const right=toolbar.x+toolbar.width+g,left=toolbar.x-g;
  if(toolbar.x+toolbar.width/2<viewport.width/2){x=right;maxWidth=Math.max(44,viewport.width-right-margin);}else{maxWidth=Math.max(44,left-margin);x=left-Math.min(popup.width,maxWidth);}
  const limit=Math.min(viewport.height-8,...obstacles.filter(r=>r.y>viewport.height/2&&r.x<x+Math.min(popup.width,maxWidth)&&r.x+r.width>x).map(r=>r.y-g));
  const topLimit=Math.max(margin,...obstacles.filter(r=>r.y<viewport.height/2&&r.x<x+Math.min(popup.width,maxWidth)&&r.x+r.width>x&&r.y+r.height<limit).map(r=>r.y+r.height+g));
  maxHeight=Math.max(44,limit-topLimit);y=Math.max(topLimit,Math.min(anchor.y,limit-Math.min(popup.height,maxHeight)));
 }else if(toolbar){
  x=Math.max(margin,Math.min(x,viewport.width-popup.width-margin));
  const top=Math.min(toolbar.y,...obstacles.filter(r=>r.x<x+popup.width&&r.x+r.width>x&&r.y>=toolbar.y-100).map(r=>r.y));
  maxHeight=Math.max(44,top-g-margin);y=top-g-Math.min(popup.height,maxHeight);
 }
 const width=Math.min(popup.width,maxWidth),height=Math.min(popup.height,maxHeight);
 return{x:Math.max(margin,Math.min(x,viewport.width-width-margin)),y:Math.max(margin,Math.min(y,viewport.height-height-margin)),maxWidth,maxHeight};
}
