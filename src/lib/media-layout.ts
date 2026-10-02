import type {MediaItem,ImportFrame} from '../db/schema';
export function mediaBounds(media:MediaItem){const c=Math.abs(Math.cos(media.rotation)),s=Math.abs(Math.sin(media.rotation)),w=media.width*c+media.height*s,h=media.width*s+media.height*c;return{x:media.x+media.width/2-w/2,y:media.y+media.height/2-h/2,w,h};}
export function placeMediaInFrame(media:MediaItem,frame:ImportFrame,align:'left'|'center'|'right',fit=false):MediaItem{
  const bounds=mediaBounds(media),scale=fit?Math.min(frame.width/bounds.w,frame.height/bounds.h):1;
  const width=media.width*scale,height=media.height*scale,bw=bounds.w*scale,bh=bounds.h*scale;
  const centerX=align==='left'?frame.x+bw/2:align==='right'?frame.x+frame.width-bw/2:frame.x+frame.width/2;
  return{...media,width,height,x:centerX-width/2,y:frame.y+frame.height/2-height/2};
}
