import {encodeDeviceSnapshot,type SnapshotRecords} from './device-snapshot-encoding';
type SnapshotMessage={records:SnapshotRecords;limit:number};
const scope=globalThis as unknown as {onmessage:((event:MessageEvent<SnapshotMessage>)=>void)|null;postMessage:(value:unknown)=>void};
scope.onmessage=event=>{void encodeDeviceSnapshot(event.data.records,event.data.limit).then(data=>scope.postMessage({data}),error=>scope.postMessage({error:error instanceof Error?error.message:'Device copy failed.'}));};
