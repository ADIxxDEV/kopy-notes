import {exportXLSX} from '../../src/lib/spreadsheet';
import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
const pixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a36cAAAAASUVORK5CYII=';
test('PPTX and LibreOffice ODP preserve editable slide text, images and ordered pages',async({page})=>{
  const ppt=new JSZip();ppt.file('ppt/presentation.xml','<p:presentation xmlns:p="urn:p" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="42" r:id="rId2"/><p:sldId id="43" r:id="rId1"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>');ppt.file('ppt/_rels/presentation.xml.rels','<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/></Relationships>');
  const slide=(text:string,image=false)=>`<p:sld xmlns:p="urn:p" xmlns:a="urn:a" xmlns:r="urn:r"><p:cSld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="952500" y="1905000"/><a:ext cx="3810000" cy="952500"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:rPr sz="2400" b="1"/><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>${image?'<p:pic><p:blipFill><a:blip r:embed="image1"/></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="952500"/></a:xfrm></p:spPr></p:pic>':''}</p:spTree></p:cSld></p:sld>`;
  ppt.file('ppt/slides/slide1.xml',slide('Second slide'));ppt.file('ppt/slides/slide2.xml',slide('First slide',true));ppt.file('ppt/slides/_rels/slide2.xml.rels','<Relationships><Relationship Id="image1" Target="../media/image1.png"/></Relationships>');ppt.file('ppt/media/image1.png',pixel,{base64:true});
  const odp=new JSZip();odp.file('styles.xml','<office:document-styles xmlns:office="urn:office" xmlns:style="urn:style" xmlns:fo="urn:fo"><style:page-layout-properties fo:page-width="33.866666cm" fo:page-height="19.05cm"/></office:document-styles>');odp.file('content.xml','<office:document-content xmlns:office="urn:office" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:text" xmlns:svg="urn:svg" xmlns:xlink="urn:xlink"><draw:page><draw:frame svg:x="2.54cm" svg:y="5.08cm" svg:width="10.16cm" svg:height="2.54cm"><text:p>LibreOffice slide</text:p></draw:frame><draw:frame svg:x="0cm" svg:y="0cm" svg:width="2.54cm" svg:height="2.54cm"><draw:image xlink:href="Pictures/image.png"/></draw:frame></draw:page></office:document-content>');odp.file('Pictures/image.png',pixel,{base64:true});
  await page.goto('/#/app');await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
  const result=await page.evaluate(async({ppt,odp})=>{
    const {localRequest}=await import('/src/lib/local-store.ts' as string),{importOfficeSlides}=await import('/src/lib/office-slides.ts' as string);
    const{notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Office fixture"}'})).json();
    const file=(data:string,name:string)=>new File([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],name);
    const first=await importOfficeSlides(notebook.id,file(ppt,'sample.pptx'),true),second=await importOfficeSlides(notebook.id,file(odp,'sample.odp'));
    return{first,second,...await(await localRequest(`/api/notebooks/${notebook.id}`)).json()};
  },{ppt:await ppt.generateAsync({type:'base64'}),odp:await odp.generateAsync({type:'base64'})});
  expect(result.pages).toHaveLength(3);expect(result.pages.map((p:any)=>p.objects.find((o:any)=>o.kind==='text').text)).toEqual(['First slide','Second slide','LibreOffice slide']);
  expect(result.pages[0].objects[0]).toMatchObject({kind:'text',x:109.6,y:204.8,fontSize:32,bold:true});expect(result.pages[0].media[0]).toMatchObject({kind:'image',width:100,height:100});expect(result.pages[2].media).toHaveLength(1);expect(result.pages[0].importFrame).toMatchObject({width:1280,height:720});expect(result.first.warnings.length).toBeGreaterThan(0);
});

test('Office XML external entities are rejected before creating slides',async({page})=>{
  const archive=new JSZip();archive.file('content.xml','<!DOCTYPE document [<!ENTITY example SYSTEM "https://example.com/private">]><document>&example;</document>');
  await page.goto('/#/app');await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
  const result=await page.evaluate(async(encoded)=>{const{localRequest}=await import('/src/lib/local-store.ts' as string),{importOfficeSlides}=await import('/src/lib/office-slides.ts' as string);const{notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Rejected Office"}'})).json();let error='';try{await importOfficeSlides(notebook.id,new File([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],'bad.odp'));}catch(cause){error=String(cause);}return{error,...await(await localRequest(`/api/notebooks/${notebook.id}`)).json()};},await archive.generateAsync({type:'base64'}));
  expect(result.error).toContain('Unsupported or oversized Office XML');expect(result.pages).toHaveLength(1);expect(result.pages[0].objects).toHaveLength(0);
});

test('flattened slides contain one saved image and no editable text objects',async({page})=>{
  const archive=new JSZip();archive.file('content.xml','<office:document-content xmlns:office="urn:office" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:text" xmlns:svg="urn:svg"><draw:page><draw:frame svg:x="1cm" svg:y="1cm" svg:width="10cm" svg:height="3cm"><text:p>Flatten me</text:p></draw:frame></draw:page></office:document-content>');
  await page.goto('/#/app');
  const result=await page.evaluate(async(encoded)=>{
    const {localRequest,database}=await import('/src/lib/local-store.ts' as string),{importOfficeSlides}=await import('/src/lib/office-slides.ts' as string);
    const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title:'Flat slides'})})).json();
    await importOfficeSlides(notebook.id,new File([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],'slides.odp'),true,undefined,'flattened');
    const {pages}=await(await localRequest(`/api/notebooks/${notebook.id}`)).json();const db=await database();const asset=await db.get('assets',pages[0].media[0].assetId);db.close();
    return {objects:pages[0].objects,media:pages[0].media,size:asset.blob.size,type:asset.blob.type};
  },await archive.generateAsync({type:'base64'}));
  expect(result.objects).toHaveLength(0);expect(result.media).toHaveLength(1);expect(result.type).toBe('image/png');expect(result.size).toBeGreaterThan(100);
});

 test('PPT text uses measured wrapping, box insets, vertical anchors and run styles',async({page})=>{
 await page.goto('/#/app');await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
 const result=await page.evaluate(async()=>{
 const {pptText}=await import('/src/lib/ppt-text.ts' as string);
 const doc=new DOMParser().parseFromString('<sp><txBody><bodyPr lIns="190500" rIns="190500" tIns="95250" bIns="95250" anchor="ctr"/><p><pPr algn="ctr"><lnSpc><spcPts val="3000"/></lnSpc></pPr><r><rPr sz="1800" b="1"><solidFill><srgbClr val="ff0000"/></solidFill></rPr><t>Title</t></r></p><p><pPr algn="r"/><r><rPr sz="1200"/><t>Second</t></r></p></txBody></sp>','application/xml');
 const objects=pptText(doc.documentElement,{x:100,y:200,w:400,h:200,rotation:0});
 const context=document.createElement('canvas').getContext('2d')!;context.font='700 24px Arial';const title=context.measureText('Title').width;context.font='16px Arial';const second=context.measureText('Second').width;
 const wrapped=new DOMParser().parseFromString('<sp><txBody><bodyPr lIns="0" rIns="0" tIns="0"/><p><r><rPr sz="1800"/><t>one two three four five</t></r></p></txBody></sp>','application/xml');
 return {objects,title,second,wrapped:pptText(wrapped.documentElement,{x:0,y:0,w:90,h:200,rotation:0})};
 });
 expect(result.objects).toHaveLength(2);expect(result.objects[0]).toMatchObject({text:'Title',fontSize:24,bold:true,color:'#ff0000'});
 expect(result.objects[0].x).toBeCloseTo(100+20+(360-result.title)/2);expect(result.objects[1].x).toBeCloseTo(100+400-20-result.second);
 expect(result.objects[0].y).toBeCloseTo(200+10+(180-40-19.2)/2);expect(result.objects[1].y-result.objects[0].y).toBeCloseTo(40);
 expect(result.wrapped.length).toBeGreaterThan(1);expect(result.wrapped[0].y).toBe(0);expect(result.wrapped[1].y).toBeCloseTo(28.8);
 });

