import {penOutline,drawStamp,laserOpacity,brushTexture} from './pen-strokes';
import type {
  BoardObject,
  Point,
  ShapeObject,
  StrokeObject,
  TextObject,
} from "@/db/schema";

// ---------------------------------------------------------------------------
// Pure canvas drawing + geometry helpers for the whiteboard. Kept free of
// React so the logic is easy to reason about and reuse.
// ---------------------------------------------------------------------------

export type Bounds = { x: number; y: number; w: number; h: number };

export function applyToolStyle(ctx: CanvasRenderingContext2D, tool: string) {
  switch (tool) {
    case "highlighter":
      ctx.globalAlpha = 0.35;
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "square";
      ctx.lineJoin = "round";
      break;
    case "marker":
      ctx.globalAlpha = 0.85;
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      break;
    default:
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
  }
}

// Draws a smoothed freehand stroke using mid-point quadratic curves.
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeObject) {
  const pts = stroke.points;
  if (pts.length === 0) return;

  ctx.save();
  const inheritedAlpha = ctx.globalAlpha;
  applyToolStyle(ctx, stroke.tool);
  ctx.globalAlpha *= inheritedAlpha;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;

  if(stroke.tool==='laser'){ctx.globalAlpha*=laserOpacity(stroke,performance.now(),typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);ctx.shadowColor=stroke.color;ctx.shadowBlur=Math.max(12,stroke.width*4);}
  if(stroke.brush==='stamp'){
    let previous:{x:number;y:number}|undefined;for(const p of pts){if(previous&&dist(previous,p)<Math.max(12,stroke.width*1.4))continue;drawStamp(ctx,stroke.stamp??'smile',p.x,p.y,Math.max(12,stroke.width),stroke.color);previous=p;}ctx.restore();return;
  }
  if(stroke.tool==='pen'){
    const outline=penOutline(stroke);
    if(outline.length){
      ctx.beginPath();ctx.moveTo(outline[0][0],outline[0][1]);for(let i=1;i<outline.length;i++)ctx.lineTo(outline[i][0],outline[i][1]);ctx.closePath();
      const textured=['paint','crayon','pencil'].includes(stroke.brush??'');
      ctx.fillStyle=stroke.color;
      ctx.globalAlpha=inheritedAlpha*(stroke.brush==='pencil'?.3:stroke.brush==='crayon'?.32:stroke.brush==='paint'?.86:1);ctx.fill();
      if(textured){const pigment=brushTexture(ctx,stroke.brush!,stroke.color);if(pigment){ctx.fillStyle=pigment;ctx.globalAlpha=inheritedAlpha*(stroke.brush==='paint'?.5:.85);ctx.fill();}}
    }
    ctx.restore();return;
  }

  if (pts.length === 1) {
    const p = pts[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(stroke.width / 2, 0.5), 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const cx = pts[i].x;
    const cy = pts[i].y;
    const mx = (cx + pts[i + 1].x) / 2;
    const my = (cy + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(cx, cy, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  if(stroke.tool==='laser'){ctx.shadowBlur=0;ctx.strokeStyle='#fff7df';ctx.lineWidth=Math.max(.8,stroke.width*.35);ctx.stroke();}
  ctx.restore();
}

export function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size: number,
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a = size;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - a * Math.cos(angle - Math.PI / 7),
    y2 - a * Math.sin(angle - Math.PI / 7),
  );
  ctx.lineTo(
    x2 - a * Math.cos(angle + Math.PI / 7),
    y2 - a * Math.sin(angle + Math.PI / 7),
  );
  ctx.closePath();
  ctx.fill();
}

/** Polygon points remain inside the dragged rectangle, including reverse drags. */
export function shapeVertices(shape: Pick<ShapeObject, "shape" | "x" | "y" | "w" | "h">): Point[] {
  const {x, y, w, h} = shape;
  if (shape.shape === "triangle") return [{x:x+w/2,y}, {x:x+w,y:y+h}, {x,y:y+h}];
  if (shape.shape === "righttriangle") return [{x,y}, {x:x+w,y:y+h}, {x,y:y+h}];
  if (shape.shape === "parallelogram") return [{x:x+w*.25,y}, {x:x+w,y}, {x:x+w*.75,y:y+h}, {x,y:y+h}];
  if (shape.shape === "trapezoid") return [{x:x+w*.25,y}, {x:x+w*.75,y}, {x:x+w,y:y+h}, {x,y:y+h}];
  if (shape.shape === "diamond") return [{x:x+w/2,y}, {x:x+w,y:y+h/2}, {x:x+w/2,y:y+h}, {x,y:y+h/2}];
  const sides = shape.shape === "star" ? 10 : shape.shape === "pentagon" ? 5 : 6;
  return Array.from({length:sides}, (_, i) => {
    const radius = shape.shape === "star" && i % 2 ? 0.42 : 1;
    const angle = 2 * Math.PI * i / sides - Math.PI / 2;
    return {x:x+w/2+Math.cos(angle)*w/2*radius, y:y+h/2+Math.sin(angle)*h/2*radius};
  });
}

function traceClosedShape(ctx:CanvasRenderingContext2D,shape:ShapeObject) {
  const {x,y,w,h}=shape;ctx.beginPath();
  if(shape.shape==='rect'){
    const radius=Math.max(0,Math.min(shape.roundness??0,Math.abs(w)/2,Math.abs(h)/2));
    if(radius){ctx.roundRect(Math.min(x,x+w),Math.min(y,y+h),Math.abs(w),Math.abs(h),radius);}else ctx.rect(x,y,w,h);
  }else if(shape.shape==='ellipse'||shape.shape==='circle'){
    ctx.ellipse(x+w/2,y+h/2,Math.abs(w/2),Math.abs(h/2),0,0,Math.PI*2);
  }else{
    shapeVertices(shape).forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));ctx.closePath();
  }
}

