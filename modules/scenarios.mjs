import {filesHash} from './repair.mjs';
const actions=['click','fill','check','select','reload','text','value','count'];
export const scenarioSchema={type:'array',items:{type:'object',additionalProperties:false,properties:{requirement:{type:'string'},steps:{type:'array',items:{type:'object',additionalProperties:false,properties:{action:{type:'string',enum:actions},target:{type:'string'},value:{type:'string'}},required:['action','target','value']}}},required:['requirement','steps']}};
export function validateScenarios(input){
  if(input===undefined)return [];
  if(!Array.isArray(input)||input.length>6)throw new Error('Up to six acceptance scenarios are supported.');
  for(const scenario of input){
    if(!scenario||typeof scenario.requirement!=='string'||!scenario.requirement.trim()||scenario.requirement.length>500||!Array.isArray(scenario.steps)||!scenario.steps.length||scenario.steps.length>12)throw new Error('Invalid acceptance scenario.');
    if(!scenario.steps.some(s=>['text','value','count'].includes(s.action)))throw new Error('A scenario needs an observable assertion.');
    for(const step of scenario.steps)if(!actions.includes(step.action)||typeof step.target!=='string'||step.target.length>250||typeof step.value!=='string'||step.value.length>1000||step.action!=='reload'&&!step.target.trim()||step.action==='count'&&!/^\d{1,3}$/.test(step.value))throw new Error('Invalid acceptance step.');
  }
  return structuredClone(input);
}
export async function inspectScenarios(url,files,scenarios,{headers={},resetData=()=>{},launch,timeoutMs=20000,stepTimeout=1500}={}){
  const hash=filesHash(files),base={category:'funcional',source:'model-proposed-scenario',repairEligible:false,reviewRequired:true,artifactHash:hash};
  try{scenarios=validateScenarios(scenarios);}catch(error){return [{...base,category:'ambiente',status:'pending',check:'scenario-plan',requirement:'Provide an executable acceptance plan.',expected:'A bounded plan with observable assertions.',observed:error.message,evidence:'The proposed plan was not executed.'}];}
  if(!scenarios.length)return [];
  let browser,deadline=Date.now()+timeoutMs;
  const result=[];
  try{
    const launcher=launch||((await import('playwright')).chromium.launch.bind((await import('playwright')).chromium));
    browser=await launcher({headless:true,timeout:8000});
    for(const [i,scenario] of scenarios.entries()){
      const finding={...base,check:`acceptance-${i+1}`,requirement:scenario.requirement,expected:scenario.steps.filter(s=>['text','value','count'].includes(s.action)).map(s=>`${s.action} ${s.target}: ${s.value}`).join('; '),steps:scenario.steps};
      if(Date.now()>=deadline){result.push({...finding,category:'ambiente',status:'pending',observed:'The check budget ended.',evidence:'This scenario was not executed.'});continue;}
      resetData();const context=await browser.newContext({extraHTTPHeaders:headers,serviceWorkers:'block',acceptDownloads:false,viewport:{width:1280,height:800}});
      const origin=new URL(url).origin;await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
      const page=await context.newPage(),evidence=[];let checking=false;
      try{
        await page.goto(url,{waitUntil:'load',timeout:Math.max(1,Math.min(8000,deadline-Date.now()))});checking=true;
        for(const step of scenario.steps){
          if(Date.now()>=deadline)throw new Error('CHECK_BUDGET');
          const timeout=Math.max(1,Math.min(stepTimeout,deadline-Date.now()));page.setDefaultTimeout(timeout);
          if(step.action==='reload'){await page.reload({waitUntil:'load',timeout});evidence.push('Reloaded the page.');continue;}
          const locator=page.locator(step.target);
          if(step.action==='click')await locator.click();
          if(step.action==='fill')await locator.fill(step.value);
          if(step.action==='check')await locator.check();
          if(step.action==='select')await locator.selectOption(step.value);
          if(['text','value','count'].includes(step.action)){
            let actual,passed=false;const until=Math.min(deadline,Date.now()+timeout);
            do{actual=step.action==='count'?String(await locator.count()):step.action==='value'?await locator.inputValue():await locator.innerText();passed=actual===step.value;if(!passed)await page.waitForTimeout(50);}while(!passed&&Date.now()<until);
            evidence.push(`${step.action} ${step.target}: expected ${JSON.stringify(step.value)}, observed ${JSON.stringify(actual).slice(0,1200)}.`);
            if(!passed){
              if(step.action==='text'){
                const normalized=s=>s.replace(/\s+/g,' ').trim();
                const raw=await locator.textContent(),transform=await locator.evaluate(el=>getComputedStyle(el).textTransform);
                if(normalized(actual)===normalized(step.value)||(normalized(raw||'')===normalized(step.value)&&['uppercase','lowercase','capitalize'].includes(transform)))throw new Error('PRESENTATION_ONLY_MISMATCH: The expected text differs only in rendered whitespace or CSS text transformation. Review the assertion; this is not evidence of a broken interaction.');
              }
              throw new Error('ASSERTION_MISMATCH');
            }
          }else evidence.push(`Completed ${step.action} on ${step.target}.`);
        }
        result.push({...finding,status:'passed',observed:'The recorded scenario passed.',evidence:evidence.join('\n')});
      }catch(error){
        const presentation=error.message.startsWith('PRESENTATION_ONLY_MISMATCH');
        const environment=!checking||error.message==='CHECK_BUDGET'||error.name==='TimeoutError'||/strict mode violation|Invalid selector|Unexpected token.*selector/i.test(error.message);
        result.push({...finding,category:presentation?'visual':environment?'ambiente':'funcional',status:presentation||environment?'pending':'failed',observed:presentation?'The text assertion needs review; only presentation differed.':environment?'This scenario could not be verified.':'An action or assertion in this scenario failed.',evidence:[...evidence,error.message.slice(0,1800)].join('\n'),correction:presentation||environment?'Review the test selector and expected result before judging the app.':'Compare this scenario with the original request, then repair the confirmed behavior.'});
      }finally{await context.close();}
    }
  }catch{return [{...base,category:'ambiente',status:'pending',check:'acceptance-environment',requirement:'Run acceptance scenarios.',expected:'A working test browser.',observed:'The scenario checker was unavailable.',evidence:'No acceptance result was confirmed.'}];}
  finally{if(browser)await browser.close().catch(()=>{});resetData();}
  return result;
}
