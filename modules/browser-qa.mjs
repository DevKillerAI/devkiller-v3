function finding(error,files) {
  const message=String(error.message||error).slice(0,1000);
  const match=String(error.stack||'').match(/https?:\/\/[^/\s]+\/([^\s)]+):(\d+):(\d+)/);
  const file=match?decodeURIComponent(match[1]):null,line=match?Number(match[2]):null;
  const source=files.find(item=>item.name===file)?.content.split(/\r?\n/)[line-1]?.trim().slice(0,250);
  const missing=message.match(/^(.+?) is not defined$/);
  return {category:'funcional',status:'failed',check:'javascript-startup',
    requirement:'Start the app without interrupting JavaScript.',
    expected:'Scripts must load without exceptions and prepare the interface for use.',
    observed:missing?`Startup stopped: variable “${missing[1]}” was used before being defined.`:'The browser found an error during app startup.',
    evidence:`${message}${file?` — ${file}:${line}:${match[3]}`:''}${source?`\nCode: ${source}`:''}`,
    correction:missing?`Declare or provide “${missing[1]}” before using it and check the app again.`:'Review the location reported by the browser and run the check again.',
    file,line};
}
export async function inspectBrowser(url,files,{launch,settleMs=700,timeoutMs=20000,headers={}}={}) {
  let browser,timer,timedOut=false;
  const checks=[];
  const work=async()=>{
    let launcher=launch;
    if(!launcher){const {chromium}=await import('playwright');launcher=options=>chromium.launch(options);}
    try{browser=await launcher({headless:true,timeout:8000});}
    catch{return [{category:'ambiente',status:'failed',check:'qa-browser',requirement:'Run the browser check.',expected:'Chromium installed and accessible to the checker.',observed:'The test browser did not start. This does not prove an app defect.',evidence:'The checker could not start Chromium.',correction:'Run Preparar.ps1 to install the browser, then use Check app again.'}];}
    if(timedOut){await browser.close();return [];}
    const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',acceptDownloads:false,extraHTTPHeaders:headers});
    const page=await context.newPage();
    const origin=new URL(url).origin,errors=[],resources=new Set();
    await context.route('**/*',route=>{const target=new URL(route.request().url());return target.origin===origin?route.continue():route.abort();});
    page.on('pageerror',error=>{if(errors.length<10&&!errors.some(item=>item.message===error.message))errors.push(error);});
    page.on('response',response=>{if(response.status()>=400&&['script','stylesheet'].includes(response.request().resourceType()))resources.add(`${response.status()} ${new URL(response.url()).pathname}`);});
    try{
      await page.goto(url,{waitUntil:'load',timeout:8000});
      await page.waitForTimeout(settleMs);
      checks.push(...errors.map(error=>finding(error,files)));
      if(resources.size)checks.push({category:'funcional',status:'failed',check:'resources',requirement:'Load app scripts and styles.',expected:'Required files available.',observed:'Some script or style files did not load.',evidence:[...resources].join('; '),correction:'Fix the paths or include missing files in the package.'});
      if(!checks.length)checks.push({category:'funcional',status:'passed',check:'javascript-startup',requirement:'Start the app without interrupting JavaScript.',expected:'No JavaScript exceptions or HTTP failures in scripts and styles at startup.',observed:'No such errors were detected during initial observation.',evidence:`Chromium opened the page and observed startup for ${settleMs} ms after loading. This does not test every interaction.`});
    }catch{
      checks.push(...errors.filter(e=>!checks.some(c=>c.evidence.includes(e.message))).map(e=>finding(e,files)));
      checks.push({category:'ambiente',status:'failed',check:'qa-navigation',requirement:'Load the page in the test browser.',expected:'Navigation completed within 8 seconds.',observed:'The checker did not finish navigation. The cause is not yet known.',evidence:'The checker did not finish navigation; this is not a visual rejection.',correction:'Check the preview and repeat the check. If it persists, investigate the page and environment.'});
    }
    return checks;
  };
  try{return await Promise.race([work(),new Promise(resolve=>{timer=setTimeout(()=>{timedOut=true;resolve([{category:'ambiente',status:'failed',check:'qa-timeout',requirement:'Complete the automatic check.',expected:'Finish within 20 seconds.',observed:'The checker timed out; the app was not verified.',evidence:'Verification timed out.',correction:'Use the available preview and investigate the environment or a possible page freeze.'}]);},timeoutMs);})]);}
  catch{return [{category:'ambiente',status:'failed',check:'qa-unavailable',requirement:'Provide the browser checker.',expected:'Verification dependencies installed.',observed:'The check could not run.',evidence:'The browser module is unavailable.',correction:'Run Preparar.ps1 and repeat the check.'}];}
  finally{clearTimeout(timer);if(browser)await Promise.race([browser.close().catch(()=>{}),new Promise(resolve=>{const t=setTimeout(resolve,timedOut?1000:3000);t.unref();})]);}
}
export function summarizeQuality(checks) {
  const failures=checks.filter(q=>q.category==='funcional'&&q.status==='failed');
  if(failures.length&&failures.every(q=>q.source==='model-proposed-scenario'))return {status:'issues',message:'A proposed scenario failed. Compare its evidence with the original request before deciding what needs repair.'};
  if(checks.some(q=>q.category==='funcional'&&q.status==='failed'))return {status:'issues',message:'The app opened with a functional issue. See what needs repair below.'};
  if(checks.some(q=>q.category==='ambiente'&&['failed','pending'].includes(q.status)))return {status:'unverified',message:'The preview is available, but some checks could not finish.'};
  return {status:'basic-passed',message:'Startup checked. App-specific actions and rules still need testing.'};
}