function hatchFill(ctx:CanvasRenderingContext2D,shape:ShapeObject){
  ctx.save();ctx.clip();ctx.setLineDash([]);ctx.strokeStyle=shape.fillColor??shape.color;
  ctx.lineWidth=Math.max(1,shape.width*.5);ctx.lineCap='butt';
  const x=Math.min(shape.x,shape.x+shape.w),y=Math.min(shape.y,shape.y+shape.h),w=Math.abs(shape.w),h=Math.abs(shape.h);
  // Bound work on unusually large imported shapes without changing their geometry.
  const gap=Math.max(8,shape.width*3,(w+h)/1200);
  ctx.beginPath();
  for(let d=-h;d<=w;d+=gap){ctx.moveTo(x+d,y);ctx.lineTo(x+d+h,y+h);}
  if(shape.fillStyle==='crosshatch')for(let d=0;d<=w+h;d+=gap){ctx.moveTo(x+d,y);ctx.lineTo(x+d-h,y+h);}
  ctx.stroke();ctx.restore();
}

export function drawShape(ctx: CanvasRenderingContext2D, shape: ShapeObject) {
  ctx.save();
  const {x,y,w,h}=shape;ctx.translate(x+w/2,y+h/2);ctx.rotate(shape.rotation);if(shape.mirrorX||shape.mirrorY)ctx.scale(shape.mirrorX?-1:1,shape.mirrorY?-1:1);ctx.translate(-(x+w/2),-(y+h/2));
  ctx.globalAlpha=1;ctx.strokeStyle=shape.color;ctx.fillStyle=shape.fillColor??shape.color;ctx.lineWidth=shape.width;
  ctx.setLineDash(shape.dash==='dashed'?[shape.width*4,shape.width*3]:shape.dash==='dotted'?[0,shape.width*3]:[]);
  ctx.lineCap='round';ctx.lineJoin='round';
  if(shape.shape==='line'||shape.shape==='arrow'){
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y+h);ctx.stroke();
    if(shape.shape==='arrow'){ctx.fillStyle=shape.color;ctx.setLineDash([]);drawArrowHead(ctx,x,y,x+w,y+h,Math.max(shape.width*4,12));}
  }else{
    traceClosedShape(ctx,shape);
    if(shape.filled){
      if(shape.fillStyle==='hachure'||shape.fillStyle==='crosshatch'){hatchFill(ctx,shape);traceClosedShape(ctx,shape);}else ctx.fill();
    }
    ctx.stroke();
  }
  ctx.restore();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

