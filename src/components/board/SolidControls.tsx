import type {BoardObject,ShapeObject} from '@/db/schema';
import {isSolid,type SolidData} from '@/lib/solid-shapes';
export function SolidControls({object,onChange}:{object:ShapeObject;onChange:(fn:(objects:BoardObject[])=>BoardObject[])=>void}){
 if(!isSolid(object))return null;const change=(patch:Partial<SolidData>)=>onChange(objects=>objects.map(item=>item.id===object.id&&isSolid(item)?{...item,solid:{...item.solid,...patch}}:item));
 return <section className="kn-solid-controls" aria-label="3D rotation"><strong>3D rotation</strong>{(['yaw','pitch','roll'] as const).map(axis=><label key={axis}>{axis[0].toUpperCase()+axis.slice(1)}<input type="range" aria-label={`3D ${axis}`} min="-180" max="180" step="5" value={object.solid[axis]} onChange={e=>change({[axis]:Number(e.target.value)})}/><output>{object.solid[axis]}&deg;</output></label>)}<label><input type="checkbox" aria-label="3D wireframe" checked={object.solid.wireframe} onChange={e=>change({wireframe:e.target.checked})}/>Wireframe</label><button type="button" onClick={()=>change({yaw:30,pitch:-20,roll:0})}>Reset view</button></section>;
}
