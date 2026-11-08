import {test,expect} from '@playwright/test';
test('percurso real: iniciar, usar, persistir, atualizar, rejeitar, reiniciar e parar',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Your application.'})).toBeVisible();
  if(await page.getByRole('button',{name:'Stop',exact:false}).isEnabled()) {await page.getByRole('button',{name:'Stop',exact:false}).click();await expect(page.locator('#status')).toHaveText('Stopped');}
  const initialVersion=(await (await page.request.get('/api/state')).json()).version;
  await page.getByRole('button',{name:'Use example'}).click();
  await page.getByRole('button',{name:'Start app'}).click();
  await expect(page.locator('#status')).toHaveText('Available',{timeout:45000});
  const app=page.frameLocator('#preview');
  await expect(app.getByRole('heading',{name:'Meu dia.'})).toBeVisible();
  await app.getByLabel('Nova tarefa').fill('Validar o DevKiller');
  await app.getByRole('button',{name:'Adicionar tarefa'}).click();
  await expect(app.locator('#tasks')).toContainText('Validar o DevKiller');
  await app.getByRole('checkbox',{name:'Concluir Validar o DevKiller'}).check();
  await expect(app.locator('#progress')).toHaveText('1 de 1 concluídas');
  await page.getByRole('button',{name:'Reload preview'}).click();
  await expect(app.getByRole('checkbox',{name:'Concluir Validar o DevKiller'})).toBeChecked();
  const popupPromise=page.waitForEvent('popup');await page.getByRole('link',{name:'Open in new tab'}).click();const popup=await popupPromise;await expect(popup.getByRole('heading',{name:'Meu dia.'})).toBeVisible();await popup.close();
  await page.getByRole('button',{name:'Restart',exact:false}).click();
  await expect(page.locator('#version')).toHaveText(`v${initialVersion+2}`,{timeout:45000});
  await expect(app.getByRole('checkbox',{name:'Concluir Validar o DevKiller'})).toBeChecked();
  await app.getByRole('button',{name:'Excluir Validar o DevKiller'}).click();
  await expect(app.locator('#tasks li')).toHaveCount(0);
  await app.getByLabel('Nova tarefa').fill('   ');await app.getByRole('button',{name:'Adicionar tarefa'}).click();await expect(app.locator('#tasks li')).toHaveCount(0);
  // A syntactically valid package with an empty document fails real container health QA.
  await page.locator('#files').setInputFiles([{name:'index.html',mimeType:'text/html',buffer:Buffer.from('   ')}]);
  await page.getByRole('button',{name:'Publish new version'}).click();
  await expect(page.locator('#notice')).toContainText('did not respond',{timeout:45000});
  await expect(page.locator('#version')).toHaveText(`v${initialVersion+2}`);
  await expect(app.getByRole('heading',{name:'Meu dia.'})).toBeVisible();
  await page.locator('summary').filter({hasText:'Checks and evidence'}).click();
  await expect(page.locator('#qa')).toContainText('ENVIRONMENT · Failed');
  await page.getByRole('button',{name:'Use example'}).click();
  await page.getByRole('button',{name:'Publish new version'}).click();
  await expect(page.locator('#version')).toHaveText(`v${initialVersion+3}`,{timeout:45000});
  await expect(page.locator('#qa')).toContainText('FUNCTIONAL · Pending');
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  for(const width of [391,392]) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.getByRole('button',{name:'Stop',exact:false})).toBeVisible();
    await expect(app.getByLabel('Nova tarefa')).toBeVisible();
    const frame=await page.locator('#preview').elementHandle().then(h=>h.contentFrame());
    expect(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await app.getByLabel('Nova tarefa').fill('Testar no celular');
  await app.getByRole('button',{name:'Adicionar tarefa'}).click();
  await expect(app.locator('#tasks')).toContainText('Testar no celular');
  await page.locator('.preview-card').screenshot({path:'test-results/mobile.png'});
  await app.getByRole('button',{name:'Excluir Testar no celular'}).click();
  const stoppedUrl=(await(await page.request.get('/api/state')).json()).previewUrl;
  await page.getByRole('button',{name:'Stop',exact:false}).click();
  await expect(page.locator('#status')).toHaveText('Stopped',{timeout:20000});
  const stopped=await page.request.get(stoppedUrl);expect(stopped.status()).toBe(503);
  expect(errors).toEqual([]);
});
test('painel recusa mutação sem credencial e origem',async({request})=>{
  const response=await request.post('/api/stop',{data:{}});expect(response.status()).toBe(403);
});
