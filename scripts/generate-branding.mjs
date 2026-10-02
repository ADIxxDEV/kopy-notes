// Regenerates checked-in raster assets from the original SVG. No network or image service.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from '@playwright/test';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=await readFile(path.join(root,'public/icon.svg'),'utf8');
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
try {
  const page=await browser.newPage();
  const raster=async(size,maskable=false)=>{
    const svg=maskable?source.replace('rx="28"','rx="0"'):source;
    const data=await page.evaluate(async({svg,size})=>{
      const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(svg);await image.decode();
      const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
      canvas.getContext('2d').drawImage(image,0,0,size,size);return canvas.toDataURL('image/png').split(',')[1];
    },{svg,size});
    return Buffer.from(data,'base64');
  };
  await writeFile(path.join(root,'public/icon-192.png'),await raster(192));
  await writeFile(path.join(root,'public/icon-512.png'),await raster(512));
  await writeFile(path.join(root,'public/icon-maskable-512.png'),await raster(512,true));
  const densities={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
  for(const [density,size] of Object.entries(densities)){
    const folder=path.join(root,'branding/android',`mipmap-${density}`);await mkdir(folder,{recursive:true});
    const png=await raster(size);await writeFile(path.join(folder,'ic_launcher.png'),png);await writeFile(path.join(folder,'ic_launcher_round.png'),png);
  }
  // ICO directory entries embed lossless PNG frames, supported by modern Windows.
  const sizes=[16,24,32,48,64,128,256],frames=await Promise.all(sizes.map(size=>raster(size)));
  const directory=Buffer.alloc(6+16*sizes.length);directory.writeUInt16LE(1,2);directory.writeUInt16LE(sizes.length,4);
  let offset=directory.length;
  for(let i=0;i<sizes.length;i++){
    const entry=6+i*16;directory[entry]=sizes[i]===256?0:sizes[i];directory[entry+1]=directory[entry];
    directory.writeUInt16LE(1,entry+4);directory.writeUInt16LE(32,entry+6);directory.writeUInt32LE(frames[i].length,entry+8);directory.writeUInt32LE(offset,entry+12);offset+=frames[i].length;
  }
  await writeFile(path.join(root,'branding/icon.ico'),Buffer.concat([directory,...frames]));
  await copyFile(path.join(root,'branding/logo.svg'),path.join(root,'public/logo.svg'));
  await page.setViewportSize({width:840,height:208});await page.setContent('<body style="margin:0;background:#fff7e8">'+(await readFile(path.join(root,'branding/logo.svg'),'utf8')).replace('width="420" height="104"','width="840" height="208"')+'</body>');
  await page.screenshot({path:path.join(root,'branding/logo-preview.png')});
  console.log('Generated PWA, Windows, and five Android density icons from public/icon.svg.');
} finally {await browser.close();}
