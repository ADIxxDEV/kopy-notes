import {equipmentPolygon,liquidSurface,VESSELS,type EquipmentObject} from './chemistry-equipment';
import {indicatorColor,solutionPH} from './chemistry-beaker';
export function drawChemistryEquipment(ctx:CanvasRenderingContext2D,object:EquipmentObject) {
 const data=object.chemistry,poly=equipmentPolygon(object),ph=solutionPH(data.solution),color=indicatorColor(ph,data.indicator,data.customColor),capacity=VESSELS[data.vessel].capacity;
 const path=()=>{ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();};
 ctx.save();path();ctx.fillStyle='#bce5f5';ctx.globalAlpha=.12;ctx.fill();ctx.globalAlpha=1;
 if(data.solution.volumeMl){ctx.save();path();ctx.clip();const surface=liquidSurface(poly,data.solution.volumeMl/capacity),left=Math.min(...poly.map(p=>p.x)),right=Math.max(...poly.map(p=>p.x)),bottom=Math.max(...poly.map(p=>p.y));ctx.fillStyle=color;ctx.globalAlpha=.7;ctx.fillRect(left-2,surface,right-left+4,bottom-surface+2);ctx.globalAlpha=1;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(left,surface);ctx.lineTo(right,surface);ctx.stroke();ctx.restore();}
 path();ctx.strokeStyle=object.color;ctx.lineWidth=Math.max(1.5,object.width);ctx.lineJoin='round';ctx.stroke();
 ctx.translate(object.x+object.w/2,object.y+object.h/2);ctx.rotate(object.rotation);ctx.scale(object.mirrorX?-1:1,object.mirrorY?-1:1);ctx.translate(-object.w/2,-object.h/2);
 ctx.strokeStyle=object.color;ctx.fillStyle=object.color;ctx.font=`${Math.max(11,Math.min(16,object.w*.09))}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
 if(data.vessel!=='funnel'){for(let n=1;n<=4;n++){const y=object.h*(.87-.8*n/5);ctx.beginPath();ctx.moveTo(object.w*.7,y);ctx.lineTo(object.w*.86,y);ctx.stroke();}}
 if(data.vessel==='cylinder'){ctx.beginPath();ctx.moveTo(object.w*.05,object.h*.9);ctx.lineTo(object.w*.95,object.h*.9);ctx.stroke();}
 ctx.fillText(data.label.slice(0,24),object.w/2,object.h*.94,object.w);
 if(data.vessel!=='funnel')ctx.fillText(`${Number(data.solution.volumeMl.toFixed(1))}/${capacity} mL`,object.w/2,object.h*.995,object.w);
 ctx.restore();
}