export function drawText(ctx: CanvasRenderingContext2D, item: TextObject) {
  ctx.save();
  if(item.rotation||item.mirrorX||item.mirrorY){const b=rawObjectBounds(item,ctx),cx=b.x+b.w/2,cy=b.y+b.h/2;ctx.translate(cx,cy);ctx.rotate(item.rotation??0);ctx.scale(item.mirrorX?-1:1,item.mirrorY?-1:1);ctx.translate(-cx,-cy);}
  ctx.globalAlpha = 1;
  ctx.fillStyle = item.color;
  const font = `${item.bold ? "700 " : ""}${item.fontSize}px ${item.fontFamily}`;
  ctx.font = font;
  ctx.textBaseline = "top";
  const lines = wrapLines(ctx, item.text, 1200);
  const lineHeight = item.fontSize * 1.25;
  lines.forEach((line, i) => {
    ctx.fillText(line, item.x, item.y + i * lineHeight);
  });
  ctx.restore();
}

export function drawObject(ctx: CanvasRenderingContext2D, obj: BoardObject) {
  switch (obj.kind) {
    case "stroke":
      drawStroke(ctx, obj);
      break;
    case "shape":
      drawShape(ctx, obj);
      break;
    case "text":
      drawText(ctx, obj);
      break;
  }
}

