import { openDB, type DBSchema } from 'idb';
import type { AppProfile, Notebook, Page } from '../db/schema';

type Asset = { id: string; notebookId: string; name: string; mimeType: string; blob: Blob };
interface Store extends DBSchema {
  profile: { key: number; value: AppProfile };
  notebooks: { key: string; value: Notebook };
  pages: { key: string; value: Page; indexes: { notebookId: string } };
  assets: { key: string; value: Asset; indexes: { notebookId: string } };
}
export const DEFAULT_PROFILE: AppProfile = { id: 1, appName: 'Kopy Notes', teacherName: '', institution: '', accent: '#526677', boardBg: '#83d131', boardPattern: 'none', defaultPenColor: '#10151b', onboarded: 0, createdAt: new Date(), updatedAt: new Date(), splashText: 'A space for every lesson' };
export const database = () => openDB<Store>('kopy-notes', 1, { upgrade(db) {
  db.createObjectStore('profile', { keyPath: 'id' }); db.createObjectStore('notebooks', { keyPath: 'id' });
  db.createObjectStore('pages', { keyPath: 'id' }).createIndex('notebookId', 'notebookId');
  db.createObjectStore('assets', { keyPath: 'id' }).createIndex('notebookId', 'notebookId');
} });
const text = (value: unknown, fallback: string, max = 120) => typeof value === 'string' ? value.slice(0, max) : fallback;
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : fallback;
const patterns = ['none', 'grid', 'dots', 'lines'];
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: {'Content-Type':'application/json'} });

