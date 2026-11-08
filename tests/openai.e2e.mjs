import {test,expect} from '@playwright/test';
test('chave protegida, progresso, geração, uso, erro, cancelamento e remoção',async({page})=>{
  test.skip(process.env.DEVKILLER_AI_FIXTURE!=='1','Exige servidor isolado iniciado com --import ./tests/openai-fixture.mjs.');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const fakeKey='sk-browser-test-placeholder-not-a-real-key';
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Generate app'})).toBeDisabled();
  await expect(page.locator('#api-key')).toHaveCount(0);
  await page.goto('/settings');
  await expect(page.getByLabel('OpenAI API key')).toHaveAttribute('type','password');
  await page.getByLabel('OpenAI API key').fill(fakeKey);
  await page.getByRole('button',{name:'Save key'}).click();
  await expect(page.locator('#secret-status')).toHaveText('Key saved');
  await expect(page.getByLabel('OpenAI API key')).toHaveValue('');
  await page.reload();await expect(page.locator('#secret-status')).toHaveText('Key saved');
  expect(await page.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage))).not.toContain(fakeKey);
  expect(await (await page.request.get('/api/state')).text()).not.toContain(fakeKey);
  await page.goto('/');
  await page.getByLabel('What are we building today?').fill('Crie um contador com botão para somar um');
  
  await page.getByRole('button',{name:'Generate app'}).click();
  await expect(page.locator('#generation-status')).toContainText('writing',{timeout:15000});
  await expect(page.locator('#generation-metrics')).toContainText('25 characters');
  await expect(page.getByRole('button',{name:'Generate app'})).toBeDisabled();
  await expect(page.locator('#generation-status')).toHaveText('Your app is available.',{timeout:45000});
  await expect(page.locator('#generation-metrics')).toContainText('123 input tokens + 456 output');
  const app=page.frameLocator('#preview');
  await app.getByRole('button',{name:'Salvar mais um'}).click();await expect(app.locator('#count')).toHaveText('1');
  const version=await page.locator('#version').textContent();
  expect(await (await page.request.get('/api/current-files')).text()).not.toContain(fakeKey);
  for(const [prompt,expected] of [['Teste SEM_SALDO no gerador','no balance'],['Teste CHAVE_RECUSADA no gerador','rejected the key']]) {
    await page.getByLabel('What are we building today?').fill(prompt);await page.getByRole('button',{name:'Generate app'}).click();
    await expect(page.locator('#generation-error')).toContainText(expected,{timeout:15000});
    await expect(page.locator('#version')).toHaveText(version);await expect(app.locator('#count')).toHaveText('1');
    expect(await page.locator('body').innerText()).not.toContain(fakeKey);
  }
  await page.getByLabel('What are we building today?').fill('Teste CANCELAR uma geração running');await page.getByRole('button',{name:'Generate app'}).click();
  await expect(page.locator('#generation-status')).toContainText('writing',{timeout:15000});
  await page.getByRole('button',{name:'Cancel generation'}).click();
  await expect(page.locator('#generation-status')).toHaveText('Generation cancelled.');
  await expect(page.locator('#version')).toHaveText(version);await expect(app.locator('#count')).toHaveText('1');
  await page.setViewportSize({width:392,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.generator-panel').screenshot({path:'test-results/openai-mobile.png'});
  await page.goto('/settings');await page.getByRole('button',{name:'Delete key',exact:true}).click();
  await expect(page.locator('#secret-status')).toHaveText('Not configured');await page.goto('/');await expect(page.getByRole('button',{name:'Generate app'})).toBeDisabled();
  await page.getByRole('button',{name:'Stop',exact:false}).click();await expect(page.locator('#status')).toHaveText('Stopped');
  expect(errors).toEqual([]);
});