// Fixed-to-screen background fill + optional grid/dots/lines pattern.
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  pattern: string,
  dpr: number,
  image?:CanvasImageSource|null,
) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  if(image)ctx.drawImage(image,0,0,w,h);

  if (pattern && pattern !== "none") {
    const step = 32;
    const isDark = isColorDark(color);
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)";
    ctx.lineWidth = 1;

    if(pattern==='staff'||pattern==='handwriting'){
      ctx.beginPath();const rows=pattern==='staff'?5:3,gap=pattern==='staff'?10:16;
      for(let y=32;y<h;y+=pattern==='staff'?100:80)for(let n=0;n<rows;n++){ctx.moveTo(0,y+n*gap);ctx.lineTo(w,y+n*gap);}ctx.stroke();
    }else if(pattern==='isometric'){
      ctx.beginPath();for(let x=-h*2;x<w+h*2;x+=40){ctx.moveTo(x,0);ctx.lineTo(x+h/1.732,h);ctx.moveTo(x,0);ctx.lineTo(x-h/1.732,h);}for(let y=0;y<h;y+=34.64){ctx.moveTo(0,y);ctx.lineTo(w,y);}ctx.stroke();
    }else if (pattern === "grid") {
      ctx.beginPath();
      for (let x = 0; x <= w; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    } else if (pattern === "dots") {
      for (let x = step; x < w; x += step) {
        for (let y = step; y < h; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (pattern === "lines") {
      ctx.beginPath();
      for (let y = step; y < h; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function isColorDark(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return true;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

// ----------------------------- geometry / hit ------------------------------

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function pointNearStroke(p: Point, stroke: StrokeObject, tol: number): boolean {
  const pts = stroke.points;
  const effTol = tol + stroke.width / 2;
  if (pts.length === 1) return dist(p, pts[0]) <= effTol;
  for (let i = 1; i < pts.length; i++) {
    if (distToSegment(p, pts[i - 1], pts[i]) <= effTol) return true;
  }
  return false;
}

export function objectBounds(obj:BoardObject,ctx?:CanvasRenderingContext2D):Bounds {
  const b=rawObjectBounds(obj,ctx);if(obj.kind!=='text'||!obj.rotation)return b;
  const cx=b.x+b.w/2,cy=b.y+b.h/2,c=Math.cos(obj.rotation),s=Math.sin(obj.rotation);
  const pts=[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]].map(([x,y])=>({x:cx+(x-cx)*c-(y-cy)*s,y:cy+(x-cx)*s+(y-cy)*c}));
  const x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y));return{x,y,w:Math.max(...pts.map(p=>p.x))-x,h:Math.max(...pts.map(p=>p.y))-y};
}
function rawObjectBounds(obj: BoardObject, ctx?: CanvasRenderingContext2D): Bounds {
  if (obj.kind === "stroke") {
    const pts = obj.points;
    if (pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const pad = obj.width / 2;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }
  if (obj.kind === "shape") {
    const cx = obj.x + obj.w / 2, cy = obj.y + obj.h / 2;
    const c = Math.cos(obj.rotation), s = Math.sin(obj.rotation);
    const corners = [[obj.x,obj.y],[obj.x+obj.w,obj.y],[obj.x+obj.w,obj.y+obj.h],[obj.x,obj.y+obj.h]];
    const rotated = corners.map(([x,y])=>({x:cx+(x-cx)*c-(y-cy)*s,y:cy+(x-cx)*s+(y-cy)*c}));
    const x = Math.min(...rotated.map(p=>p.x)), y = Math.min(...rotated.map(p=>p.y));
    return {x,y,w:Math.max(...rotated.map(p=>p.x))-x,h:Math.max(...rotated.map(p=>p.y))-y};
  }
  // text
  if (ctx) {
    ctx.save();
    ctx.font = `${obj.bold ? "700 " : ""}${obj.fontSize}px ${obj.fontFamily}`;
    const lines = wrapLines(ctx, obj.text, 1200);
    let maxW = 0;
    for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
    ctx.restore();
    return { x: obj.x, y: obj.y, w: maxW, h: lines.length * obj.fontSize * 1.25 };
  }
  return { x: obj.x, y: obj.y, w: obj.text.length * obj.fontSize * 0.6, h: obj.fontSize * 1.25 };
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

// Eraser: does the eraser circle hit this object?
export function objectHitByEraser(obj: BoardObject, center: Point, radius: number): boolean {
  if (obj.kind === "stroke") return pointNearStroke(center, obj, radius);
  const b = objectBounds(obj);
  // Circle vs AABB
  const cx = Math.max(b.x, Math.min(center.x, b.x + b.w));
  const cy = Math.max(b.y, Math.min(center.y, b.y + b.h));
  return dist(center, { x: cx, y: cy }) <= radius;
}

// --------------------------- shape recognition ---------------------------

/** Uniform sampling avoids over-weighting places where the pen paused. */
function samplePath(points:Point[],count=64):Point[]{
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+dist(points[i-1],points[i]));
  const total=lengths.at(-1)!;let segment=1;
  return Array.from({length:count},(_,i)=>{
    const target=total*i/(count-1);while(segment<points.length-1&&lengths[segment]<target)segment++;
    const a=points[segment-1],b=points[segment],t=(target-lengths[segment-1])/Math.max(1e-9,lengths[segment]-lengths[segment-1]);
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  });
}

/** Geometry-only recognition. Uncertain paths stay editable ink, never guessed text. */
export function recognizeShape(points:Point[],color:string,width:number):ShapeObject|null{
  if(points.length<6||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
  let clean:Point[]=[];for(const p of points)if(!clean.length||dist(p,clean.at(-1)!)>.2)clean.push(p);if(clean.length<5)return null;
  if(clean.length>4096){const all=clean;clean=Array.from({length:4096},(_,i)=>all[Math.round(i*(all.length-1)/4095)]);}
  const xs=clean.map(p=>p.x),ys=clean.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys);
  const w=Math.max(...xs)-minX,h=Math.max(...ys)-minY,diag=Math.hypot(w,h);if(diag<45)return null;
  const first=clean[0],last=clean.at(-1)!;let length=0;for(let i=1;i<clean.length;i++)length+=dist(clean[i-1],clean[i]);
  const gap=dist(first,last),tolerance=Math.max(3,Math.min(width*1.5,8),diag*.025);
  const base:ShapeObject={id:'',kind:'shape',shape:'line',x:minX,y:minY,w,h,color,width,filled:false,rotation:0};
  function linear(kind:'line'|'arrow',end:Point){
    const dx=end.x-first.x,dy=end.y-first.y,angle=Math.atan2(dy,dx),snapped=Math.round(angle/(Math.PI/4))*Math.PI/4;
    const a=Math.abs(angle-snapped)<Math.PI/30?snapped:angle,distance=Math.hypot(dx,dy);
    return {...base,shape:kind,x:first.x,y:first.y,w:Math.cos(a)*distance,h:Math.sin(a)*distance};
  }
  // A line must both follow its chord and avoid a detour/backtrack.
  if(gap/Math.max(length,1)>.94&&clean.every(p=>distToSegment(p,first,last)<=tolerance))return linear('line',last);
  // One continuous arrow stroke: straight shaft followed by wings on opposite sides of its tip.
  let tipIndex=0;for(let i=1;i<clean.length;i++)if(dist(first,clean[i])>dist(first,clean[tipIndex]))tipIndex=i;
  const tip=clean[tipIndex],shaft=dist(first,tip);
  if(tipIndex>=3&&tipIndex<clean.length-3&&shaft>60&&shaft>diag*.65&&clean.slice(0,tipIndex+1).every(p=>distToSegment(p,first,tip)<=tolerance)){
    const ux=(tip.x-first.x)/shaft,uy=(tip.y-first.y)/shaft;
    const wings=clean.slice(tipIndex+1).map(p=>({back:-(p.x-tip.x)*ux-(p.y-tip.y)*uy,side:(p.x-tip.x)*-uy+(p.y-tip.y)*ux}));
    const valid=wings.filter(p=>p.back>shaft*.05&&p.back<shaft*.4&&Math.abs(p.side)>shaft*.055&&Math.abs(p.side)<shaft*.3);
    if(valid.some(p=>p.side>0)&&valid.some(p=>p.side<0)&&wings.every(p=>p.back>=-tolerance&&p.back<shaft*.5&&Math.abs(p.side)<shaft*.35)&&length<shaft*2.4)return linear('arrow',tip);
  }
  // Closed figures must have substantial size/area and a small seam.
  if(w<38||h<38||gap>diag*.10)return null;
  let area=0;for(let i=0;i<clean.length;i++){const a=clean[i],b=clean[(i+1)%clean.length];area+=a.x*b.y-b.x*a.y;}
  if(Math.abs(area)/2<w*h*.24)return null;
  const closed=gap>.2?[...clean,first]:clean,samples=samplePath(closed),candidates:{shape:ShapeObject['shape'];score:number;rotation:number;x?:number;y?:number;w?:number;h?:number}[]=[];
  function polygonCandidate(kind:ShapeObject['shape'],vertices:Point[],rotation=0){
    const errors=samples.map(p=>Math.min(...vertices.map((a,i)=>distToSegment(p,a,vertices[(i+1)%vertices.length]))));
    const perimeter=vertices.reduce((v,a,i)=>v+dist(a,vertices[(i+1)%vertices.length]),0);
    const score=errors.reduce((v,e)=>v+e,0)/samples.length/diag;
    const coverage=vertices.every((a,i)=>samples.some(p=>distToSegment(p,a,vertices[(i+1)%vertices.length])<diag*.04));
    if(score<.027&&Math.max(...errors)<diag*.075&&length/perimeter>.75&&length/perimeter<1.28&&coverage)candidates.push({shape:kind,score,rotation});
  }
  polygonCandidate('rect',[{x:minX,y:minY},{x:minX+w,y:minY},{x:minX+w,y:minY+h},{x:minX,y:minY+h}]);
  for(const kind of ['diamond','triangle','righttriangle','pentagon','hexagon','star','trapezoid','parallelogram'] as const){
    const vertices=shapeVertices({...base,shape:kind});polygonCandidate(kind,vertices);
    if(kind==='triangle'){
      // An upside-down triangle keeps the same drag bounds.
      polygonCandidate(kind,vertices.map(p=>({x:2*(minX+w/2)-p.x,y:2*(minY+h/2)-p.y})),Math.PI);
    }
  }
  for(let degrees=15;degrees<180;degrees+=15){
    const angle=degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),cx=minX+w/2,cy=minY+h/2;
    const local=clean.map(p=>({x:(p.x-cx)*c+(p.y-cy)*s,y:-(p.x-cx)*s+(p.y-cy)*c}));
    const lx=Math.min(...local.map(p=>p.x)),ly=Math.min(...local.map(p=>p.y)),lw=Math.max(...local.map(p=>p.x))-lx,lh=Math.max(...local.map(p=>p.y))-ly;
    const ox=cx+(lx+lw/2)*c-(ly+lh/2)*s,oy=cy+(lx+lw/2)*s+(ly+lh/2)*c;
    for(const kind of ['rect','triangle','righttriangle','pentagon','hexagon','star','trapezoid','parallelogram'] as const){
      const template={...base,shape:kind,x:ox-lw/2,y:oy-lh/2,w:lw,h:lh};
      const vertices=kind==='rect'?[{x:template.x,y:template.y},{x:template.x+lw,y:template.y},{x:template.x+lw,y:template.y+lh},{x:template.x,y:template.y+lh}]:shapeVertices(template);
      const rotated=vertices.map(p=>({x:ox+(p.x-ox)*c-(p.y-oy)*s,y:oy+(p.x-ox)*s+(p.y-oy)*c}));
      const start=candidates.length;polygonCandidate(kind,rotated,angle);
      if(candidates.length>start){const candidate=candidates[candidates.length-1];candidate.score+=.003;Object.assign(candidate,{x:template.x,y:template.y,w:lw,h:lh});}
    }
  }
  const radial=samples.map(p=>Math.abs(Math.hypot((p.x-minX-w/2)/(w/2),(p.y-minY-h/2)/(h/2))-1));
  const angles=new Set(samples.map(p=>Math.floor((Math.atan2((p.y-minY-h/2)/(h/2),(p.x-minX-w/2)/(w/2))+Math.PI)/(2*Math.PI)*16)%16));
  const ellipsePerimeter=Math.PI*(3*(w/2+h/2)-Math.sqrt((3*w/2+h/2)*(w/2+3*h/2)));
  const radialMean=radial.reduce((v,e)=>v+e,0)/radial.length;
  if(radialMean<.055&&Math.max(...radial)<.12&&angles.size>=14&&length/ellipsePerimeter>.8&&length/ellipsePerimeter<1.2)candidates.push({shape:Math.abs(w/h-1)<.08?'circle':'ellipse',score:radialMean*.35,rotation:0});
  candidates.sort((a,b)=>a.score-b.score);const best=candidates[0];
  if(!best)return null;const result={...base,shape:best.shape,rotation:best.rotation,x:best.x??base.x,y:best.y??base.y,w:best.w??base.w,h:best.h??base.h};
  if(result.shape==='rect'&&result.w<result.h){const cx=result.x+result.w/2,cy=result.y+result.h/2;[result.w,result.h]=[result.h,result.w];result.x=cx-result.w/2;result.y=cy-result.h/2;result.rotation=(result.rotation+Math.PI/2)%Math.PI;}
  return result;
}
