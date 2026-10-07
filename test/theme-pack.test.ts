import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILTIN_THEMES,parseThemePack,controlContrast,fitThemeRaster} from '../src/lib/theme-pack';
test('portable themes retain embedded artwork and reject executable or remote resources',()=>{
  const image='data:image/png;base64,aGVsbG8=';
  const theme={...BUILTIN_THEMES[0],icons:{pen:image},boards:[{...BUILTIN_THEMES[0].boards[0],image}]};
  assert.deepEqual(parseThemePack(JSON.parse(JSON.stringify(theme))),theme);
  for(const source of ['https://example.com/pen.png','javascript:alert(1)','data:image/svg+xml;base64,PHN2Zy8+'])assert.throws(()=>parseThemePack({...theme,icons:{pen:source}}));
  assert.throws(()=>parseThemePack({...theme,version:2}));
  assert.throws(()=>parseThemePack({...theme,colors:{...theme.colors,ink:'url(secret)'}}));
  assert.notEqual(controlContrast('#ffffff').panel,controlContrast('#000000').panel);
});

test('oversized raster automatically compresses without reducing dimensions when WebP fits',()=>{
 const sizes:number[][]=[],calls:string[]=[];const canvas={width:0,height:0,toDataURL:(format:string,quality?:number)=>{calls.push(format);return format==='image/webp'&&quality!<=.78?'data:image/webp;base64,aGVsbG8=':'data:image/png;base64,'+'a'.repeat(750000);}};
 const result=fitThemeRaster(canvas,(w,h)=>sizes.push([w,h]),1280,720);
 assert.equal(result,'data:image/webp;base64,aGVsbG8=');assert.deepEqual(sizes,[[1280,720]]);assert.ok(calls.includes('image/webp'));
});
test('unsupported WebP encoding falls back to smaller lossless PNG and keeps proportions',()=>{
 const sizes:number[][]=[];const canvas={width:0,height:0,toDataURL:()=>canvas.width<700?'data:image/png;base64,aGVsbG8=':'data:image/png;base64,'+'a'.repeat(750000)};
 assert.ok(fitThemeRaster(canvas,(w,h)=>sizes.push([w,h]),1280,720).length<750000);
 assert.ok(sizes.length>1);assert.ok(sizes.every(([w,h])=>Math.abs(w/h-1280/720)<.01));
});
test('small raster keeps original lossless format and dimensions',()=>{
 const canvas={width:0,height:0,toDataURL:()=> 'data:image/png;base64,aGVsbG8='};let draws=0;
 fitThemeRaster(canvas,()=>draws++,240,120);assert.equal(draws,1);assert.equal(canvas.width,240);assert.equal(canvas.height,120);
});
