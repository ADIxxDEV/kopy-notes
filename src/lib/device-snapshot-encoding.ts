export type SnapshotRecords={profile:unknown;notebooks:unknown[];pages:unknown[];assets:{blob:Blob;[key:string]:unknown}[];preferences:Record<string,string>};
export const SNAPSHOT_LIMIT=160*1024*1024;
export function snapshotLimitError(limit:number){return new Error(`Device copy exceeds ${Math.round(limit/1024/1024)} MB for this device. Export large lessons separately. Your in-app lessons are still saved.`);}
function checkedLimit(limit:number){return Number.isFinite(limit)&&limit>0?Math.min(SNAPSHOT_LIMIT,limit):SNAPSHOT_LIMIT;}
/** Check binary expansion first, before cloning records into a worker. Count
 * metadata a record at a time and yield so a large library stays responsive. */
export async function preflightDeviceSnapshot(records:SnapshotRecords,requestedLimit=SNAPSHOT_LIMIT):Promise<void>{
 const limit=checkedLimit(requestedLimit);let bytes=256;
 for(const asset of records.assets){bytes+=Math.ceil(asset.blob.size/3)*4;if(bytes>limit)throw snapshotLimitError(limit);}
 let checkpoint=Date.now();const encoder=new TextEncoder();
 const count=async(value:unknown)=>{const json=JSON.stringify(value);if(json)bytes+=encoder.encode(json).byteLength+1;if(bytes>limit)throw snapshotLimitError(limit);if(Date.now()-checkpoint>12){await new Promise<void>(resolve=>setTimeout(resolve,0));checkpoint=Date.now();}};
 await count(records.profile);await count(records.preferences);
 for(const notebook of records.notebooks)await count(notebook);
 for(const page of records.pages)await count(page);
 for(const {blob,...metadata} of records.assets)await count(metadata);
}
export async function encodeDeviceSnapshot(records:SnapshotRecords,requestedLimit=SNAPSHOT_LIMIT):Promise<string>{
 const limit=checkedLimit(requestedLimit);await preflightDeviceSnapshot(records,limit);
 const assets=[];for(const {blob,...asset} of records.assets){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768){binary+=String.fromCharCode(...bytes.subarray(i,i+32768));if(i>0&&i%1048576===0)await new Promise<void>(resolve=>setTimeout(resolve,0));}assets.push({...asset,dataBase64:btoa(binary)});}
 const data=JSON.stringify({format:'kopy-device-library',version:1,...records,assets});if(new Blob([data]).size>limit)throw snapshotLimitError(limit);return data;
}
