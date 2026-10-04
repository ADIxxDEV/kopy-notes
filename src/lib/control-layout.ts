export type ControlPosition={x:number;y:number;scale:number;hidden:boolean;floating?:boolean};
export type ControlPositions=Record<string,ControlPosition>;
export type ControlPreset={id:string;name:string;positions:ControlPositions};
export type ControlLayoutStore={version:1;current:ControlPositions;presets:ControlPreset[]};
export const CONTROL_LAYOUT_KEY='kopy-control-layout-v1';
export const emptyControlLayout=():ControlLayoutStore=>({version:1,current:{},presets:[]});

export function parseControlLayout(value:unknown):ControlLayoutStore{
  if(!value||typeof value!=='object')throw new Error('Choose a Kopy control layout file.');
  const input=value as ControlLayoutStore;
  if(input.version!==1||!Array.isArray(input.presets)||input.presets.length>20)throw new Error('Unsupported layout or too many presets.');
  const positions=(source:unknown):ControlPositions=>{
    if(!source||typeof source!=='object'||Array.isArray(source)||Object.keys(source).length>150)throw new Error('Invalid control positions.');
    const result:ControlPositions=Object.create(null);
    for(const [id,item] of Object.entries(source)){
      if(!/^[a-z0-9-]{1,100}$/.test(id)||!item||typeof item!=='object')throw new Error('Invalid control ID.');
      const p=item as ControlPosition;
      if(![p.x,p.y,p.scale].every(Number.isFinite)||p.x<0||p.x>1||p.y<0||p.y>1||p.scale<1||p.scale>1.75||typeof p.hidden!=='boolean')throw new Error('Invalid control size or position.');
      if(p.floating!==undefined&&typeof p.floating!=='boolean')throw new Error('Invalid floating mode.');
      result[id]={x:p.x,y:p.y,scale:p.scale,hidden:p.hidden,...(p.floating===undefined?{}:{floating:p.floating})};
    }
    return result;
  };
  const ids=new Set<string>();
  const presets=input.presets.map(p=>{
    if(!p||typeof p.id!=='string'||!/^[a-z0-9-]{1,100}$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>40)throw new Error('Invalid preset.');
    ids.add(p.id);return{id:p.id,name:p.name.trim(),positions:positions(p.positions)};
  });
  return{version:1,current:positions(input.current),presets};
}

/** Store fractions of the available movement area, not pixels from one screen. */
export function controlCoordinates(p:ControlPosition,size:{width:number;height:number},viewport:{width:number;height:number}){
  const margin=p.floating===false?0:8;
  const width=Math.min(size.width,viewport.width-margin*2),height=Math.min(size.height,viewport.height-margin*2);
  return{x:margin+Math.max(0,viewport.width-width-margin*2)*p.x,y:margin+Math.max(0,viewport.height-height-margin*2)*p.y};
}
export function controlPositionAt(x:number,y:number,width:number,height:number,viewport:{width:number;height:number},scale=1,floating?:boolean):ControlPosition{
  const clamp=(v:number)=>Math.max(0,Math.min(1,v));
  const margin=floating===false?0:8;
  const p={x:clamp((x-margin)/Math.max(1,viewport.width-width-margin*2)),y:clamp((y-margin)/Math.max(1,viewport.height-height-margin*2)),scale,hidden:false,...(floating===undefined?{}:{floating})};
  if(floating===false){
    const distances=[p.x*(viewport.width-width),(1-p.x)*(viewport.width-width),p.y*(viewport.height-height),(1-p.y)*(viewport.height-height)];
    const nearest=distances.indexOf(Math.min(...distances));
    if(nearest===0)p.x=0;else if(nearest===1)p.x=1;else if(nearest===2)p.y=0;else p.y=1;
  }
  return p;
}
