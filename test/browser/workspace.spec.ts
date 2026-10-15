import {test,expect,type Page} from '@playwright/test';
import {selectOption} from '../helpers/custom-select';
async function library(page:Page){
  await page.goto('/#/app');await page.getByRole('button',{name:'Start teaching',exact:true}).waitFor();
  await page.evaluate(async()=>{
    const {localRequest}=await import('/src/lib/local-store.ts' as string);
    await localRequest('/api/profile',{method:'PUT',body:JSON.stringify({onboarded:1,teacherName:'Teacher'})});
    for(const [title,subject] of [['Geometry','Mathematics'],['Atoms','Chemistry'],['Waves','Physics']])await localRequest('/api/notebooks',{method:'POST',body:JSON.stringify({title,subject,coverColor:'#526677'})});
  });
  await page.goto('/#/library');await page.reload();await expect(page.getByRole('heading',{name:'Your lessons',exact:true})).toBeVisible({timeout:60000});
}
test('lesson search, filters, sort and remembered layout work together',async({page})=>{
  await library(page);const cards=page.locator('.kn-lesson-card');await expect(cards).toHaveCount(3);expect(await cards.first().locator('h3').evaluate(el=>{const probe=document.createElement('span');probe.style.color='var(--color-ink)';document.body.append(probe);const correct=getComputedStyle(el).color===getComputedStyle(probe).color;probe.remove();return correct;})).toBe(true);
  await page.getByLabel('Search lessons').fill('geom');await expect(cards).toHaveCount(1);await expect(cards.first()).toContainText('Geometry');
  await page.getByRole('button',{name:'Clear search'}).click();await selectOption(page.getByLabel('Filter by subject'),'Chemistry');await expect(cards).toHaveCount(1);
  await page.getByLabel('Search lessons').fill('missing');await expect(page.getByText('No matching lessons')).toBeVisible();await page.getByRole('button',{name:'Clear filters'}).click();
  await selectOption(page.getByLabel('Sort lessons'),'title');await expect(cards.first()).toContainText('Atoms');
  await page.getByRole('button',{name:'List view',exact:true}).click();await page.reload();await expect(page.getByRole('button',{name:'List view'})).toHaveAttribute('aria-pressed','true');
  await cards.first().getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('button',{name:'Keep lesson'}).click();await expect(cards).toHaveCount(3);
});
test('settings preserve unsaved edits across categories and persist after saving',async({page})=>{
  await library(page);await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Teacher name').fill('Updated teacher');
  const nav=page.getByRole('navigation',{name:'Settings categories'});await nav.getByRole('button',{name:'Board & tools',exact:true}).click();await expect(page.getByLabel('Default board pattern')).toBeVisible();
  await nav.getByRole('button',{name:'Storage & backup',exact:true}).click();await nav.getByRole('button',{name:'Profile',exact:true}).click();await expect(page.getByLabel('Teacher name')).toHaveValue('Updated teacher');
  await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByText('Updated teacher', {exact:false})).toBeVisible();await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByLabel('Teacher name')).toHaveValue('Updated teacher');
});
test('library and settings fit phone, portrait tablet and smartboard widths',async({page})=>{
  await library(page);
  for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1920,height:1080}]){
    await page.setViewportSize(viewport);await expect(page.getByRole('button',{name:'New lesson',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Settings',exact:true}).click();const nav=page.getByRole('navigation',{name:'Settings categories'});
    await nav.getByRole('button',{name:'Board & tools',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await nav.getByRole('button',{name:'Profile',exact:true}).click();await page.screenshot({path:`test-results/settings-${viewport.width}.png`});
    await page.getByRole('button',{name:'Back to lessons',exact:true}).click();await page.screenshot({path:`test-results/library-${viewport.width}.png`});
  }
});

test('in-lesson settings keep current-page controls separate from defaults',async({page})=>{
  await library(page);await page.locator('.kn-lesson-card').first().getByRole('button').first().click();await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible({timeout:60000});
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();const settings=page.getByRole('dialog',{name:'Settings',exact:true});await expect(settings).toBeVisible();
  await settings.getByRole('navigation',{name:'Settings categories'}).getByRole('button',{name:'Current page',exact:true}).click();await expect(settings.getByLabel('Board color',{exact:true})).toBeVisible();
  await settings.getByRole('navigation',{name:'Settings categories'}).getByRole('button',{name:'Profile',exact:true}).click();await expect(settings.getByText('App / profile name',{exact:true})).toBeVisible();
  await settings.getByRole('button',{name:'Save',exact:true}).click();await expect(settings).toHaveCount(0);await expect(page.getByRole('button',{name:'Pen',exact:true})).toBeVisible({timeout:60000});
});
