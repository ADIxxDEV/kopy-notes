export type ImportFrame={x:number;y:number;width:number;height:number};
export type ImportAlignment='top-left'|'top-center'|'top-right'|'center-left'|'center'|'center-right'|'bottom-left'|'bottom-center'|'bottom-right';
export type ImportLayout={sizing:'fit'|'fill'|'original';frameWidth:number;frameHeight:number;alignment:ImportAlignment;locked?:boolean;margins:{top:number;right:number;bottom:number;left:number}};
export const DEFAULT_IMPORT_LAYOUT:ImportLayout={sizing:'fit',frameWidth:1280,frameHeight:720,alignment:'center',locked:true,margins:{top:0,right:0,bottom:0,left:0}};
export function orientImportFrame(width:number,height:number,orientation:'portrait'|'landscape'){
 return orientation==='portrait'?{frameWidth:Math.min(width,height),frameHeight:Math.max(width,height)}:{frameWidth:Math.max(width,height),frameHeight:Math.min(width,height)};
}
export const MM_TO_DIGITAL_PX=96/25.4;
export function validateImportLayout(layout:ImportLayout){
 if(!['fit','fill','original'].includes(layout.sizing)||!['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'].includes(layout.alignment))throw new Error('Choose a valid document fit and alignment.');
 for(const v of [layout.frameWidth,layout.frameHeight])if(!Number.isFinite(v)||v<200||v>16000)throw new Error('Frame dimensions must be between 200 and 16000 pixels.');
 for(const v of Object.values(layout.margins))if(!Number.isFinite(v)||v<0||v>1000)throw new Error('Margins must be between 0 and 1000 mm.');
 if((layout.margins.left+layout.margins.right)*MM_TO_DIGITAL_PX>=layout.frameWidth||(layout.margins.top+layout.margins.bottom)*MM_TO_DIGITAL_PX>=layout.frameHeight)throw new Error('Margins leave no room for the document. Reduce them or increase the frame size.');
}
/** Digital layout uses 96 pixels per inch. It does not calibrate physical smartboard dimensions. */
export function placeImportedMedia(source:{width:number;height:number},layout:ImportLayout,center:{x:number;y:number}){
 validateImportLayout(layout);
 if(!Number.isFinite(source.width)||!Number.isFinite(source.height)||source.width<=0||source.height<=0)throw new Error('The document has invalid dimensions.');
 const frame:ImportFrame={x:center.x-layout.frameWidth/2,y:center.y-layout.frameHeight/2,width:layout.frameWidth,height:layout.frameHeight};
 const left=layout.margins.left*MM_TO_DIGITAL_PX,top=layout.margins.top*MM_TO_DIGITAL_PX;
 const usableWidth=layout.frameWidth-left-layout.margins.right*MM_TO_DIGITAL_PX,usableHeight=layout.frameHeight-top-layout.margins.bottom*MM_TO_DIGITAL_PX;
 const scale=layout.sizing==='original'?1:Math.min(usableWidth/source.width,usableHeight/source.height);
 const width=layout.sizing==='fill'?usableWidth:source.width*scale,height=layout.sizing==='fill'?usableHeight:source.height*scale;
 const horizontal=layout.alignment.endsWith('left')?0:layout.alignment.endsWith('right')?1:.5,vertical=layout.alignment.startsWith('top')?0:layout.alignment.startsWith('bottom')?1:.5;
 const x=frame.x+left+(usableWidth-width)*horizontal,y=frame.y+top+(usableHeight-height)*vertical;
 // Original-size documents can exceed the requested frame; include the overflow when fitting the view.
 const viewFrame={x:Math.min(frame.x,x),y:Math.min(frame.y,y),width:Math.max(frame.x+frame.width,x+width)-Math.min(frame.x,x),height:Math.max(frame.y+frame.height,y+height)-Math.min(frame.y,y)};
 return {x,y,width,height,frame:viewFrame};
}
export function combineImportFrames(frames:ImportFrame[]):ImportFrame|undefined{
 if(!frames.length)return undefined;const x=Math.min(...frames.map(f=>f.x)),y=Math.min(...frames.map(f=>f.y));
 return {x,y,width:Math.max(...frames.map(f=>f.x+f.width))-x,height:Math.max(...frames.map(f=>f.y+f.height))-y};
}
