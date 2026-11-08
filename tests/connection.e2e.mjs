import {test,expect} from '@playwright/test';
test('Connections: save a model, preserve unsaved choices, reject local mode and keep secrets private',async({page,request})=>{
 const origin=`http://127.0.0.1:${process.env.DEVKILLER_PORT||4310}`;
 const state=await(await request.get('/api/state')).json();
 const post=data=>request.post('/api/connection',{headers:{Origin:origin,'X-DevKiller-Token':state.token},data});
 try{
 await page.goto('/settings');await expect(page.locator('#model')).toBeEnabled();
 await expect(page.locator('#model option')).toHaveCount(4);await expect(page.locator('#provider option[value=local]')).toBeDisabled();
 await page.locator('#model').selectOption('gpt-5.6-terra');await page.waitForResponse(r=>r.url().endsWith('/api/state'));await expect(page.locator('#model')).toHaveValue('gpt-5.6-terra');
 await page.getByRole('button',{name:'Save model'}).click();await expect(page.locator('#settings-message')).toContainText('Model saved');await page.reload();await expect(page.locator('#model')).toHaveValue('gpt-5.6-terra');
 expect((await post({provider:'local',model:'gpt-5.6-luna'})).status()).toBe(400);
 expect((await post({provider:'openai',model:'not-a-model'})).status()).toBe(400);
 expect((await(await request.get('/api/state')).json()).connection.model).toBe('gpt-5.6-terra');
 const health=await(await request.get('/api/engine?fresh=1')).json();expect(health.capacity.model).toBe('gpt-5.6-terra');
 for(const width of [1440,768,391,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 await page.screenshot({path:'test-results/connections-mobile.png',fullPage:true});
 await page.goto('/#generator');await expect(page.locator('#stack')).toHaveCount(0);await expect(page.locator('#generation-model')).toHaveText('gpt-5.6-terra');
 }finally{expect((await post({provider:'openai',model:'gpt-5.6-luna'})).ok()).toBe(true);}
});
