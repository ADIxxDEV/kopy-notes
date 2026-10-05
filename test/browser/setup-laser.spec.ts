import {test,expect} from '@playwright/test';
test('teaching defaults and watermark persist; assistant sends only on explicit request',async({page})=>{
  let calls=0;await page.route('http://127.0.0.1:11434/api/generate',async route=>{calls++;expect(route.request().postDataJSON().prompt).toBe('Explain fractions');await route.fulfill({json:{response:'A fraction represents part of a whole.'}});});
  await page.goto('/');await page.getByLabel('Default pen color').fill('#aa2200');
  await page.getByLabel('Default background White').click();await page.getByLabel('Default board pattern').selectOption('grid');
  await page.getByText('Watermark, screen calibration & local AI',{exact:true}).click();
  await page.getByLabel('Enable teaching watermark').check();await page.getByLabel('Watermark text').fill('CLASSROOM');await page.getByLabel('Watermark position').selectOption('bottom-right');
  await page.getByLabel('Calibration measured millimeters').fill('25');await page.getByRole('button',{name:'Calibrate',exact:true}).click();await page.getByLabel('Enable local AI').check();
  await page.getByRole('button',{name:'Start teaching',exact:true}).click();await page.waitForURL('**/#/library');await page.goto('/#/library?new=1');await page.getByRole('button',{name:'Create & open',exact:true}).click();
  await expect(page.getByRole('button',{name:'Local assistant',exact:true})).toBeVisible();
  const profile=await page.evaluate(async()=>{const mod=await import('/src/lib/local-store.ts' as string);return (await(await mod.localRequest('/api/profile')).json()).profile;});
  expect(profile).toMatchObject({defaultPenColor:'#aa2200',boardBg:'#ffffff',boardPattern:'grid',calibrationPxPerMm:4,watermark:{enabled:true,text:'CLASSROOM',position:'bottom-right'}});
  expect(calls).toBe(0);await page.getByRole('button',{name:'Local assistant',exact:true}).click();expect(calls).toBe(0);
  await page.getByLabel('Assistant prompt').fill('Explain fractions');await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.getByText('A fraction represents part of a whole.',{exact:true})).toBeVisible();expect(calls).toBe(1);
  await page.getByRole('button',{name:'Insert answer as editable text',exact:true}).click();
  await expect.poll(()=>page.evaluate(async()=>{const mod=await import('/src/lib/local-store.ts' as string);const notebooks=(await(await mod.localRequest('/api/notebooks')).json()).notebooks;const data=await(await mod.localRequest('/api/notebooks/'+notebooks[0].id)).json();return data.pages[0].objects.some((o:any)=>o.kind==='text'&&o.text.includes('fraction'));})).toBe(true);
});
test('laser pulses on hover, fades and never becomes saved lesson ink',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Start teaching',exact:true}).click();await page.waitForURL('**/#/library');await page.goto('/#/library?new=1');await page.getByRole('button',{name:'Create & open',exact:true}).click();
  await page.getByRole('button',{name:'Laser pointer',exact:true}).click();await page.mouse.move(430,270);
  // Cover more than a full 700 ms cycle, including both the on and dim phases.
  const pixels=[];for(let i=0;i<9;i++){await page.waitForTimeout(100);pixels.push(await page.locator('canvas.kn-canvas-surface').evaluate(canvas=>{const c=canvas as HTMLCanvasElement,scale=c.width/c.clientWidth;return Array.from(c.getContext('2d')!.getImageData(435*scale,270*scale,1,1).data);}));}
  expect(new Set(pixels.map(p=>JSON.stringify(p))).size).toBeGreaterThan(1);
  await page.mouse.move(430,270);await page.mouse.down();await page.mouse.move(550,320,{steps:10});await page.mouse.up();await page.mouse.move(20,20);
  const trail:number[][]=[];for(let i=0;i<9;i++){await page.waitForTimeout(100);trail.push(await page.locator('canvas.kn-canvas-surface').evaluate(canvas=>{const c=canvas as HTMLCanvasElement,scale=c.width/c.clientWidth;return Array.from(c.getContext('2d')!.getImageData(490*scale,295*scale,1,1).data);}));}
  // A fading-only trail gets lighter monotonically; blinking also makes it brighter again.
  expect(trail.some((pixel,i)=>i>0&&pixel[1]<trail[i-1][1]-10)).toBe(true);
  await page.waitForTimeout(2000);
  expect(await page.evaluate(async()=>{const mod=await import('/src/lib/local-store.ts' as string);const notebooks=(await(await mod.localRequest('/api/notebooks')).json()).notebooks;const data=await(await mod.localRequest('/api/notebooks/'+notebooks[0].id)).json();return data.pages[0].objects.length;})).toBe(0);
});
