import {test,expect} from '@playwright/test';
test('landing is readable, responsive and opens the teaching app',async({page})=>{
 await page.goto('/');
 await expect(page).toHaveTitle(/Note3.*Note5/);
 await expect(page.locator('#landing h1')).toContainText('Your classroom.');
 expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain('SoftwareApplication');
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await page.locator('.lp-demo').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 await page.screenshot({path:'test-results/landing-phone.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/landing-desktop.png'});
 await page.getByRole('link',{name:/Start teaching/}).click();
 await expect(page.getByRole('button',{name:'Start teaching',exact:true})).toBeVisible({timeout:30000});
 await expect(page.locator('#landing')).toBeHidden();
});
test('production artwork pack is valid and has the original tool images',async({request,page})=>{
 const response=await request.get('/themes/org-note3.kopy-theme');expect(response.ok()).toBe(true);
 const pack=await response.json();expect(pack.appearance).toBe('org-note3');
 for(const icon of ['pen','eraser','select','menu','save','board'])expect(pack.icons[icon]).toMatch(/^data:image\/png;base64,/);
 await page.route('**/__local-note3-theme',route=>route.fulfill({json:pack}));
 await page.goto('/#/app');await page.getByText('Theme packs',{exact:true}).click();
 await page.getByRole('button',{name:'Apply theme org-note3',exact:true}).click();
 await page.getByRole('button',{name:'Start teaching',exact:true}).click();await page.waitForURL('**/#/library');
 await page.reload();const saved=await page.evaluate(async()=>{const {localRequest}=await import('/src/lib/local-store.ts' as string);return(await(await localRequest('/api/profile')).json()).profile.theme;});expect(saved.icons.pen).toBe(pack.icons.pen);
});
