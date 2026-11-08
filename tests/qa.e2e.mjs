import {test,expect} from '@playwright/test';
test('o próprio painel detecta erro de inicialização, explica e mantém preview acessível',async({page})=>{
  await page.goto('/');
  const html='<!doctype html><h1>Jogo de teste</h1><div id="board"></div><script src="app.js" defer></script>';
  const js="'use strict';\njogoAtivo = true;\ndocument.getElementById('board').textContent='Inicializado';";
  await page.locator('#files').setInputFiles([{name:'index.html',mimeType:'text/html',buffer:Buffer.from(html)},{name:'app.js',mimeType:'text/javascript',buffer:Buffer.from(js)}]);
  await page.locator('#start').click();
  await expect(page.locator('#status')).toHaveText('Opened with an error',{timeout:45000});
  await expect(page.locator('#quality-summary')).toContainText('functional issue');
  await expect(page.locator('#quality-findings')).toContainText('jogoAtivo');
  await expect(page.locator('#quality-findings')).toContainText('app.js:2');
  await expect(page.locator('#quality-findings')).toContainText('Next step');
  await expect(page.frameLocator('#preview').getByRole('heading',{name:'Jogo de teste'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Open in new tab'})).toHaveAttribute('aria-disabled','false');
  await page.getByRole('button',{name:'Check app'}).click();
  await expect(page.locator('#status')).toHaveText('Opened with an error',{timeout:30000});
  await page.locator('.auto-diagnostic').screenshot({path:'test-results/diagnostico-automatico.png'});
  await page.getByRole('button',{name:'Stop',exact:false}).click();await expect(page.locator('#status')).toHaveText('Stopped');
});
