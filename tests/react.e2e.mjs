import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {reactFiles} from './react-fixture.mjs';
test('React: gerar, compilar, salvar, consultar files, falhar sem perder preview e corrigir a fonte certa',async({page,request})=>{
 test.skip(process.env.DEVKILLER_AI_FIXTURE!=='1','Instância isolada, sem cobrança real.');
 const origin=`http://127.0.0.1:${process.env.DEVKILLER_PORT||4310}`;
 async function post(route,data={}){const s=await(await request.get('/api/state')).json();return request.post(route,{headers:{Origin:origin,'X-DevKiller-Token':s.token},data});}
 await post('/api/openai/key',{apiKey:'sk-browser-test-placeholder-not-a-real-key'});
 await page.goto('/');await page.locator('#app-prompt').fill('Crie um contador React com persistência local');await page.locator('#generate').click();
 await expect(page.locator('#generation-status')).toHaveText('Your app is available.',{timeout:45000});
 const frame=page.frameLocator('#preview');await expect(frame.getByRole('heading',{name:'React com banco local'})).toBeVisible();await frame.getByRole('button',{name:'Salvar mais um'}).click();await expect(frame.locator('#count')).toHaveText('1');
 const state=await(await request.get('/api/state')).json(),id=state.project.id;
 const source=await(await request.get(`/api/source?project=${id}&version=1`)).json();expect(source.files.some(f=>f.name==='src/App.jsx')).toBe(true);expect(source.files.some(f=>f.name==='package-lock.json')).toBe(true);expect(source.artifact.compiled).toBe(true);
 expect(await fs.readFile(source.folder+'source/src/App.jsx','utf8')).toContain('export default function App');expect(await fs.readFile(source.folder+'preview/index.html','utf8')).toContain('assets/');
 await page.getByRole('button',{name:'Refresh list'}).click();await page.locator('#project-list article').filter({hasText:'React com banco local'}).first().getByRole('button',{name:'Details and versions'}).click();await page.getByRole('button',{name:'View files',exact:true}).click();await expect(page.locator('#source-code')).toContainText('useEffect');
 const bad=reactFiles.map(f=>({...f,content:f.content.replace('export default function App()','export default function App(')}));const failure=await post('/api/start',{files:bad,stack:'react-v1'});expect(failure.ok()).toBe(false);
 await expect(page.getByRole('button',{name:'Repair this attempt’s code'})).toBeEnabled();await expect(frame.locator('#count')).toHaveText('1');expect((await(await request.get('/api/state')).json()).active.version).toBe(state.active.version);
 await page.getByRole('button',{name:'Repair this attempt’s code'}).click();await expect(page.locator('#repair-status')).toContainText('did not appear',{timeout:45000});await expect(frame.locator('#count')).toHaveText('1');
 const repaired=await(await request.get('/api/state')).json();expect(repaired.repair.baseRevision).toBe(2);expect(repaired.project.revision).toBe(3);
 await page.getByRole('button',{name:'Restore previous version'}).click();await expect(frame.locator('#count')).toHaveText('1');
 const reopened=await post('/api/projects/open',{id,version:3});expect(reopened.ok()).toBe(true);expect((await reopened.json()).preparation.cached).toBe(true);
 const final=await(await request.get(`/api/projects/${id}`)).json();expect(final.jobs).toHaveLength(2);expect(final.versions).toHaveLength(3);
 await page.locator('#folder').setInputFiles(source.folder+'source');await expect(page.locator('#file-summary')).toContainText('src/App.jsx');
 const importing=page.waitForResponse(r=>r.url().endsWith('/api/start')&&r.request().method()==='POST');await page.locator('#start').click();expect((await importing).ok()).toBe(true);await expect(frame.locator('#count')).toHaveText('1');
 await post('/api/stop');await post('/api/openai/clear');
});