// A local persistence adapter, not an HTTP request or global fetch interception.
// All multi-record edits commit as a single IndexedDB transaction.
export async function localRequest(path: string, options: RequestInit = {}): Promise<Response> {
  // Keep a full portable snapshot before destructive edits, including binaries.
  if (options.method === 'DELETE') {
    const parts=path.split('?')[0].split('/').filter(Boolean);
    let lessonId=parts[1]==='notebooks'?parts[2]:undefined;
    if(parts[1]==='pages'&&parts[2]){const lookup=await database();try{lessonId=(await lookup.get('pages',parts[2]))?.notebookId;}finally{lookup.close();}}
    if(lessonId){const {saveRecovery}=await import('./recovery');await saveRecovery(lessonId);}
  }
  const db = await database();
  const method = options.method || 'GET';
  const parts = path.split('?')[0].split('/').filter(Boolean);
  const kind = parts[1], id = parts[2];
  const body: Record<string, unknown> = typeof options.body === 'string' ? JSON.parse(options.body) : {};
  // A shared read/write transaction also serializes edits from other tabs.
  const tx = db.transaction(['profile', 'notebooks', 'pages', 'assets'], 'readwrite');
  const now = new Date();
  try {
    let result: Response;
    if (kind === 'profile') {
      const current = await tx.objectStore('profile').get(1) || DEFAULT_PROFILE;
      if (method === 'PUT') {
        const updated: AppProfile = { ...current, appName: text(body.appName, current.appName, 60) || 'Kopy Notes', teacherName: text(body.teacherName,current.teacherName,60), institution: text(body.institution,current.institution,60), accent: color(body.accent,current.accent), boardBg: color(body.boardBg,current.boardBg), boardPattern: typeof body.boardPattern === 'string' && patterns.includes(body.boardPattern) ? body.boardPattern : current.boardPattern, defaultPenColor: color(body.defaultPenColor,current.defaultPenColor), onboarded: body.onboarded === 1 ? 1 : current.onboarded, splashText: text(body.splashText,current.splashText || '',120), watermark: body.watermark && typeof body.watermark==='object'?{enabled:Boolean((body.watermark as any).enabled),text:text((body.watermark as any).text,current.watermark?.text??'',120),position:['center','top-left','top-right','bottom-left','bottom-right'].includes((body.watermark as any).position)?(body.watermark as any).position:'bottom-right',opacity:Math.max(.02,Math.min(.5,Number((body.watermark as any).opacity)||.12))}:current.watermark, calibrationPxPerMm: Number.isFinite(body.calibrationPxPerMm)?Math.max(.1,Math.min(50,Number(body.calibrationPxPerMm))):current.calibrationPxPerMm, ai:body.ai && typeof body.ai==='object'?{enabled:Boolean((body.ai as any).enabled),endpoint:text((body.ai as any).endpoint,current.ai?.endpoint??'http://127.0.0.1:11434',300),model:text((body.ai as any).model,current.ai?.model??'llama3.2',100)}:current.ai, iconData: typeof body.iconData === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(body.iconData) && body.iconData.length < 750000 ? body.iconData : current.iconData, updatedAt: now };
        await tx.objectStore('profile').put(updated); result = json({profile:updated});
      } else result = json({profile:current});
    } else if (kind === 'notebooks' && !id && method === 'GET') {
      const notebooks = await tx.objectStore('notebooks').getAll(); notebooks.sort((a,b)=>Number(b.updatedAt)-Number(a.updatedAt)); result = json({notebooks});
    } else if (kind === 'notebooks' && !id && method === 'POST') {
      const profile = await tx.objectStore('profile').get(1) || DEFAULT_PROFILE;
      const notebook: Notebook = {id:crypto.randomUUID(),title:text(body.title,'Untitled lesson') || 'Untitled lesson',subject:text(body.subject,'General',60),coverColor:color(body.coverColor,'#526677'),pageCount:1,createdAt:now,updatedAt:now};
      const page: Page = {id:crypto.randomUUID(),notebookId:notebook.id,position:0,background:profile.boardBg,pattern:profile.boardPattern,objects:[],media:[],createdAt:now,updatedAt:now};
      await tx.objectStore('notebooks').add(notebook); await tx.objectStore('pages').add(page); result = json({notebook},201);
    } else if (kind === 'notebooks' && id) {
      const notebook = await tx.objectStore('notebooks').get(id);
      if (!notebook) result = json({error:'Lesson not found'},404);
      else {
        const pages = (await tx.objectStore('pages').index('notebookId').getAll(id)).sort((a,b)=>a.position-b.position);
        if (parts[3] === 'pages' && parts[4] === 'reorder' && method === 'PUT') {
          const ids = body.pageIds;
          const known = new Set(pages.map(page => page.id));
          if (!Array.isArray(ids) || ids.length !== pages.length || new Set(ids).size !== pages.length || ids.some(value => typeof value !== 'string' || !known.has(value))) {
            result = json({error:'Page order must contain every page of this lesson exactly once'},400);
          } else {
            const byId = new Map(pages.map(page => [page.id,page]));
            const ordered = ids.map((pageId,position) => ({...byId.get(pageId as string)!,position,updatedAt:now}));
            for (const page of ordered) await tx.objectStore('pages').put(page);
            await tx.objectStore('notebooks').put({...notebook,updatedAt:now});
            result = json({pages:ordered});
          }
        } else if (parts[3] === 'pages' && method === 'POST') {
          const page: Page = {id:crypto.randomUUID(),notebookId:id,position:(pages.at(-1)?.position ?? -1)+1,background:color(body.background,'#83d131'),pattern:patterns.includes(String(body.pattern))?String(body.pattern):'none',objects:[],media:[],createdAt:now,updatedAt:now};
          await tx.objectStore('pages').add(page); await tx.objectStore('notebooks').put({...notebook,pageCount:pages.length+1,updatedAt:now}); result=json({page},201);
        } else if (method === 'PUT') {
          const updated={...notebook,title:text(body.title,notebook.title),subject:text(body.subject,notebook.subject,60),coverColor:color(body.coverColor,notebook.coverColor),updatedAt:now};
          await tx.objectStore('notebooks').put(updated); result=json({notebook:updated});
        } else if (method === 'DELETE') {
          for (const page of pages) await tx.objectStore('pages').delete(page.id);
          for (const asset of await tx.objectStore('assets').index('notebookId').getAll(id)) await tx.objectStore('assets').delete(asset.id);
          await tx.objectStore('notebooks').delete(id); result=json({ok:true});
        } else result=json({notebook,pages});
      }
    } else if (kind === 'pages' && id) {
      const page=await tx.objectStore('pages').get(id);
      if (!page) result=json({error:'Page not found'},404);
      else {
        const notebook=await tx.objectStore('notebooks').get(page.notebookId);
        if (!notebook) throw new Error('Missing parent lesson');
        if (method === 'PUT') {
          const importFrame=body.importFrame as Page['importFrame'];
          if(importFrame && (![importFrame.x,importFrame.y,importFrame.width,importFrame.height].every(Number.isFinite)||importFrame.width<=0||importFrame.height<=0||importFrame.width>100000||importFrame.height>100000))throw new Error('Invalid import frame');
          const updated={...page,importFrame:importFrame??page.importFrame,objects:Array.isArray(body.objects)?body.objects as Page['objects']:page.objects,media:Array.isArray(body.media)?body.media as Page['media']:page.media,background:color(body.background,page.background),pattern:patterns.includes(String(body.pattern))?String(body.pattern):page.pattern,updatedAt:now};
          await tx.objectStore('pages').put(updated); await tx.objectStore('notebooks').put({...notebook,updatedAt:now}); result=json({page:updated});
        } else if (method === 'DELETE') {
          const count=await tx.objectStore('pages').index('notebookId').count(page.notebookId);
          if (count <= 1) result=json({error:'Keep at least one page'},409);
          else { await tx.objectStore('pages').delete(id); await tx.objectStore('notebooks').put({...notebook,pageCount:count-1,updatedAt:now}); result=json({ok:true}); }
        } else result=json({page});
      }
    } else if (kind === 'assets' && method === 'POST') {
      const notebookId=String(body.notebookId || '');
      if (!(await tx.objectStore('notebooks').get(notebookId))) throw new Error('Lesson not found');
      const encoded=String(body.dataBase64 || ''); if (encoded.length > 36*1024*1024) throw new Error('Asset exceeds 25 MB');
      const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      const asset: Asset={id:crypto.randomUUID(),notebookId,name:text(body.name,'asset',255),mimeType:text(body.mimeType,'application/octet-stream'),blob:new Blob([bytes],{type:text(body.mimeType,'application/octet-stream')})};
      await tx.objectStore('assets').add(asset); result=json({asset:{id:asset.id,name:asset.name,mimeType:asset.mimeType}},201);
    } else result=json({error:'Unsupported local operation'},400);
    await tx.done; return result;
  } catch(error) {
    try { tx.abort(); } catch { /* Already closed. */ }
    await tx.done.catch(()=>{});
    throw error;
  } finally { db.close(); }
}

const urls = new Map<string,string>();
export async function localAssetURL(id: string) {
  if (urls.has(id)) return urls.get(id)!;
  const db=await database(); const asset=await db.get('assets',id); db.close();
  if (!asset) throw new Error('Local file is missing');
  const url=URL.createObjectURL(asset.blob); urls.set(id,url); return url;
}
