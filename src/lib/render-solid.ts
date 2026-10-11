import type {ShapeObject} from '../db/schema';
import {isSolid,projectedSolid} from './solid-shapes';
export function drawSolid(ctx:CanvasRenderingContext2D,shape:ShapeObject){
 if(!isSolid(shape))return;const {vertices,faces}=projectedSolid(shape.solid);
 const xs=vertices.map(v=>v.x),ys=vertices.map(v=>v.y),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;
 const scale=Math.min(Math.abs(shape.w)/Math.max(.01,width),Math.abs(shape.h)/Math.max(.01,height)),ox=shape.x+(shape.w-width*scale)/2,oy=shape.y+(shape.h-height*scale)/2;
 ctx.save();const cx=shape.x+shape.w/2,cy=shape.y+shape.h/2;ctx.translate(cx,cy);ctx.rotate(shape.rotation);ctx.scale(shape.mirrorX?-1:1,shape.mirrorY?-1:1);ctx.translate(-cx,-cy);
 ctx.lineJoin='round';ctx.lineWidth=shape.width;ctx.strokeStyle=shape.color;ctx.setLineDash(shape.dash==='dashed'?[8,6]:shape.dash==='dotted'?[2,5]:[]);
 const base=shape.fillColor??shape.color,hex=/^#[0-9a-f]{6}$/i.test(base)?base:'#6296bd';
 faces.forEach((face,index)=>{ctx.beginPath();face.indices.forEach((i,j)=>{const v=vertices[i];if(j)ctx.lineTo(ox+(v.x-left)*scale,oy+(v.y-top)*scale);else ctx.moveTo(ox+(v.x-left)*scale,oy+(v.y-top)*scale);});ctx.closePath();
 if(!shape.solid.wireframe&&shape.filled){const shade=.55+.4*(index/Math.max(1,faces.length-1));ctx.fillStyle=`rgb(${[1,3,5].map(offset=>Math.round(parseInt(hex.slice(offset,offset+2),16)*shade)).join(',')})`;ctx.fill();}
 if(shape.solid.kind!=='sphere'||shape.solid.wireframe)ctx.stroke();
 });ctx.restore();
}