test('PPT detects embedded audio, editable Excel and linked YouTube objects',async({page})=>{
 const ppt=new JSZip();ppt.file('ppt/presentation.xml','<p:presentation xmlns:p="urn:p" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="42" r:id="slide"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>');ppt.file('ppt/_rels/presentation.xml.rels','<Relationships><Relationship Id="slide" Target="slides/slide1.xml"/></Relationships>');
 const transform='<a:xfrm><a:off x="952500" y="952500"/><a:ext cx="3810000" cy="2857500"/></a:xfrm>';
 ppt.file('ppt/slides/slide1.xml',`<p:sld xmlns:p="urn:p" xmlns:a="urn:a" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree><p:pic><p:nvPicPr><p:cNvPr name="Class audio"/><p:nvPr><a:audioFile r:link="audio"/></p:nvPr></p:nvPicPr><p:spPr>${transform}</p:spPr></p:pic><p:pic><p:nvPicPr><p:cNvPr name="Video example"/><p:nvPr><a:videoFile r:link="youtube"/></p:nvPr></p:nvPicPr><p:spPr>${transform}</p:spPr></p:pic><p:graphicFrame>${transform}<a:graphic><a:graphicData><p:oleObj r:id="workbook" progId="Excel.Sheet.12"/></a:graphicData></a:graphic></p:graphicFrame><p:graphicFrame>${transform}<a:graphic><a:graphicData><p:oleObj r:id="legacy"/></a:graphicData></a:graphic></p:graphicFrame></p:spTree></p:cSld></p:sld>`);
 ppt.file('ppt/slides/_rels/slide1.xml.rels','<Relationships><Relationship Id="audio" Target="../media/class.wav"/><Relationship Id="youtube" Target="https://www.youtube.com/watch?v=dQw4w9WgXcQ" TargetMode="External"/><Relationship Id="workbook" Target="../embeddings/marks.xlsx"/><Relationship Id="legacy" Target="../embeddings/legacy.bin"/></Relationships>');ppt.file('ppt/media/class.wav',new Uint8Array(44));ppt.file('ppt/embeddings/legacy.bin',new Uint8Array(16));
 const workbook=await exportXLSX({version:1,tabs:[{name:'Marks',cells:[['12','=A1*2']]}]});ppt.file('ppt/embeddings/marks.xlsx',await workbook.arrayBuffer());
 await page.goto('/#/app');await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:60000});
 const result=await page.evaluate(async encoded=>{const{localRequest}=await import('/src/lib/local-store.ts' as string),{importOfficeSlides}=await import('/src/lib/office-slides.ts' as string),{exportLesson,importLesson}=await import('/src/lib/lesson-bundle.ts' as string);const{notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"PPT objects"}'})).json();const response=await importOfficeSlides(notebook.id,new File([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],'special.pptx'),true);const restored=await importLesson(new File([await exportLesson(notebook.id)],'special.kopy'));return{response,...await(await localRequest('/api/notebooks/'+restored)).json()};},await ppt.generateAsync({type:'base64'}));
 expect(result.pages[0].media.map((m:any)=>m.kind)).toEqual(['audio','youtube','spreadsheet']);expect(result.pages[0].media[1].videoId).toBe('dQw4w9WgXcQ');expect(result.pages[0].media[2].sheet.tabs[0].cells).toEqual([['12','=A1*2']]);expect(result.response.warnings.some((w:string)=>w.includes('OLE'))).toBe(true);expect(result.response.warnings.some((w:string)=>w.includes('3 playable/editable'))).toBe(true);
});
