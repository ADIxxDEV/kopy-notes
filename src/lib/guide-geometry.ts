import type {Point} from '../db/schema';
export type GuideEdge={a:Point;b:Point};
/** Signed shortest rotation, continuous across the +/-PI boundary. */
export function angleDelta(from:number,to:number):number {return Math.atan2(Math.sin(to-from),Math.cos(to-from));}
/** Segments sampled at most 3 degrees apart for a smooth compass arc. */
export function arcEdges(center:Point,radius:number,start:number,sweep:number):GuideEdge[] {
 if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(start)||!Number.isFinite(sweep))return [];
 const count=Math.min(240,Math.max(1,Math.ceil(Math.abs(sweep)/(Math.PI/60))));
 const point=(a:number):Point=>({x:center.x+radius*Math.cos(a),y:center.y+radius*Math.sin(a)});
 return Array.from({length:count},(_,i)=>({a:point(start+sweep*i/count),b:point(start+sweep*(i+1)/count)}));
}
export function projectToEdge(point:Point,edge:GuideEdge):Point {
 const dx=edge.b.x-edge.a.x,dy=edge.b.y-edge.a.y,length=dx*dx+dy*dy;
 const t=length?Math.max(0,Math.min(1,((point.x-edge.a.x)*dx+(point.y-edge.a.y)*dy)/length)):0;
 return {x:edge.a.x+t*dx,y:edge.a.y+t*dy,p:point.p};
}
export function nearbyEdge(point:Point,edges:GuideEdge[],tolerance=22):GuideEdge|undefined {
 let closest:GuideEdge|undefined,best=tolerance;
 for(const edge of edges){const p=projectToEdge(point,edge),distance=Math.hypot(p.x-point.x,p.y-point.y);if(distance<best){best=distance;closest=edge;}}
 return closest;
}
