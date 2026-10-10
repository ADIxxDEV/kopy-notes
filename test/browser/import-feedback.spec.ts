import {test,expect,type Page} from '@playwright/test';
import {jsPDF} from 'jspdf';
import JSZip from 'jszip';
async function board(page:Page){
 await page.goto('/#/app');
 const id=await page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);await localRequest('/api/profile',{method:'PUT',body:'{"onboarded":1}'});const {notebook}=await(await localRequest('/api/notebooks',{method:'POST',body:'{"title":"Import tests"}'})).json();return notebook.id;});
 await page.goto('/#/board/'+id);await page.getByRole('button',{name:'Import file',exact:true}).waitFor({timeout:30000});return id;
}
const read=(page:Page,id:string)=>page.evaluate(async(id)=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);return(await(await localRequest('/api/notebooks/'+id)).json()).pages;},id);
test('damaged PDF shows an actionable error and a 301-page textbook imports through the panel',async({page})=>{
 test.setTimeout(180000);
 const id=await board(page);await page.getByRole('button',{name:'Import file',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Import to board'});
 await dialog.locator('input[type=file]').setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a pdf')});
 await dialog.getByRole('button',{name:'Import',exact:true}).click();
 await expect(dialog.locator('.kn-import-file')).toContainText('damaged or incomplete',{timeout:30000});
 await expect(dialog.getByRole('button',{name:'Import',exact:true})).toBeEnabled();
 await dialog.getByRole('button',{name:'Remove',exact:true}).click();
 const pdf=new jsPDF({unit:'pt',format:[300,400]});pdf.text('First textbook page',20,30);for(let i=2;i<=301;i++){pdf.addPage();pdf.text('Chapter page '+i,20,30);}
 await dialog.locator('input[type=file]').setInputFiles({name:'textbook.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf.output('arraybuffer'))});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/import-phone.png'});
 await page.setViewportSize({width:1280,height:900});
 await dialog.getByRole('button',{name:'Import',exact:true}).click();
 await expect(dialog).toHaveCount(0,{timeout:90000});
 const pages=await read(page,id);expect(pages).toHaveLength(302);expect(pages[1].media[0]).toMatchObject({kind:'pdf',pageNumber:1,numPages:301});
 await page.reload();await page.getByRole('button',{name:'Pen',exact:true}).waitFor({timeout:30000});expect((await read(page,id))).toHaveLength(302);
});
test('mixed PDF and DOCX imports keep current-page media and reveal the new PDF slide',async({page})=>{
 test.setTimeout(120000);
 const id=await board(page);await page.getByRole('button',{name:'Import file',exact:true}).click();
 const docx=new JSZip();docx.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');docx.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');docx.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Teacher notes import</w:t></w:r></w:p></w:body></w:document>');
 const pdf=new jsPDF();pdf.text('PDF lesson',20,30);pdf.addPage();pdf.text('Second page',20,30);
 const dialog=page.getByRole('dialog',{name:'Import to board'});await dialog.locator('input[type=file]').setInputFiles([{name:'notes.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await docx.generateAsync({type:'nodebuffer'})},{name:'slides.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf.output('arraybuffer'))}]);
 await dialog.getByRole('button',{name:'Import',exact:true}).click();await expect(dialog).toHaveCount(0,{timeout:60000});
 const pages=await read(page,id);expect(pages).toHaveLength(3);expect(pages[0].media[0].kind).toBe('docx');expect(pages[1].media[0].kind).toBe('pdf');
 await expect(page.getByRole('button',{name:'Open slides',exact:true})).toHaveText('2 / 3');
 await page.reload();await page.getByRole('button',{name:'Pen',exact:true}).waitFor({timeout:30000});expect((await read(page,id))[0].media[0].kind).toBe('docx');
});
