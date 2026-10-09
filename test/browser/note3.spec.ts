import {test,expect} from '@playwright/test';
test('org-note3 theme survives reload and stays usable on a phone',async({page})=>{
 await page.route('**/__local-note3-theme',route=>route.fulfill({status:204,body:''}));await page.goto('/#/app');await page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);const {BUILTIN_THEMES}=await import('/src/lib/theme-pack.ts' as string);await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1,theme:BUILTIN_THEMES.find((t:{id:string})=>t.id==='org-note3')})});const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Note theme'})})).json();location.hash=`/board/${notebook.id}`;});
 await page.reload();await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-theme-appearance','org-note3');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme-appearance','org-note3');
 await expect(page.locator('.kn-main-tools button[aria-label="Pen"] [data-note3-artwork="pen"]')).toBeVisible();
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Pen',exact:true}).click();await page.getByRole('button',{name:'Pen',exact:true}).click();await expect(page.getByRole('button',{name:'Laser pointer',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('ENB imports editable ink, falls back for unsupported objects and roundtrips Kopy edits',async({page})=>{
 await page.goto('/#/app');const result=await page.evaluate(async()=>{
 const {default:JSZip}=await import('/node_modules/.vite/deps/jszip.js' as string);const {prepareEnb,importEnb,exportEnb}=await import('/src/lib/enb.ts' as string);const {localRequest}=await import('/src/lib/local-store.ts' as string);
 const zip=new JSZip();zip.file('Board.xml','<Package Type="Board"><Data><SlideCount>1</SlideCount><Slides>test;</Slides></Data></Package>');
 const slide='<Package Type="Slide"><Data><Width>1280</Width><Height>720</Height><BackgroundType>SolidColorBrush</BackgroundType><BackgroundValue>#FF95C459</BackgroundValue></Data><Packages><Package Type="Ink"><Data><Points>10,20,0.5;100,200,1;</Points><InkType>HardPenStroke</InkType><Thickness>6</Thickness><ForegroundColor>#FF123456</ForegroundColor></Data></Package></Packages></Package>';
 zip.file('Slides/Slide_0.xml',slide);const bytes=await zip.generateAsync({type:'uint8array'});const input=new File([bytes],'editable.enb');const imported=await importEnb(input);const {pages}=await(await localRequest(`/api/notebooks/${imported.id}`)).json();
 const output=await exportEnb(imported.id,pages);const roundtrip=await prepareEnb(output);const data=JSON.parse(await roundtrip.blob.text());
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;zip.file('Slides/Slide_0.png',canvas.toDataURL().split(',')[1],{base64:true});zip.file('Slides/Slide_0.xml',slide.replace('HardPenStroke','MagicPenStroke'));
 const fallback=await prepareEnb(new Blob([await zip.generateAsync({type:'uint8array'})]));
 const hostile=new JSZip();hostile.file('Board.xml','<!DOCTYPE test [<!ENTITY x "x">]><Package/>');let rejected=false;try{await prepareEnb(new Blob([await hostile.generateAsync({type:'uint8array'})]));}catch{rejected=true;}
 return{objects:data.pages[0].objects,flattened:fallback.flattenedPages,rejected};
 });
 expect(result.objects[0]).toMatchObject({kind:'stroke',width:6,color:'#123456',points:[{x:10,y:20,p:.5},{x:100,y:200,p:1}]});expect(result.flattened).toEqual([1]);expect(result.rejected).toBe(true);
});

test('selecting a theme in Settings applies immediately without the Save button',async({page})=>{
 await page.goto('/#/app');await page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1})});const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Settings theme check'})})).json();location.hash=`/board/${notebook.id}`;});
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByText('Theme packs',{exact:true}).click();await page.getByRole('button',{name:'Apply theme org-note3',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme-appearance','org-note3');
 await expect.poll(()=>page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);return(await(await localRequest('/api/profile')).json()).profile.theme.appearance;})).toBe('org-note3');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme-appearance','org-note3');
});

test('Midnight to org-note3 keeps actual artwork after leaving Settings and reopening the lesson',async({page})=>{
 await page.goto('/#/app');await page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);const {BUILTIN_THEMES}=await import('/src/lib/theme-pack.ts' as string);await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1,theme:BUILTIN_THEMES.find((t:{id:string})=>t.id==='kopy-night')})});const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Midnight regression'})})).json();location.hash=`/board/${notebook.id}`;});await page.reload();
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
 await page.route('**/__local-note3-theme',async route=>{const pack=await page.evaluate(async()=>{const {BUILTIN_THEMES}=await import('/src/lib/theme-pack.ts' as string);return BUILTIN_THEMES.find((t:{id:string})=>t.id==='org-note3');});await route.fulfill({json:{...pack,icons:{pen:image,menu:image,plus:image}}});});
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByText('Theme packs',{exact:true}).click();
 await page.getByRole('button',{name:'Apply theme org-note3',exact:true}).click();
 await expect.poll(()=>page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);const {profile}=await(await localRequest('/api/profile')).json();return profile.theme.id+'|'+Object.keys(profile.theme.icons).length;})).toBe('org-note3|3');
 await page.reload();
 await expect(page.locator('.kn-main-tools button[aria-label="Pen"] img')).toHaveAttribute('src',image);
 await expect(page.locator('[data-dock-action="file"] img')).toHaveAttribute('src',image);
 await expect(page.locator('.kn-page-add img')).toHaveAttribute('src',image);
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Exit to library',exact:true}).click();await page.goBack();
 await expect(page.locator('.kn-main-tools button[aria-label="Pen"] img')).toHaveAttribute('src',image);
 await expect(page.locator('html')).toHaveAttribute('data-theme-appearance','org-note3');
});
