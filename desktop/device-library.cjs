const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const MAX=160*1024*1024;
const validName=/^library-\d+-[a-f0-9]{8}\.kopybackup$/;
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
function validate(data){
 if(typeof data!=='string'||Buffer.byteLength(data)>MAX)throw new Error('Device library exceeds 160 MB. Export large lessons separately.');
 const value=JSON.parse(data);if(value.format!=='kopy-device-library'||value.version!==1||!Array.isArray(value.notebooks)||!Array.isArray(value.pages)||!Array.isArray(value.assets))throw new Error('Invalid device library.');
 return value;
}
class DeviceLibrary{
 constructor(root){this.root=root;this.queue=Promise.resolve();}
 async status(){await fs.mkdir(this.root,{recursive:true});const files=await this.files();return {available:true,folder:this.root,savedAt:files[0]?.time??null};}
 async files(){const entries=await fs.readdir(this.root).catch(e=>{if(e.code==='ENOENT')return [];throw e;});return entries.filter(n=>validName.test(n)).map(name=>({name,time:Number(name.split('-')[1])})).sort((a,b)=>b.time-a.time||b.name.localeCompare(a.name));}
 async read(){await fs.mkdir(this.root,{recursive:true});const copies=await this.files();for(const {name} of copies){try{const stat=await fs.stat(path.join(this.root,name));if(stat.size>MAX*2)continue;const wrapper=JSON.parse(await fs.readFile(path.join(this.root,name),'utf8'));if(digest(wrapper.data)!==wrapper.sha256)continue;validate(wrapper.data);return {data:wrapper.data,savedAt:wrapper.savedAt};}catch{/* An interrupted or damaged copy must not hide the remaining copies. */}}if(copies.length)throw new Error('No valid device copy was found. Existing files were kept; restore a separate backup or choose another folder.');return {data:null};}
 write(data){validate(data);const run=this.queue.catch(()=>{}).then(async()=>{await fs.mkdir(this.root,{recursive:true});const savedAt=Date.now(),name=`library-${savedAt}-${crypto.randomBytes(4).toString('hex')}.kopybackup`,file=path.join(this.root,name),pending=file+'.pending';const handle=await fs.open(pending,'wx');try{await handle.writeFile(JSON.stringify({savedAt,sha256:digest(data),data}),'utf8');await handle.sync();}finally{await handle.close();}await fs.rename(pending,file);for(const old of (await this.files()).slice(3))await fs.unlink(path.join(this.root,old.name));return {savedAt,folder:this.root};});this.queue=run;return run;}
}
module.exports={DeviceLibrary,validate,digest};
