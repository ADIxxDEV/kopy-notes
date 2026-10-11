/** Paint-lighting equations adapted from dli/paint shaders/painting.frag.
 * Copyright (c) 2017 David Li. MIT: docs/licenses/fluid-paint-MIT.txt.
 * Canvas geometry, pigment and bounded sampling are original Kopy code.
 */
export function paintLight(slopeX:number,slopeY:number,roughness=.38){
 const normalize=(x:number,y:number,z:number)=>{const l=Math.hypot(x,y,z)||1;return [x/l,y/l,z/l];};
 const normal=normalize(slopeX,slopeY,1),light=normalize(-.35,-.55,1),half=normalize(light[0],light[1],light[2]+1);
 const dot=(a:number[],b:number[])=>Math.max(0,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2]));
 const nDotH=dot(normal,half),nDotL=dot(normal,light),nDotV=normal[2],lDotH=dot(light,half);
 const a2=roughness*roughness;
 // GGX distribution, Smith geometry and Schlick Fresnel, as in Fluid Paint.
 const D=a2/(Math.PI*Math.pow(nDotH*nDotH*(a2-1)+1,2));
 const gl=nDotL+Math.sqrt(a2+(1-a2)*nDotL*nDotL),gv=nDotV+Math.sqrt(a2+(1-a2)*nDotV*nDotV);
 const G=1/Math.max(1e-5,gl*gv),F=.04+.96*Math.pow(1-lDotH,5);
 return {diffuse:nDotL*.42+.58,specular:Math.min(.38,D*G*F*2.2)};
}
export function paintShade(hex:string,slopeX:number,slopeY:number,roughness=.38){
 const {diffuse,specular}=paintLight(slopeX,slopeY,roughness);
 const channels=(hex.match(/[a-f0-9]{2}/gi)??['00','00','00']).map(v=>parseInt(v,16));
 return '#'+channels.map(v=>Math.max(0,Math.min(255,Math.round(v*diffuse+255*specular))).toString(16).padStart(2,'0')).join('');
}
