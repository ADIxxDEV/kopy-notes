import {test,expect} from '@playwright/test';

test('every toolbar glyph parses and renders inside its SVG viewport',async({page})=>{
  const errors:string[]=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/');
  const invalid=await page.evaluate(async()=>{
    const icon=await import('/src/components/Icon.tsx' as string);
    const glyph=await import('/src/components/board/ToolGlyph.tsx' as string);
    const records=[...Object.entries(icon.ICON_PATHS).map(([name,paths])=>({name,paths:paths as string[],size:24})),...Object.entries(glyph.TOOL_GLYPH_PATHS).map(([name,path])=>({name,paths:[path as string],size:32}))];
    const invalid:string[]=[];
    for(const record of records){
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${record.size} ${record.size}`);document.body.append(svg);
      for(const d of record.paths){const p=document.createElementNS(svg.namespaceURI,'path') as SVGPathElement;p.setAttribute('d',d);svg.append(p);const length=p.getTotalLength(),box=p.getBBox();if(!(length>0)||!Number.isFinite(length)||box.x < -2||box.y < -2||box.x+box.width>record.size+2||box.y+box.height>record.size+2)invalid.push(record.name);}
      svg.remove();
    }
    return invalid;
  });
  expect(invalid).toEqual([]);expect(errors).toEqual([]);
});

test('all shape renderers produce visible outlines and separate fill pixels',async({page})=>{
  await page.goto('/');
  const drawn=await page.evaluate(async()=>{
    const {drawShape}=await import('/src/lib/render.ts' as string);
    const shapes=['line','arrow','rect','ellipse','circle','triangle','righttriangle','star','diamond','parallelogram','trapezoid','pentagon','hexagon'];
    return shapes.map(shape=>{
      const canvas=document.createElement('canvas');canvas.width=180;canvas.height=180;const ctx=canvas.getContext('2d')!;
      drawShape(ctx,{id:'s',kind:'shape',shape,x:30,y:30,w:120,h:120,color:'#ff0000',fillColor:'#00ff00',width:4,filled:true,rotation:0,dash:'solid'});
      const data=ctx.getImageData(0,0,180,180).data;let red=0,green=0;for(let i=0;i<data.length;i+=4){if(data[i]>200&&data[i+1]<20&&data[i+3]>100)red++;if(data[i+1]>200&&data[i]<20&&data[i+3]>100)green++;}
      return {shape,outlined:red>20,filled:green>100};
    });
  });
  expect(drawn.every(s=>s.outlined)).toBe(true);
  expect(drawn.filter(s=>!['line','arrow'].includes(s.shape)).every(s=>s.filled)).toBe(true);
});

test('hatched fills clip to their shape, rounded corners and dotted strokes remain visible',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const {drawShape}=await import('/src/lib/render.ts' as string);
    function render(fillStyle:string,roundness=0,dash='solid'){
      const c=document.createElement('canvas');c.width=180;c.height=180;const ctx=c.getContext('2d')!;
      drawShape(ctx,{id:'s',kind:'shape',shape:'rect',x:30,y:30,w:120,h:120,color:'#ff0000',fillColor:'#00ff00',width:3,filled:true,rotation:0,fillStyle,roundness,dash});
      const data=ctx.getImageData(0,0,180,180).data;let green=0,outside=0,red=0;
      for(let y=0;y<180;y++)for(let x=0;x<180;x++){const i=(y*180+x)*4;if(data[i+1]>200&&data[i]<20&&data[i+3]>100){green++;if(x<30||x>150||y<30||y>150)outside++;}if(data[i]>200&&data[i+1]<20&&data[i+3]>100)red++;}
      return {green,outside,red,cornerAlpha:ctx.getImageData(32,32,1,1).data[3]};
    }
    return {solid:render('solid'),hatched:render('hachure'),crosshatched:render('crosshatch'),rounded:render('solid',24),dashed:render('solid',0,'dashed'),dotted:render('solid',0,'dotted')};
  });
  expect(result.hatched.green).toBeGreaterThan(100);expect(result.hatched.green).toBeLessThan(result.solid.green);
  expect(result.crosshatched.green).toBeGreaterThan(result.hatched.green);expect(result.crosshatched.green).toBeLessThan(result.solid.green);
  expect(result.hatched.outside+result.crosshatched.outside).toBe(0);
  expect(result.rounded.cornerAlpha).toBe(0);expect(result.solid.cornerAlpha).toBeGreaterThan(0);
  expect(result.dashed.red).toBeGreaterThan(10);expect(result.dotted.red).toBeGreaterThan(10);expect(result.dotted.red).toBeLessThan(result.solid.red);
});
