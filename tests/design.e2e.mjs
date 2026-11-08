import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test('novo perfil: resposta simulada, files, ícones, gráfico com dados salvos e tela estreita',async({page,request})=>{
 test.skip(process.env.DEVKILLER_AI_FIXTURE!=='1','Somente instância isolada com provedor simulado.');
 const origin=`http://127.0.0.1:${process.env.DEVKILLER_PORT||4310}`;
 async function post(route,data={}){const s=await(await request.get('/api/state')).json();return request.post(route,{headers:{Origin:origin,'X-DevKiller-Token':s.token},data});}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await post('/api/projects/new');await post('/api/openai/key',{apiKey:'sk-browser-test-placeholder-not-a-real-key'});
 await page.goto('/');await expect(page.locator('#stack')).toHaveCount(0);
 await page.locator('#app-prompt').fill('Crie um contador com gráfico de barras e ícones, com salvamento local');await page.locator('#generate').click();
 await expect(page.locator('#generation-status')).toHaveText('Your app is available.',{timeout:60000});
 const frame=page.frameLocator('#preview');await expect(frame.locator('.lucide')).toBeVisible();
 await expect(frame.locator('.recharts-surface')).toBeVisible();await expect(frame.locator('.recharts-bar-rectangle').first()).toBeVisible();
 await frame.getByRole('button',{name:'Salvar mais um'}).click();await expect(frame.locator('#count')).toHaveText('1');await expect(frame.getByRole('row').filter({hasText:'Salvos'})).toContainText('1');
 const s=await(await request.get('/api/state')).json();const id=s.project.id;
 const source=await(await request.get(`/api/source?project=${id}&version=1`)).json();expect(source.stack).toBe('react-v3');
 const pkg=JSON.parse(source.files.find(f=>f.name==='package.json').content);expect(pkg.dependencies.recharts).toBe('3.10.1');expect(pkg.dependencies['lucide-react']).toBe('1.45.0');expect(source.artifact.compiler).toBe('devkiller-react:3');
 expect(await fs.readFile(source.folder+'source/src/components/Trend.jsx','utf8')).toContain("from 'recharts'");
 const environment=JSON.parse(source.environment);expect(environment.build.versions.recharts).toBe('3.10.1');
 const preview=await page.context().newPage();preview.on('pageerror',e=>errors.push(e.message));await preview.goto(s.previewUrl);
 for(const width of [1440,391,320]){await preview.setViewportSize({width,height:850});await expect(preview.locator('.recharts-surface')).toBeVisible();await expect.poll(()=>preview.locator('.recharts-surface').evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(200);await expect.poll(()=>preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);}
 await preview.reload();await expect(preview.locator('#count')).toHaveText('1');
 expect((await post('/api/projects/open',{id,version:1})).ok()).toBe(true);const reopened=await(await request.get('/api/state')).json();expect(reopened.preparation.cached).toBe(true);
 const jobs=(await(await request.get(`/api/projects/${id}`)).json()).jobs;expect(jobs).toHaveLength(1);expect(jobs[0].designVersion).toBe('design-v5');expect(jobs[0].limits).toMatchObject({outputTokens:20000,seconds:180,calls:1});expect(errors).toEqual([]);
 await preview.close();
 }finally{await post('/api/projects/new');await post('/api/openai/clear');}
});
