import {test,expect} from '@playwright/test';
const slugs=['online-whiteboard-for-free','smart-board-for-teaching','digital-board-for-teaching'];
test('guides serve crawlable HTML and useful templates without JavaScript',async({browser,request})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();const titles=new Set<string>();
 for(const slug of slugs){
  const url=`/guides/${slug}/`;const response=await page.goto(url);expect(response?.status()).toBe(200);await expect(page.locator('h1')).toHaveCount(1);expect((await page.locator('article').innerText()).split(/\s+/).length).toBeGreaterThan(650);
  titles.add(await page.title());await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',`https://kopy-notes.netlify.app${url}`);expect(await page.locator('meta[name=description]').getAttribute('content')).toBeTruthy();
  const graph=JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());expect(graph['@graph'][0]['@type']).toBe('Article');expect(graph['@graph'][1]['@type']).toBe('BreadcrumbList');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const links=await page.locator('a[download]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')!));expect(links.length).toBeGreaterThan(0);for(const link of links){const sample=await request.get(link);expect(sample.ok()).toBe(true);expect(await sample.json()).toMatchObject({format:'kopy-notes',version:2});}
  await page.screenshot({path:`test-results/guide-${slug}.png`});
 }
 expect(titles.size).toBe(3);const sitemap=await request.get('/sitemap.xml');const xml=await sitemap.text();for(const slug of slugs)expect(xml).toContain(`/guides/${slug}/`);
 await page.goto('/guides/');for(const slug of slugs)await expect(page.locator(`a[href="/guides/${slug}/"]`).first()).toBeVisible();await context.close();
});
test('sample lessons import as editable objects and export with teacher changes',async({page})=>{
 await page.goto('/#/app');await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
 const result=await page.evaluate(async()=>{
  const {importLesson,exportLesson}=await import('/src/lib/lesson-bundle.ts' as string);const {database}=await import('/src/lib/local-store.ts' as string);const results=[];
  for(const slug of ['fractions-warmup','graph-investigation','observe-predict-explain']){
   const file=await(await fetch(`/samples/${slug}.kopy`)).blob();const id=await importLesson(file);const db=await database();const pages=await db.getAllFromIndex('pages','notebookId',id);const first=pages[0];first.objects[0]={...first.objects[0],text:'Adapted by teacher'};await db.put('pages',first);db.close();
   const data=JSON.parse(await(await exportLesson(id)).text());results.push({pageCount:data.pages.length,edited:data.pages.some((p:any)=>p.objects.some((o:any)=>o.text==='Adapted by teacher')),shapes:data.pages.every((p:any)=>p.objects.some((o:any)=>o.kind==='shape'))});
  }return results;
 });expect(result).toEqual(Array.from({length:3},()=>({pageCount:2,edited:true,shapes:true})));
});
