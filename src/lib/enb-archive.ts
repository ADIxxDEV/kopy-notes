/** Inspect central-directory sizes before JSZip allocates expanded entries. */
export function inspectEnbArchive(buffer:ArrayBuffer){
 const v=new DataView(buffer),bytes=new Uint8Array(buffer),MAX=100*1024*1024;
 if(buffer.byteLength>MAX||buffer.byteLength<22)throw new Error('ENB files must be under 100 MB.');
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===bytes.length){end=i;break;}
 if(end<0)throw new Error('This ENB is not a supported ZIP document.');
 const count=v.getUint16(end+10,true),size=v.getUint32(end+12,true),offset=v.getUint32(end+16,true);
 if(v.getUint16(end+4,true)||v.getUint16(end+6,true)||count!==v.getUint16(end+8,true)||count>2500||offset+size!==end)throw new Error('Unsupported or oversized ENB archive.');
 let at=offset,total=0;const names=new Set<string>();
 for(let i=0;i<count;i++){
  if(at+46>end||v.getUint32(at,true)!==0x02014b50)throw new Error('Invalid ENB file directory.');
  const expanded=v.getUint32(at+24,true),length=v.getUint16(at+28,true),extra=v.getUint16(at+30,true),comment=v.getUint16(at+32,true);
  const next=at+46+length+extra+comment;
  if(next>end||(v.getUint16(at+8,true)&1)||![0,8].includes(v.getUint16(at+10,true)))throw new Error('Encrypted or unsupported ENB entries.');
  const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(at+46,at+46+length));
  if(!name||name.includes('\\')||name.startsWith('/')||name.split('/').includes('..')||/[\x00-\x1f:]/.test(name)||names.has(name))throw new Error('Unsafe or duplicate ENB file path.');
  const limit=name==='Kopy/lesson.json'?MAX:/\.xml$/i.test(name)?8*1024*1024:25*1024*1024;
  total+=expanded;if(expanded>limit||total>MAX)throw new Error('Expanded ENB contents exceed 100 MB or the per-file limit.');
  names.add(name);at=next;
 }
 if(at!==end||!names.has('Board.xml'))throw new Error('This file does not contain a Note3 board.');
 return names;
}
