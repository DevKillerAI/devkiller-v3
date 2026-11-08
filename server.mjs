import {observationImages} from './modules/observation-cycle.mjs';
import {serveDesignFont,exportDesignFonts} from './modules/design-fonts.mjs';
import {appSpecEnabled,createAppSpec,requirementReport} from './modules/app-spec.mjs';
import {tasteStatus,DEFAULT_TASTE_MODE,validateTasteMode} from './modules/taste.mjs';
import {editContext as buildEditContext} from './modules/edit-context.mjs';
import {inspectBackendBuild} from './modules/backend-preflight.mjs';
import {chooseStack,hydrateComponents} from './modules/extended-stacks.mjs';
import {polishDesign} from './modules/design-polish.mjs';
import {imageBriefs,inspectMedia,preparePolishMedia,refineOnce,refinementAccepted,DESIGN_PROCESS_VERSION} from './modules/design-process.mjs';
import {generateModular} from './modules/modular-generation.mjs';
import {loadGenerationProfile,generationProfile as resolveGenerationProfile} from './modules/generation-profile.mjs';
import {planProduct,assessRequirementMap,PRODUCT_BUDGET} from './modules/product-plan.mjs';
import http from 'node:http';
import {reviewRenderedApp} from './modules/visual-review.mjs';
import {ConnectionStore,DEFAULT_MODEL,MODELS,validateModel} from './modules/connection.mjs';
import {EngineHealth} from './modules/engine-health.mjs';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID,createHash } from 'node:crypto';
import { DockerRuntime } from './modules/docker.mjs';
import { validateFiles } from './modules/files.mjs';
import { inspectPreview } from './modules/qa.mjs';
import { generateApp, repairApp, repairInput, generationInstructions,validateKey, validatePrompt, MODEL, OUTPUT_LIMIT, GENERATION_LIMITS } from './modules/openai.mjs';
import {DESIGN_VERSION} from './modules/design.mjs';
import { filesHash, compareRepair, reserveRepairAttempt } from './modules/repair.mjs';
import { SecretStore } from './modules/secrets.mjs';
import { inspectBrowser, summarizeQuality } from './modules/browser-qa.mjs';
import { ProjectStore } from './modules/projects.mjs';
import {RunStore,executeGeneration} from './modules/orchestrator.mjs';
import {validateKnowledgeMode} from './modules/knowledge.mjs';
import {StageKnowledge,stageContext} from './modules/stage-knowledge.mjs';
import {generationContract} from './modules/openai.mjs';
import {inspectScenarios} from './modules/scenarios.mjs';
import { serveAppData } from './modules/app-data.mjs';
import {AppCompiler,BUILD_LIMITS,buildLimits} from './modules/compiler.mjs';
import {validateSource,stackProfile,STACKS,STATIC,REACT_DESIGN,REACT_STUDIO,REACT_PRO,isReact,isCompiled} from './modules/stacks.mjs';
import {converse,editContext} from './modules/product-assistant.mjs';
import {reviseApp,revisionInput} from './modules/openai.mjs';
import {WorkerPool} from './modules/workers.mjs';
import {MediaLibrary} from './modules/media.mjs';
import {targetedEdit,verifyVisual,isNewFailure,EDIT_LIMITS} from './modules/targeted-edit.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.DEVKILLER_PORT || 4310);
const previewPort = Number(process.env.DEVKILLER_PREVIEW_PORT || 4311);
const comparisonPort = Number(process.env.DEVKILLER_COMPARISON_PORT || port+4);
const origin = `http://127.0.0.1:${port}`;
const configScope=process.env.DEVKILLER_CONFIG_SCOPE||String(port);if(!/^\d+$/.test(configScope))throw Error('Invalid configuration scope');
const workerId=process.env.DEVKILLER_WORKER_ID||null;
const projects = new ProjectStore(path.join(root,'projects',String(port)));
const runs=new RunStore(projects);
const media=new MediaLibrary(projects);
const projectServers = new Map();
let currentProjectId=null,currentRevision=null;
const qaMemory=new Map(),comparisonMemory=new Map();
const token = randomUUID();
const runtime = new DockerRuntime(root,String(port));
const compiler=new AppCompiler(runtime);
const session = randomUUID().slice(0,8);
const state = {status:'stopped', active:null, version:0, busy:true, events:[], qa:[], lastError:null, expiresAt:null, environment:null};
let lastFiles = null;
let apiKey = '';
const secrets = new SecretStore(path.join(root,'.secrets',configScope));
let secretError = null;
const connectionStore=new ConnectionStore(path.join(root,'settings',configScope));
const knowledge=new StageKnowledge(path.join(root,'settings',configScope,'knowledge'));
let knowledgeController=null;
let connection={provider:'openai',model:DEFAULT_MODEL},connectionError=null;
let generationController = null;
let activeGenerationProfile=await loadGenerationProfile(path.join(root,'settings',configScope));
state.generation = null;
state.quality = null;
state.repair = null;
state.preparation=null;state.repairTarget=null;
let alternative = null;
let repairController = null;
let currentRequest = null;
const tracked = new Set();
const lifetime = 30 * 60 * 1000;
async function discard(name) {
  await runtime.remove(name);
  tracked.delete(name);
  const runtimeRoot = path.resolve(root,'.runtime');
  const folder = path.resolve(runtimeRoot,name);
  if (!name.startsWith('devkiller-') || path.dirname(folder) !== runtimeRoot) throw new Error('Invalid cleanup path.');
  await fs.rm(folder,{recursive:true,force:true});
}
function persistJob(job){if(job?.projectId)projects.job(job.projectId,job);}
function persistenceFailure(error){state.storageError='Could not save on this PC: '+error.message;}
const log = (message, kind='info') => {
  state.events.unshift({time:new Date().toISOString(),message,kind}); state.events = state.events.slice(0,60);
  const id=state.generation?.status==='running'?state.generation.projectId:currentProjectId;
  if(id)try{projects.event(id,message,kind);}catch(error){persistenceFailure(error);}
};
const json = (res, code, data) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
const pool=workerId?null:new WorkerPool(root,String(port),{mainBusy:()=>state.busy});
const snapshot = () => ({...state,designAssistance:tasteStatus(),generationProfile:activeGenerationProfile,workerId,workerPoolAvailable:!workerId, project:currentProjectId?{...projects.info(currentProjectId),revision:currentRevision}:null, originalPrompt:currentRequest,comparison:alternative?{url:projectServers.get('compare:'+alternative.active.projectId)?.url||`http://127.0.0.1:${comparisonPort}/`,kind:alternative.kind,version:alternative.active.version}:null, connection:{...connection,error:connectionError,models:MODELS,localAvailable:false},openai:{configured:!!apiKey,model:connection.model,maxOutputTokens:OUTPUT_LIMIT,storage:'windows-dpapi',error:secretError}, active:state.active ? {version:state.active.version} : null, previewUrl:state.active ? projectServers.get(state.active.projectId)?.url||`http://127.0.0.1:${previewPort}/` : null, limits:{memory:'128 MB',cpu:'0.5 CPU',time:'30 minutes',attempts:1}});

async function ensureProjectServer(id,compare=false){
  const key=(compare?'compare:':'')+id;if(projectServers.has(key))return;
  const info=projects.info(id),requested=compare?0:info.previewPort||0;
  const entry={port:requested};
  const instance=createPreviewServer(()=>{const target=compare?alternative?.active:state.active;return target?.projectId===id?target:null;},()=>entry.port,{projectId:id});
  try{await new Promise((resolve,reject)=>{instance.once('error',reject);instance.listen(requested,'127.0.0.1',resolve);});}
  catch{instance.close();throw new Error('Could not open this project’s reserved address. Its database and files are still saved.');}
  entry.port=instance.address().port;entry.url=`http://127.0.0.1:${entry.port}/`;entry.server=instance;
  projectServers.set(key,entry);if(!compare)projects.update(id,{previewPort:entry.port});
}

async function prepareVersion(files,{projectId,revision,stack}){
  const cached=projectId&&revision?projects.artifact(projectId,revision):null;
  state.preparation={status:'running',stack,startedAt:Date.now(),limits:buildLimits(stack),message:'Preparing app files…'};
  try{
    if(isCompiled(stack)){state.status='building';if(state.generation?.status==='running')state.generation.stage='building';if(state.repair?.status==='running')state.repair.stage='building';}
    const result=cached||await compiler.prepare(files,{stack,onProgress:message=>{state.preparation.message=message;log(message);}});
    if(!cached&&(await media.manifest(projectId)).assets.length){const index=result.files.find(f=>f.name==='index.html');if(index)index.content=index.content.replace('</body>','<script src="/__devkiller/photo-credits.js"></script></body>');}
    if(projectId&&revision&&!cached)projects.saveArtifact(projectId,revision,result);
    state.preparation={...state.preparation,status:'completed',finishedAt:Date.now(),cached:!!cached,message:cached?'Built files restored from this PC.':'Files built for the browser.',compiler:result.compiler||null,versions:result.versions||null};
    return result.files;
  }catch(error){state.preparation={...state.preparation,status:'failed',finishedAt:Date.now(),message:error.message,checks:error.checks||[]};throw error;}
}

async function runRepair(base,diagnostics,originalPrompt){
  const job=state.repair,controller=repairController;
  let name=null,published=false;
  try{
    state.environment=await runtime.check();controller.signal.throwIfAborted();
    if(!state.environment.ready)throw new Error(state.environment.message+' No AI call was made.');
    const buildReady=await compiler.check(job.stack||STATIC);if(!buildReady.ready)throw new Error(buildReady.message);
    job.stage='retrieving';
    const query=(originalPrompt+'\n'+diagnostics.filter(d=>d.status==='failed').map(d=>`${d.requirement} ${d.observed} ${d.correction||''}`).join('\n')).slice(0,8000);
    job.knowledgeContext=await knowledge.retrieve({query,stack:job.stack||STATIC,mode:job.knowledgeMode||'off',stages:['repair'],apiKey,signal:controller.signal});
    await knowledge.validateContext(job.knowledgeContext,job.stack||STATIC);persistJob(job);controller.signal.throwIfAborted();
    job.stage='requesting';job.called=true;persistJob(job);log('Sending code and errors to OpenAI for one repair attempt.');
    state.liveCode='';const app=await repairApp({apiKey,model:job.model,files:base.files,diagnostics,originalPrompt,knowledgeContext:job.knowledgeContext,stack:job.stack||STATIC,signal:controller.signal,onProgress:({characters,text})=>{job.characters=characters;state.liveCode=text.slice(-20000);}});
    job.usage=app.usage;job.summary=app.summary;job.title=app.title;job.limitations=app.limitations;
    if(job.projectId){job.revision=projects.saveVersion(job.projectId,app.files,{stack:job.stack||STATIC,source:'repair',jobId:job.id,summary:app.summary,limitations:app.limitations,scenarios:base.scenarios||[]});persistJob(job);}
    controller.signal.throwIfAborted();
    if(filesHash(app.files)===filesHash(base.files)){job.status='no-progress';job.stage='completed';job.result='The AI returned the same code. The current version was kept. No retry was made.';return;}
    repairController=null;job.stage='testing';
    const prepared=await prepareVersion(app.files,{projectId:job.projectId,revision:job.revision,stack:job.stack||STATIC});job.stage='testing';
    if(job.projectId)await ensureProjectServer(job.projectId);
    if(alternative){await discard(alternative.active.name);alternative=null;}
    name=`devkiller-${session}-${randomUUID().slice(0,8)}`;
    const folder=path.join(root,'.runtime',name);
    for(const file of prepared){const dest=path.join(folder,...file.name.split('/'));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,file.content,'utf8');}
    tracked.add(name);const candidate=await runtime.start(name,folder,{projectId:job.projectId,qaToken:token,stack:job.stack});candidate.version=state.version+1;candidate.projectId=job.projectId;candidate.revision=job.revision;
    const health=await inspectPreview(candidate.port);if(health.status!=='passed')throw new Error('The repair attempt did not open. Your previous version was kept.');
    alternative={kind:'candidate',active:candidate,files:app.files,expiresAt:Date.now()+lifetime};
    if(job.projectId)await ensureProjectServer(job.projectId,true);
    log('Repair received. Checking a separate preview; the previous one stays available.');
    comparisonMemory.clear();const checks=await inspectBrowser(`http://127.0.0.1:${comparisonPort}/`,app.files,{headers:{'X-DevKiller-QA':token}});
    checks.push(...await inspectScenarios(`http://127.0.0.1:${comparisonPort}/`,app.files,base.scenarios||[],{headers:{'X-DevKiller-QA':token},resetData:()=>resetQaData(candidate,comparisonMemory)}));
    const assessment=compareRepair(diagnostics,checks,base.files,app.files);
    job.assessment=assessment;job.checks=checks;
    if(job.projectId)projects.markVersion(job.projectId,job.revision,{status:assessment.accepted?'checked':'not-fixed',qa:checks});
    if(!assessment.accepted){job.status='not-fixed';job.stage='completed';job.result='The attempt still had an error or could not be checked. Your previous version was kept; you can open the attempt separately.';log(job.result,'warning');return;}
    const old=state.active?{kind:'previous',active:state.active,files:lastFiles,quality:state.active.quality||state.quality,qa:state.active.qa||state.qa,coverage:state.coverage,expiresAt:state.expiresAt}:null;
    state.active=candidate;state.version=candidate.version;lastFiles=app.files;state.expiresAt=alternative.expiresAt;
    if(job.projectId){projects.update(job.projectId,{selectedVersion:job.revision});currentProjectId=job.projectId;currentRevision=job.revision;currentRequest=originalPrompt;}
    alternative=old;published=true;
    state.repairTarget=null;if(old?.active.projectId)await ensureProjectServer(old.active.projectId,true);
    state.qa=[{...health,check:'http-availability'},...checks,...pendingChecks(checks)];state.quality={...summarizeQuality(checks),checkedAt:new Date().toISOString()};
    state.coverage={proposed:(base.scenarios||[]).length,passed:checks.filter(q=>q.check?.startsWith('acceptance-')&&q.status==='passed').length,failed:0,pending:0,alignment:'The original proposed scenarios were retained. Full request coverage remains unverified.'};
    state.active.qa=state.qa;state.active.quality=state.quality;
    job.status='completed';job.stage='completed';job.version=candidate.version;job.result='The detected issue did not appear in the new check. The repaired version is open. App-specific rules and actions still need testing.';
    log(job.result,'success');
  }catch(error){
    if(name&&!published&&alternative?.active.name!==name){try{await discard(name);}catch{}}
    if(error.checks){state.qa=error.checks;state.repairTarget={projectId:job.projectId,revision:job.revision,stack:job.stack};if(job.projectId&&job.revision)projects.markVersion(job.projectId,job.revision,{status:'build-failed',qa:error.checks});}
    job.status=controller.signal.aborted?'cancelled':'failed';job.stage='completed';job.usage=job.usage||error.usage||null;job.result=controller.signal.aborted?'Repair cancelled. The previous version was kept; completed processing may still be billed.':error.message;
    log(job.result,'error');
  }finally{job.finishedAt=Date.now();try{persistJob(job);}catch(error){persistenceFailure(error);}repairController=null;state.busy=false;state.status=state.active?(state.quality?.status==='issues'?'degraded':'running'):'stopped';}
}

async function refineGeneratedDesign(app,revision,job,controller){
 const folder=path.join(path.dirname(projects.file(job.projectId)),'quality',job.id);
 const baseline=structuredClone(state.qa||[]);let candidate=null,promoted=false;
 try{return await refineOnce({folder,files:app.files,review:job.visualReview,
  onProgress:label=>{job.stage='refining-design';job.progressLabel=label;persistJob(job);log(label);},
  edit:async findings=>polishDesign({generationProfile:job.generationProfile,apiKey,model:job.model,stack:job.stack,files:app.files,scenarios:app.scenarios||[],originalPrompt:job.prompt,signal:controller.signal,
   visualDirection:job.productPlan?.plan?.visualDirection,findings,
   observations:await observationImages(path.join(path.dirname(projects.file(job.projectId)),'quality',String(revision)),job.visualReview),
   media:await media.input(job.projectId),knowledgeContext:stageContext(runs.get(job.projectId,job.id).knowledgeContext,'visual-review')}),
  evaluate:async(edited,targets)=>{
   controller.signal.throwIfAborted();
   const nextRevision=projects.saveVersion(job.projectId,edited.files,{stack:job.stack,source:'design-refinement',jobId:job.id+':design-refinement',...(appSpecEnabled()&&job.appSpec?{appSpec:job.appSpec,requirementCoverage:assessRequirementMap(edited.files,job.appSpec.plan)}:{}),summary:edited.summary,limitations:app.limitations,scenarios:app.scenarios||[]});
   const prepared=await prepareVersion(edited.files,{projectId:job.projectId,revision:nextRevision,stack:job.stack});
   if(alternative){await discard(alternative.active.name);alternative=null;}
   const name=`devkiller-${session}-${randomUUID().slice(0,8)}`,runtimeFolder=path.join(root,'.runtime',name);
   candidate={name};
   for(const file of prepared){const dest=path.join(runtimeFolder,...file.name.split('/'));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,file.content,'utf8');}
   tracked.add(name);candidate={...await runtime.start(name,runtimeFolder,{projectId:job.projectId,qaToken:token,stack:job.stack}),projectId:job.projectId,revision:nextRevision,version:state.version+1};
   alternative={kind:'candidate',active:candidate,files:edited.files,expiresAt:Date.now()+lifetime};await ensureProjectServer(job.projectId,true);
   const url=`http://127.0.0.1:${comparisonPort}/`;
   comparisonMemory.clear();const headers={'X-DevKiller-QA':token};
   const checks=[{...await inspectPreview(candidate.port),check:'http-availability'},...await inspectBrowser(url,edited.files,{headers}),...await inspectScenarios(url,edited.files,app.scenarios||[],{headers,resetData:()=>resetQaData(candidate,comparisonMemory)})];
   const review=await reviewRenderedApp({generationProfile:job.generationProfile,tasteMode:job.tasteMode??'off',visualDirection:job.productPlan?.plan?.visualDirection,folder:path.join(folder,'refinement-review'),previousObservation:{folder:path.join(path.dirname(projects.file(job.projectId)),'quality',String(revision)),review:job.visualReview},targets,url,headers,prompt:job.prompt,files:edited.files,knowledgeContext:stageContext(runs.get(job.projectId,job.id).knowledgeContext,'visual-review'),apiKey,model:job.model,signal:controller.signal});
   const accepted=refinementAccepted(baseline,checks,review,targets);projects.markVersion(job.projectId,nextRevision,{status:accepted?'checked':'needs-review',qa:checks});
   return {accepted,revision:nextRevision,checks,review};
  },
  promote:async(edited,evidence)=>{
   controller.signal.throwIfAborted();const old={kind:'previous',active:state.active,files:lastFiles,quality:state.quality,qa:state.qa,coverage:state.coverage,expiresAt:state.expiresAt};
   projects.update(job.projectId,{selectedVersion:evidence.revision});
   state.active=candidate;lastFiles=edited.files;currentRevision=evidence.revision;state.version=candidate.version;state.expiresAt=Date.now()+lifetime;
   state.qa=evidence.checks;state.quality={...summarizeQuality(evidence.checks),checkedAt:new Date().toISOString()};state.active.qa=state.qa;state.active.quality=state.quality;
   alternative=old;promoted=true;job.visualReview=evidence.review;log('Refinement passed its review and regression checks. The previous version remains saved.','success');
  }
 });}finally{
  if(candidate&&!promoted){if(alternative?.active?.name===candidate.name)alternative=null;try{await discard(candidate.name);}catch{}}
  state.status=state.active?(state.quality?.status==='issues'?'degraded':'running'):'stopped';
 }
}

async function runGeneration(prompt) {
  const job=state.generation;
  const controller=generationController;
  try {
    await executeGeneration({store:runs,projectId:job.projectId,id:job.id,signal:controller.signal,
      onUpdate:run=>{state.orchestration=run;job.called=run.calls>0;job.usage=run.usage;job.revision=run.revision;job.stage=run.stage==='saving'?'deploying':run.stage;try{persistJob(job);}catch(error){persistenceFailure(error);}},
      checkEnvironment:async()=>{state.environment=await runtime.check();if(!state.environment.ready)throw new Error(state.environment.message+' No AI call was made.');const ready=await compiler.check(job.stack||STATIC);if(!ready.ready)throw new Error(ready.message);},
      prepareContext:async savedJob=>{const context=await knowledge.retrieve({query:savedJob.prompt,stack:savedJob.stack||STATIC,mode:savedJob.knowledgeMode||'off',stages:[...(savedJob.professionalDelivery?['planning']:[]),...(savedJob.modularGeneration?['foundation','features','integration']:['features']),...(savedJob.reviewDesign?['visual-review']:[])],apiKey,signal:controller.signal});if(context.mode==='anythingllm'){log(`RAG: core library plus ${Object.keys(context.stages||{}).length} stage contexts saved; at most 4,000 reference tokens per stage.`,'success');for(const warning of context.routing?.warnings||[])log(warning.group+': '+warning.reason,'warning');}return context;},
      validateContext:(context,savedJob)=>knowledge.validateContext(context,savedJob.stack||STATIC),
      generate:async(savedJob,knowledgeContext,stageControl)=>{if(savedJob.professionalDelivery){state.status='planning';job.stage='planning';persistJob(job);log('Preparing the product plan: requirements, screens and visual direction. One bounded planning call.');try{job.productPlan=await planProduct({cacheFolder:path.join(root,'.runtime','product-plan-cache'),folder:path.join(path.dirname(projects.file(job.projectId)),'quality',job.id),prompt,stack:job.stack,model:job.model,apiKey,generationProfile:savedJob.generationProfile,tasteMode:savedJob.tasteMode??'off',knowledgeContext:stageContext(knowledgeContext,'planning'),assets:[],signal:controller.signal});}catch(error){controller.signal.throwIfAborted();job.planningWarning='The separate plan was unavailable. Continuing once from the original request without another planning call.';log(job.planningWarning,'warning');}if(appSpecEnabled()){try{job.appSpec=createAppSpec(job.productPlan?.plan);}catch{job.appSpec=null;}}persistJob(job);}
        job.designProcessVersion=DESIGN_PROCESS_VERSION;
        const assetFolder=path.join(path.dirname(projects.file(job.projectId)),'quality',job.id);
        job.stage='finding-images';job.progressLabel='Finding photography for the visual plan';persistJob(job);
        const sceneBriefs=imageBriefs(job.productPlan?.plan);
        job.media=/\bno (?:images|photos|photography)\b|sem (?:imagens|fotos)/i.test(prompt)?{status:'not-requested',assets:[]}:await media.prepare(job.projectId,sceneBriefs.length?sceneBriefs.map(b=>b.scene).join(' '):prompt,{signal:controller.signal});
        if(savedJob.generateEditorialImage&&sceneBriefs.length){job.stage='creating-editorial-image';persistJob(job);job.media=await media.generateEditorialSet(job.projectId,'Planned editorial photography',{apiKey,signal:controller.signal,briefs:sceneBriefs,count:Math.min(sceneBriefs.length,savedJob.generationProfile==='ultimate'?3:1),onProgress:label=>{job.progressLabel=label;persistJob(job);log(label);}});}
        else if(savedJob.generateEditorialImage)log('No verified scene brief was available. Image generation skipped; available photos or placeholders will be used.','warning');
        const manifest=await media.manifest(job.projectId);
        if(manifest.assets.length){job.stage='reviewing-images';job.progressLabel='Checking image subjects and rejecting unsuitable visuals';persistJob(job);
          job.assetReview=await inspectMedia({folder:assetFolder,media:await media.input(job.projectId,{includeUnreviewed:true}),visualDirection:job.productPlan?.plan?.visualDirection,apiKey,model:job.model,signal:controller.signal});
          manifest.reviewRequired=true;for(const asset of manifest.assets){const decision=job.assetReview.approved?.find(a=>a.url===asset.url);asset.reviewStatus=decision?'approved':'excluded';if(decision)asset.description=decision.description;}
          await fs.writeFile(path.join(media.folder(job.projectId),'manifest.json'),JSON.stringify(manifest,null,2));job.media={...manifest,imageGeneration:job.media?.imageGeneration};persistJob(job);
        }
        state.status='generating';job.stage='generating';persistJob(job);state.liveCode='';log(job.modularGeneration?(savedJob.generationProfile==='efficient'?'Efficient generation: compact foundation, most code allowance allocated to the working visual experience; saved stages and bounded continuations.':savedJob.generationProfile==='ultimate'?'Ultimate generation: no Engine output-token ceiling. Provider limits and cancellation still apply.':'Building in three saved modules without an Engine token ceiling; completed files are never replayed.'):`Request sent to OpenAI (${job.model}). One saved call allowance; no Engine output-token ceiling and ${GENERATION_LIMITS.seconds} seconds.`);if(job.modularGeneration)return generateModular({folder:path.join(path.dirname(projects.file(job.projectId)),'quality',job.id,'modules'),apiKey,model:job.model,prompt,stack:job.stack,productPlan:job.appSpec?.plan||job.productPlan?.plan,appSpec:appSpecEnabled()?job.appSpec:null,knowledgeContext,generationProfile:savedJob.generationProfile,tasteMode:savedJob.tasteMode??'off',media:await media.input(job.projectId),signal:controller.signal,...stageControl,inspectAssembly:async files=>{log('Checking the assembled modules before the final integration step.');try{const built=await compiler.prepare(files,{stack:job.stack});return inspectBackendBuild(runtime,built.files,{stack:job.stack,signal:controller.signal});}catch(error){if(error.checks?.some(c=>c.category==='ambiente'))throw error;return {status:'failed',checks:error.checks||[{evidence:error.message}]};}},onProgress:({characters,text,label})=>{job.characters=characters;job.progressLabel=label;state.liveCode=text.slice(-20000);}});return generateApp({tasteMode:savedJob.tasteMode??'off',apiKey,model:job.model,prompt,knowledgeContext,qualityFeedback:savedJob.qualityFeedback,productPlan:job.productPlan?.plan,media:await media.input(job.projectId),stack:job.stack||STATIC,signal:controller.signal,onProgress:({characters,text})=>{job.characters=characters;state.liveCode=text.slice(-20000);}});},
      saveVersion:async app=>{job.requirementCoverage=assessRequirementMap(app.files,job.productPlan?.plan);const revision=projects.saveVersion(job.projectId,app.files,{stack:job.stack||STATIC,source:'generation',jobId:job.id,...(appSpecEnabled()&&job.appSpec?{appSpec:job.appSpec}:{}),requirementCoverage:job.requirementCoverage,summary:app.summary,limitations:app.limitations,scenarios:app.scenarios||[],scenarioIssue:app.scenarioIssue});projects.update(job.projectId,{title:app.title,summary:app.summary});return revision;},
      deploy:async(app,revision)=>{job.title=app.title;job.summary=app.summary;job.limitations=app.limitations;job.fileCount=app.files.length;log('Saved code is ready. Preparing the preview without another AI call.');await deploy(app.files,{projectId:job.projectId,revision,signal:controller.signal,holdBusy:true});if(job.reviewDesign&&snapshot().previewUrl){job.stage='visual-review';persistJob(job);job.visualReview=await reviewRenderedApp({tasteMode:job.tasteMode??'off',visualDirection:job.productPlan?.plan?.visualDirection,folder:path.join(path.dirname(projects.file(job.projectId)),'quality',String(revision)),url:snapshot().previewUrl,prompt,files:app.files,headers:{'X-DevKiller-QA':token},generationProfile:job.generationProfile,knowledgeContext:stageContext(runs.get(job.projectId,job.id).knowledgeContext,'visual-review'),apiKey,model:job.model,signal:controller.signal});job.initialVisualReview=job.visualReview;job.refinement=await refineGeneratedDesign(app,revision,job,controller);persistJob(job);log(job.visualReview.status==='completed'?'Desktop and mobile visual review saved. Preview remains available.':'Visual review incomplete. The usable preview remains available.',job.visualReview.review?.verdict==='needs-work'?'warning':'info');}return {quality:state.quality?.status,revision:currentRevision,coverage:state.coverage};}
    });
    currentRequest=prompt;
    job.stage='completed';job.status='completed';job.quality=state.quality?.status;
    log(state.quality?.status==='issues'?'Code received and preview opened with a functional issue. See diagnostics.':'Generation finished. See diagnostics and try the app.',state.quality?.status==='issues'?'warning':'success');
  } catch(error) {
    const message=controller.signal.aborted ? 'Generation cancelled by you. Work already processed by OpenAI may still be billed.' : error.message;
    if(error.partialResponse){try{const folder=path.join(path.dirname(projects.file(job.projectId)),'quality',job.id);await fs.mkdir(folder,{recursive:true});await fs.writeFile(path.join(folder,'incomplete-response.txt'),error.partialResponse,{flag:'wx'});job.incompleteEvidence={file:'incomplete-response.txt',characters:error.partialResponse.length,executable:false};}catch(e){log('Could not save the incomplete response evidence.','warning');}}
    job.status=controller.signal.aborted?'cancelled':'failed';job.stage=job.status;job.error=message;job.usage=job.usage||error.usage||null;
    state.lastError=message;state.status=state.active?'running':'failed';
    log(message+(state.active?' The previous preview is still available.':''),'error');
  } finally {if(job.professionalDelivery&&!job.productPlan){try{job.productPlan=JSON.parse(await fs.readFile(path.join(path.dirname(projects.file(job.projectId)),'quality',job.id,'product-plan.json'),'utf8'));}catch{}}job.providerUsage={code:job.usage||null,planning:job.productPlan?.usage||null,review:job.visualReview?.usage||null,assetReview:job.assetReview?.usage||null,refinement:job.refinement?.usage||null,refinementReview:job.refinement?.review?.usage||null};const parts=[job.usage&&{input:job.usage.input,output:job.usage.output,total:job.usage.total},...[job.productPlan?.usage,job.assetReview?.usage,job.initialVisualReview?.usage||job.visualReview?.usage,job.refinement?.review?.usage,job.refinement?.usage&&{input_tokens:job.refinement.usage.input,output_tokens:job.refinement.usage.output,total_tokens:job.refinement.usage.total}].filter(Boolean).map(u=>({input:u.input_tokens||0,output:u.output_tokens||0,total:u.total_tokens||0}))].filter(Boolean);job.totalUsage=parts.length?parts.reduce((a,u)=>({input:a.input+u.input,output:a.output+u.output,total:a.total+u.total}),{input:0,output:0,total:0}):null;job.finishedAt=Date.now();try{persistJob(job);}catch(error){persistenceFailure(error);}generationController=null;state.busy=false;}
}

async function body(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 6*1024*1024) throw new Error('Upload too large. Extended source packages support up to 4 MB.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { throw new Error('The submitted package is not valid JSON.'); }
}
async function runRevision(base,input) {
  const job=state.generation,controller=generationController;
  const previous={active:state.active,files:lastFiles,quality:state.quality,qa:state.qa,coverage:state.coverage,expiresAt:state.expiresAt,projectId:currentProjectId,revision:currentRevision,request:currentRequest};
  try {
    const environment=await runtime.check();if(!environment.ready)throw Error(environment.message+' No AI call was made.');
    const ready=await compiler.check(job.stack);if(!ready.ready)throw Error(ready.message);
    controller.signal.throwIfAborted();
    job.called=true;job.stage='generating';state.status='generating';persistJob(job);
    const app=await targetedEdit({apiKey,model:job.model,stack:job.stack,files:base.files,scenarios:base.info.scenarios||[],request:input.message,diagnostics:base.info.qa||[],selection:input.selection,originalPrompt:projects.info(job.projectId).prompt,signal:controller.signal});
    app.limitations=base.info.limitations||app.limitations;
    job.usage=app.usage;job.summary=app.summary;job.patchCount=app.patchCount;job.limits=EDIT_LIMITS;
    if(filesHash(app.files)===filesHash(base.files)){job.status='no-progress';job.result='No source change was made. '+app.summary;return;}
    controller.signal.throwIfAborted();
    job.revision=projects.saveVersion(job.projectId,app.files,{stack:job.stack,source:'user-edit',jobId:job.id,summary:app.summary,limitations:app.limitations,scenarios:app.scenarios,scenarioIssue:app.scenarioIssue});persistJob(job);
    await deploy(app.files,{projectId:job.projectId,revision:job.revision,signal:controller.signal,holdBusy:true});
    job.visualVerification=await verifyVisual(`http://127.0.0.1:${previewPort}/`,app.visualChecks,{headers:{'X-DevKiller-QA':token},route:input.selection?.route||'/'});
    state.qa.push(...job.visualVerification);projects.markVersion(job.projectId,job.revision,{qa:state.qa});
    if(previous.active&&(state.qa.some(q=>isNewFailure(q,base.info.qa||[]))||job.visualVerification.some(q=>q.status!=='passed'))) {
      const candidate=state.active;
      state.active=previous.active;lastFiles=previous.files;state.quality=previous.quality;state.qa=previous.qa;state.coverage=previous.coverage;state.expiresAt=previous.expiresAt;currentProjectId=previous.projectId;currentRevision=previous.revision;currentRequest=previous.request;alternative=null;
      projects.update(job.projectId,{selectedVersion:previous.revision});
      try{await discard(candidate.name);}catch{}
      throw Error(job.visualVerification.some(q=>q.status!=='passed')?'The requested visual change was not confirmed. Your previous preview remains open; the attempt and measured result are saved.':'A new functional failure was detected. Your previous preview remains open. The attempt is saved in Versions for review.');
    }
    job.status='completed';job.result=app.summary;job.quality=state.quality?.status;
  } catch(error) {
    job.status=controller.signal.aborted?'cancelled':'failed';job.error=error.message;job.usage=job.usage||error.usage||null;
    if(state.active?.name===previous.active?.name){state.qa=previous.qa;state.quality=previous.quality;}
    state.lastError=error.message;log(error.message,'error');
  } finally {job.finishedAt=Date.now();job.stage=job.status;try{persistJob(job);}catch(error){persistenceFailure(error);}generationController=null;state.busy=false;state.status=state.active?'running':'stopped';}
}
function pendingChecks(results){return [
  {category:'funcional',status:'pending',check:'business-actions',requirement:'Fulfil the requested actions and rules.',expected:'Test this app’s interactions and their results.',observed:'Not automatically tested yet.',evidence:results.some(r=>r.category==='funcional'&&r.status==='failed')?'A startup issue was found. Repair it before validating other features.':'This check observed startup; it did not test all buttons, rules or scenarios.',correction:'Define and run the app’s functional scenarios.'},
  {category:'visual',status:'pending',check:'visual',requirement:'Display a readable, usable interface.',expected:'Visual inspection and use at different widths.',observed:'This checker did not perform a visual inspection.',evidence:'No pixel-difference rejection was applied.'}
];}
async function resetQaData(target,memory){memory.clear();if(!target?.backend)return;const r=await fetch(`http://127.0.0.1:${target.port}/__backend/reset-qa`,{method:'POST',headers:{'X-DevKiller-QA':token},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Could not reset isolated QA data. Live data preserved.');}
async function verifyCurrentApp() {
  state.status='verifying';state.quality={status:'checking',message:'The preview is available. Checking browser startup…'};
  log('Automatic browser check started. No AI call.');
  qaMemory.clear();const results=await inspectBrowser(`http://127.0.0.1:${previewPort}/`,lastFiles||[],{headers:{'X-DevKiller-QA':token}});
  state.qa=state.qa.filter(q=>q.check==='http-availability');
  state.qa.push(...results,
    {category:'funcional',status:'pending',check:'business-actions',requirement:'Fulfil the requested actions and rules.',expected:'Test this app’s interactions and their results.',observed:'Not automatically tested yet.',evidence:results.some(r=>r.category==='funcional'&&r.status==='failed')?'A startup issue was found. Repair it before validating other features.':'This check observed startup; it did not test all buttons, rules or scenarios.',correction:'Define and run the app’s functional scenarios.'},
    {category:'visual',status:'pending',check:'visual',requirement:'Display a readable, usable interface.',expected:'Visual inspection and use at different widths.',observed:'This checker did not perform a visual inspection.',evidence:'No pixel-difference rejection was applied.'});
  const saved=currentProjectId&&currentRevision?projects.version(currentProjectId,currentRevision):null;
  const scenarios=saved?.info.scenarios||[];
  const acceptance=await inspectScenarios(`http://127.0.0.1:${previewPort}/`,lastFiles||[],scenarios,{headers:{'X-DevKiller-QA':token},resetData:()=>resetQaData(state.active,qaMemory)});
  state.qa.push(...acceptance);
  if(acceptance.length){const scope=state.qa.find(q=>q.check==='business-actions');scope.observed='Some proposed scenarios were tested; complete request coverage remains unverified.';scope.evidence=`${acceptance.filter(q=>q.status==='passed').length} proposed scenarios passed. The model proposed the plan; an independent check that it covers the full request has not been performed.`;}
  state.coverage={proposed:scenarios.length,passed:acceptance.filter(q=>q.status==='passed').length,failed:acceptance.filter(q=>q.status==='failed').length,pending:acceptance.filter(q=>q.status==='pending').length,alignment:'The AI proposed these scenarios. Coverage of the whole request has not been independently verified.'};
  state.quality={...summarizeQuality([...results,...acceptance]),checkedAt:new Date().toISOString()};
  if(acceptance.length&&state.quality.status==='basic-passed')state.quality.message=`Startup checked. ${state.coverage.passed} of ${scenarios.length} proposed scenarios passed. Full request coverage remains unverified.`;
  if(saved?.info.scenarioIssue){state.qa.push({category:'ambiente',status:'pending',check:'scenario-plan',requirement:'Provide a usable acceptance plan.',expected:'A valid bounded test plan.',evidence:saved.info.scenarioIssue});state.quality={...summarizeQuality(state.qa),checkedAt:new Date().toISOString()};}
  if(state.active){state.active.qa=state.qa;state.active.quality=state.quality;}
  state.status=state.quality.status==='issues'?'degraded':'running';
  log(state.quality.message,state.quality.status==='basic-passed'?'success':'warning');
  if(currentProjectId&&currentRevision)try{projects.markVersion(currentProjectId,currentRevision,{status:state.quality.status,qa:state.qa});}catch(error){persistenceFailure(error);}
}
async function deploy(files,{projectId=currentProjectId,revision=currentRevision,signal,holdBusy=false}={}) {
  const stack=projectId&&revision?projects.version(projectId,revision).info.stack||STATIC:STATIC;
  validateSource(files,stack);
  state.busy = true; state.status = 'preparing'; state.lastError = null;
  const version = state.version + 1;
  const name = `devkiller-${session}-${randomUUID().slice(0,8)}`;
  const folder = path.join(root,'.runtime',name);
  let stage = 'environment';
  const previousState={active:state.active,files:lastFiles,quality:state.quality,qa:state.qa,coverage:state.coverage,expiresAt:state.expiresAt,projectId:currentProjectId,revision:currentRevision,request:currentRequest};
  log(`Preparing version ${version}. One attempt, no automatic repairs.`);
  try {
    if(projectId)await ensureProjectServer(projectId);
    if(alternative){await discard(alternative.active.name);alternative=null;}
    state.environment = await runtime.check();
    if (!state.environment.ready) throw new Error(state.environment.message);
    const prepared=await prepareVersion(files,{projectId,revision,stack});
    signal?.throwIfAborted();
    for (const file of prepared) {
      const dest = path.join(folder,...file.name.split('/'));
      await fs.mkdir(path.dirname(dest),{recursive:true});
      await fs.writeFile(dest,file.content,'utf8');
    }
    state.status = 'starting'; log(prepared.some(f=>f.name==='backend/routes.mjs')?'Starting isolated API and PostgreSQL with a read-only application filesystem.':'Starting container: 128 MB, 0.5 CPU, read-only filesystem.');
    tracked.add(name);
    const candidate = await runtime.start(name,folder,{projectId,qaToken:token,stack});
    signal?.throwIfAborted();
    stage = 'health'; state.status = 'checking'; log('Checking the home page response.');
    const qa = await inspectPreview(candidate.port);
    if (qa.status !== 'passed') { state.qa = [qa]; throw new Error('The new version did not respond to the environment check.'); }
    if(projectId)projects.update(projectId,{selectedVersion:revision,database:candidate.backend?{type:"postgresql",container:candidate.databaseContainer}:{type:"sqlite"}});
    state.active = {...candidate, version,projectId,revision}; state.version = version; lastFiles = structuredClone(files);
    state.repairTarget=null;
    currentProjectId=projectId;currentRevision=revision;currentRequest=projectId?projects.info(projectId).prompt:null;
    state.expiresAt = Date.now() + lifetime;
    state.qa = [{...qa,check:'http-availability'}];
    log(`Version ${version} opened. The browser check will look for startup errors.`);
    await verifyCurrentApp();
    if(previousState.active){alternative={kind:'previous',active:previousState.active,files:previousState.files,quality:previousState.quality,qa:previousState.qa,coverage:previousState.coverage,expiresAt:previousState.expiresAt};await ensureProjectServer(previousState.projectId,true);}
  } catch (error) {
    try { await discard(name); } catch {}
    if(state.active?.name===name){state.active=previousState.active;lastFiles=previousState.files;state.quality=previousState.quality;state.qa=previousState.qa;state.coverage=previousState.coverage;state.expiresAt=previousState.expiresAt;currentProjectId=previousState.projectId;currentRevision=previousState.revision;currentRequest=previousState.request;if(projectId&&projectId===previousState.projectId)try{projects.update(projectId,{selectedVersion:previousState.revision});}catch(e){persistenceFailure(e);}}
    if(error.checks){state.qa=error.checks;state.repairTarget={projectId,revision,stack};}
    else if (stage !== 'health') state.qa = [{category:'ambiente',status:'failed',requirement:'Prepare the runtime environment.',expected:'Docker available, image installed and container started.',evidence:error.message}];
    if(projectId&&revision)try{projects.markVersion(projectId,revision,{status:'preview-failed',qa:state.qa,error:error.message});}catch(storageError){persistenceFailure(storageError);}
    state.lastError = error.message; state.status = state.active ? 'running' : 'failed';
    log(state.active ? 'The update failed. The last available preview was preserved.' : 'Could not start the preview. See diagnostics.','error');
    throw error;
  } finally { if(!holdBusy)state.busy = false; }
}
async function stop(reason='Run stopped by you.') {
  state.busy = true;
  try {
    for (const name of tracked) await discard(name);
    state.active = null; state.status = 'stopped'; state.expiresAt = null; log(reason);
    alternative=null;
  } finally { state.busy = false; }
}

const health=new EngineHealth({runtime,store:projects,getState:()=>({...state,designAssistance:tasteStatus(),generationProfile:activeGenerationProfile,activeStack:state.generation?.stack||"react-v5"}),secretConfigured:()=>!!apiKey,secretError:()=>secretError,getConnection:()=>({...connection,error:connectionError})});
const server = http.createServer(async (req,res) => {
  if (req.headers.host !== `127.0.0.1:${port}`) return json(res,403,{error:'Use the local 127.0.0.1 address.'});
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-src http://127.0.0.1:*; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`);
  const url = new URL(req.url,origin);
  try {
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res,200,{...snapshot(),token});
    if(req.method==='GET'&&url.pathname==='/api/workers')return json(res,200,pool?await pool.status():{limit:1,active:state.busy?1:0,workers:[]});
    if(req.method==='GET'&&url.pathname==='/api/knowledge')return json(res,200,knowledge.status());
    if(req.method==='GET'&&url.pathname==='/api/knowledge/context'){
      const run=runs.get(url.searchParams.get('project'),url.searchParams.get('execution'));
      return json(res,200,{context:run.knowledgeContext||null});
    }
    if(req.method==='GET'&&url.pathname==='/api/engine')return json(res,200,await health.sample({fresh:url.searchParams.get('fresh')==='1'}));
    if(req.method==='GET'&&url.pathname==='/api/projects')return json(res,200,projects.list());
    if(req.method==='GET'&&url.pathname==='/api/executions')return json(res,200,{executions:projects.list().projects.flatMap(p=>runs.list(p.id).map(r=>runs.summary(r))).sort((a,b)=>b.createdAt-a.createdAt)});
    if(req.method==='GET'&&url.pathname==='/api/stacks')return json(res,200,{stacks:STACKS,buildLimits:BUILD_LIMITS});
    if(req.method==='GET'&&url.pathname==='/api/source'){
      const id=url.searchParams.get('project'),version=Number(url.searchParams.get('version'));const saved=projects.version(id,version);
      const folder=path.join(path.dirname(projects.file(id)),'versions',String(version))+path.sep;
      const environment=await fs.readFile(path.join(folder,'environment.json'),'utf8').catch(()=>null);
      const files=projects.sourcePackage(id,version),manifest=await media.manifest(id),assets=[...await media.export(id),...await exportDesignFonts(files)];
      if(manifest.assets.length){const index=files.find(f=>f.name==='index.html');if(index&&!index.content.includes('/__devkiller/photo-credits.js'))index.content=index.content.replace('</body>','<script src="/__devkiller/photo-credits.js"></script></body>');assets.push({name:'public/__devkiller/photo-credits.js',base64:(await fs.readFile(path.join(root,'ui','photo-credits.js'))).toString('base64')},{name:'public/__devkiller/media/credits',base64:Buffer.from(JSON.stringify(manifest)).toString('base64')});}
      return json(res,200,{files,media:manifest,assets,stack:saved.info.stack||STATIC,artifact:projects.artifact(id,version),folder,environment});
    }
    if(req.method==='GET'&&url.pathname.startsWith('/api/projects/')){const details=projects.details(url.pathname.slice('/api/projects/'.length));if(appSpecEnabled())for(const v of details.versions){try{v.info.requirementReport=requirementReport(v.info.appSpec,v.info.qa||[],v.info.requirementCoverage);}catch{v.info.requirementReport=null;}}return json(res,200,details);}
    if (req.method === 'GET' && url.pathname === '/api/current-files') {
      const job=state.generation;
      if(job?.modularGeneration&&job.status!=='completed'&&state.orchestration?.moduleFiles?.length){
        const folder=path.join(path.dirname(projects.file(job.projectId)),'quality',job.id,'modules','source');
        const files=await Promise.all(state.orchestration.moduleFiles.map(async name=>({name,content:await fs.readFile(path.join(folder,name),'utf8')})));
        return json(res,200,{files,stack:job.stack,provisional:true,stage:state.orchestration.moduleStage});
      }
      return json(res,200,{files:lastFiles||[],stack:currentProjectId&&currentRevision?projects.version(currentProjectId,currentRevision).info.stack||STATIC:STATIC});
    }
    if (req.method === 'GET' && url.pathname === '/api/example') {
      const files = await Promise.all(['index.html','style.css','app.js'].map(async name => ({name,content:await fs.readFile(path.join(root,'example',name),'utf8')})));
      return json(res,200,{files});
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      if (req.headers.origin !== origin || req.headers['x-devkiller-token'] !== token) return json(res,403,{error:'Request not authorized. Reopen the local panel.'});
      if(url.pathname==='/api/workers/lease'){if(!pool)return json(res,400,{error:'Only the main Engine allocates workers.'});const input=await body(req);try{return json(res,200,await pool.lease(input.id));}catch(error){return json(res,error.status||503,{error:error.message});}}
      if(url.pathname==='/api/workers/release'){const input=await body(req);await pool?.release(input.id);return json(res,200,{released:true});}
      if(url.pathname==='/api/knowledge/cancel'){knowledgeController?.abort();return json(res,202,snapshot());}
      if (url.pathname === '/api/generation/cancel') {
        if(!generationController)return json(res,409,{error:'There is no AI call to cancel. The preview may already be starting.'});
        generationController.abort();return json(res,202,{...snapshot(),cancelling:true});
      }
      if(url.pathname==='/api/repair/cancel'){if(!repairController)return json(res,409,{error:'The AI call has finished; wait for the checks.'});repairController.abort();return json(res,202,snapshot());}
      if(pool&&['/api/product/chat','/api/product/revise','/api/generate','/api/projects/open'].includes(url.pathname)&&(await pool.status()).active>=2)return json(res,409,{error:'Both execution slots are occupied. Wait for an available slot.'});
      if(workerId&&['/api/product/chat','/api/product/revise','/api/generate'].includes(url.pathname)){connection=await connectionStore.load();const saved=await secrets.load();apiKey=saved?validateKey(saved):'';}
      if(['/api/product/chat','/api/product/revise'].includes(url.pathname)) {
        const input=await body(req);let context,base;
        try{context=editContext(input);base=projects.version(input.projectId,context.revision);}catch(error){return json(res,400,{error:error.message});}
        const prior=projects.details(input.projectId).jobs.find(j=>j.id===context.requestId);
        if(prior)return prior.type==='conversation'&&prior.reply?json(res,200,prior.reply):json(res,409,{error:'This request was already recorded. It will not be repeated.'});
        if(state.busy)return json(res,409,{error:'The Engine is working. Wait for it to finish before sending another message.'});
        if(!apiKey||connectionError)return json(res,400,{error:'Connect an available model in the Engine first.'});
        const recovery=!context.selection&&!state.active&&base.info.status==='preview-failed'&&projects.details(input.projectId).versions[0]?.id===context.revision;
        if((url.pathname.endsWith('/revise')||context.selection)&&!recovery&&(currentProjectId!==input.projectId||currentRevision!==context.revision||!state.active))return json(res,409,{error:'Open this project version again before continuing. Your selection may be out of date.'});
        const job={id:context.requestId,projectId:input.projectId,baseRevision:context.revision,stack:base.info.stack||STATIC,type:url.pathname.endsWith('/chat')?'conversation':'user-edit',model:connection.model,status:'running',stage:'preparing',startedAt:Date.now(),called:false,usage:null};
        if(job.type==='conversation'){
          persistJob(job);state.busy=true;
          try{job.called=true;persistJob(job);const reply=await converse({apiKey,model:connection.model,stack:base.info.stack||STATIC,brief:projects.info(input.projectId).prompt||'',files:base.files,summary:base.info.summary||'',checks:base.info.qa||[],input:context,history:Array.isArray(input.history)?input.history:[]});job.reply=reply;job.usage=reply.usage;job.status='completed';return json(res,200,reply);}
          catch(error){job.status='failed';job.error=error instanceof TypeError?'Could not reach the AI provider. No retry was made.':error.message;job.usage=error.usage||null;return json(res,502,{error:job.error});}
          finally{job.finishedAt=Date.now();try{persistJob(job);}catch(error){persistenceFailure(error);}state.busy=false;}
        }
        try{buildEditContext({files:base.files,request:context.message,selection:context.selection,originalPrompt:projects.info(input.projectId).prompt,stack:job.stack});}catch(error){return json(res,400,{error:error.message});}
        persistJob(job);state.busy=true;state.generation=job;state.liveCode='';generationController=new AbortController();
        void runRevision(base,context);return json(res,202,{generation:job});
      }
      if (state.busy) return json(res,409,{error:'An operation is already running. Wait for it to finish.'});
      if(url.pathname.startsWith('/api/knowledge/')){
        const input=await body(req);if(state.busy)return json(res,409,{error:'An operation is already running.'});
        if(!knowledge.status().ready)throw new Error('Knowledge is unavailable. Restart the panel after checking its catalog.');
        if(url.pathname==='/api/knowledge/settings'){state.busy=true;try{await knowledge.setMode(input.mode);log('Knowledge mode saved: '+input.mode);return json(res,200,knowledge.status());}finally{state.busy=false;}}
        if(url.pathname==='/api/knowledge/source')return json(res,200,knowledge.setSource(input.id,input.enabled));
        if(url.pathname==='/api/knowledge/search'){
          state.busy=true;try{return json(res,200,{context:await knowledge.retrieve({query:input.query,stack:input.stack||REACT_PRO,mode:input.mode||knowledge.status().mode,stages:['planning','foundation','features','integration','visual-review'],apiKey})});}finally{state.busy=false;}
        }
        if(url.pathname==='/api/knowledge/rebuild'){
          state.busy=true;knowledgeController=new AbortController();const controller=knowledgeController;
          void knowledge.rebuild({apiKey,signal:controller.signal}).then(()=>log('Knowledge index built. Source embeddings are cached on this PC.','success')).catch(error=>log(error.message,'error')).finally(()=>{knowledgeController=null;state.busy=false;});
          return json(res,202,knowledge.status());
        }
        return json(res,404,{error:'Unknown knowledge operation.'});
      }
      if(url.pathname==='/api/executions/resume'){
        const input=await body(req);if(state.busy)return json(res,409,{error:'An operation is already running.'});
        const saved=runs.get(input.projectId,input.id);if(saved.status!=='paused')return json(res,409,{error:'This execution cannot be resumed. An uncertain AI call is never repeated.'});
        if(!saved.response&&!apiKey)return json(res,400,{error:'Connect OpenAI before continuing this request.'});
        state.generation={...saved.job,status:'running',finishedAt:null,error:null,usage:saved.usage,revision:saved.revision,called:saved.calls>0};state.busy=true;state.lastError=null;state.repair=null;generationController=new AbortController();void runGeneration(saved.job.prompt);return json(res,202,snapshot());
      }
      if(url.pathname==='/api/projects/open'){
        const input=await body(req);if(state.busy)return json(res,409,{error:'Wait for the current operation to finish.'});
        const info=projects.details(input.id),revision=input.version??info.selectedVersion??info.versions[0]?.id;
        if(!revision)return json(res,400,{error:'This request was saved but has not produced files yet. See its history.'});
        const saved=projects.version(input.id,revision);state.generation=null;state.repair=null;state.storageError=null;
        await deploy(saved.files,{projectId:input.id,revision});log('Projeto reaberto a partir do PC, sem chamada à IA.');return json(res,200,snapshot());
      }
      if(url.pathname==='/api/projects/new'){
        await stop('Pronto para criar outro aplicativo. Seus projetos continuam salvos.');
        currentProjectId=null;currentRevision=null;currentRequest=null;lastFiles=null;state.generation=null;state.repair=null;state.qa=[];state.quality=null;state.coverage=null;state.orchestration=null;state.storageError=null;state.repairTarget=null;state.preparation=null;
        return json(res,200,snapshot());
      }
      if(url.pathname==='/api/connection'){const input=await body(req);if(state.busy)return json(res,409,{error:'Wait for the current operation to finish.'});state.busy=true;try{connection=await connectionStore.save(input);connectionError=null;log('OpenAI model saved: '+connection.model);}finally{state.busy=false;}return json(res,200,snapshot());}
      if(url.pathname==='/api/repair'){
        const input=await body(req);if(state.busy)return json(res,409,{error:'An operation is already running.'});
        const knowledgeMode=validateKnowledgeMode(input.knowledgeMode??knowledge.status().mode);
        if(connectionError)return json(res,400,{error:connectionError});
        if(!apiKey)return json(res,400,{error:'Set up OpenAI in Connections before trying a repair.'});
        if(!state.repairTarget&&(!state.active||!lastFiles))return json(res,400,{error:'Open the app before trying a repair.'});
        const target=state.repairTarget||{projectId:currentProjectId,revision:currentRevision};
        const saved=target.projectId?projects.version(target.projectId,target.revision):null;
        const stack=saved?.info.stack||STATIC,originalPrompt=target.projectId?projects.info(target.projectId).prompt:currentRequest;
        const diagnostics=structuredClone(state.qa),base={files:structuredClone(saved?.files||lastFiles),scenarios:structuredClone(saved?.info.scenarios||[])};
        repairInput({files:base.files,diagnostics,originalPrompt,stack});
        const job={id:randomUUID(),projectId:target.projectId,baseRevision:target.revision,stack,type:'repair',designVersion:DESIGN_VERSION,limits:GENERATION_LIMITS,model:connection.model,status:'running',stage:'preparing',startedAt:Date.now(),finishedAt:null,characters:0,usage:null,called:false,baseVersion:state.active?.version||null,originalPromptAvailable:!!originalPrompt,result:null};
        if(!target.projectId)return json(res,400,{error:'Save this app as a project before requesting a paid repair.'});
        job.repairFingerprint=reserveRepairAttempt(projects,target.projectId,base.files,diagnostics,job.id);
        job.knowledgeMode=knowledgeMode;persistJob(job);state.busy=true;state.repair=job;
        repairController=new AbortController();void runRepair(base,diagnostics,originalPrompt);return json(res,202,snapshot());
      }
      if(url.pathname==='/api/restore'){
        if(alternative?.kind!=='previous')return json(res,400,{error:'There is no previous version available to restore.'});
        const restored=alternative;alternative={kind:'previous',active:state.active,files:lastFiles,quality:state.quality,qa:state.qa,coverage:state.coverage,expiresAt:state.expiresAt};
        state.active=restored.active;lastFiles=restored.files;state.quality=restored.quality;state.qa=restored.qa;state.coverage=restored.coverage;state.expiresAt=restored.expiresAt;
        state.repairTarget=null;
        currentProjectId=state.active.projectId||null;currentRevision=state.active.revision||null;
        if(currentProjectId){projects.update(currentProjectId,{selectedVersion:currentRevision});currentRequest=projects.info(currentProjectId).prompt;}
        state.status=state.quality?.status==='issues'?'degraded':'running';log('Previous version restored without an AI call.');return json(res,200,snapshot());
      }
      if (url.pathname === '/api/openai/key') {
        const input=await body(req);
        if(state.busy)return json(res,409,{error:'Wait for the current operation to finish.'});
        const candidate=validateKey(input.apiKey);
        state.busy=true;
        try {await secrets.save(candidate);apiKey=candidate;secretError=null;}
        finally {state.busy=false;}
        log('OpenAI key saved in the backend with Windows protection. It will be loaded on future starts.');
        return json(res,200,snapshot());
      }
      if (url.pathname === '/api/openai/clear') {
        state.busy=true;
        try {await secrets.remove();apiKey='';secretError=null;}
        finally {state.busy=false;}
        log('OpenAI key removed from the backend.');return json(res,200,snapshot());
      }
      if (url.pathname === '/api/generate') {
        if(connectionError)return json(res,400,{error:connectionError});
        const input=await body(req);
        if(state.busy)return json(res,409,{error:'An operation is already running.'});
        if(!apiKey)return json(res,400,{error:'Set up your OpenAI key before generating.'});
        const prompt=validatePrompt(input.prompt);
        const stack=stackProfile(input.stack&&input.stack!=='auto'?input.stack:chooseStack(input.prompt)).id;
        activeGenerationProfile=input.generationProfile===undefined?await loadGenerationProfile(path.join(root,'settings',configScope)):resolveGenerationProfile(input.generationProfile);
        const generationModel=input.model===undefined?connection.model:validateModel(input.model);
        const knowledgeMode=validateKnowledgeMode(input.knowledgeMode??knowledge.status().mode);
        const tasteMode=validateTasteMode(input.tasteMode??DEFAULT_TASTE_MODE);
        const project=projects.create({title:prompt.slice(0,70),prompt});
        projects.update(project.id,{stack});
        const job={id:randomUUID(),projectId:project.id,stack,contractVersion:stack,type:'generation',designVersion:DESIGN_VERSION,limits:GENERATION_LIMITS,model:generationModel,prompt,status:'running',stage:'environment',startedAt:Date.now(),finishedAt:null,characters:0,usage:null,called:false,error:null};persistJob(job);
        job.tasteMode=tasteMode;job.designAssistance=tasteStatus(tasteMode);job.generationProfile=activeGenerationProfile.id;job.modularGeneration=isCompiled(stack)&&input.professionalDelivery!==false;job.professionalDelivery=input.professionalDelivery!==false;job.deliveryBudget={...PRODUCT_BUDGET,...(job.modularGeneration?{codeCalls:5,codeOutputTokens:null}: {})};if(job.generationProfile==='ultimate'){job.limits={...GENERATION_LIMITS,outputTokens:null,seconds:1800,calls:null};job.deliveryBudget={...job.deliveryBudget,codeCalls:null,codeOutputTokens:null,perCallOutputTokens:null,planningOutputTokens:null,reviewOutputTokens:null,imageCalls:3};}if(job.generationProfile==='efficient')job.deliveryBudget={...job.deliveryBudget,planningOutputTokens:null,reviewOutputTokens:null,refinementOutputTokens:null,...(job.modularGeneration?{codeOutputTokens:null}:{})};job.reviewDesign=input.reviewDesign===true;job.qualityFeedback=typeof input.qualityFeedback==='string'?input.qualityFeedback.slice(0,6000):null;job.generateEditorialImage=input.generateEditorialImage===true||(job.generationProfile==='ultimate'&&input.generateEditorialImage!==false&&!/no (?:photos|images)|sem (?:fotos|imagens)/i.test(prompt));job.knowledgeMode=knowledgeMode;job.contractHash=createHash('sha256').update(generationContract(stack)+JSON.stringify(job.designAssistance)).digest('hex');persistJob(job);runs.create(job);
        state.busy=true;state.lastError=null;state.status='preparing';state.storageError=null;state.repair=null;state.generation=job;
        generationController=new AbortController();
        log('Request received. Checking the environment before calling the API.');
        void runGeneration(prompt);
        return json(res,202,snapshot());
      }
      if (url.pathname === '/api/environment') { state.environment = await runtime.check(); return json(res,200,snapshot()); }
      if (url.pathname === '/api/qa') {
        if(!state.active)return json(res,400,{error:'Start an app before checking it.'});
        state.busy=true;
        try {state.repairTarget=null;await verifyCurrentApp();return json(res,200,snapshot());}
        finally {state.busy=false;}
      }
      if (url.pathname === '/api/start') {
        const input = await body(req);
        if (state.busy) return json(res,409,{error:'An operation is already running.'});
        const stack=stackProfile(input.stack||STATIC).id;input.files=hydrateComponents(input.files,stack);validateSource(input.files,stack);const projectId=currentProjectId||projects.create({title:'Imported app'}).id;
        const revision=projects.saveVersion(projectId,input.files,{source:'import',stack});
        state.generation=null;state.repair=null;
        await deploy(input.files,{projectId,revision,stack}); return json(res,200,snapshot());
      }
      if (url.pathname === '/api/restart') {
        if (!lastFiles) return json(res,400,{error:'Start an app before restarting it.'});
        await deploy(lastFiles,{projectId:currentProjectId,revision:currentRevision,stack:currentProjectId&&currentRevision?projects.version(currentProjectId,currentRevision).info.stack||STATIC:STATIC}); return json(res,200,snapshot());
      }
      if (url.pathname === '/api/stop') { await stop(); return json(res,200,snapshot()); }
      if (url.pathname === '/api/shutdown') { await stop('Panel stopped by you.'); json(res,200,{closed:true}); setTimeout(shutdown,100); return; }
    }
    if (req.method === 'GET' && ['/', '/settings','/style.css','/generation.css','/settings.css','/settings.js','/orchestration.js','/knowledge.js','/knowledge.css','/app.js','/projects.js','/projects.css','/engine.css','/engine.js'].includes(url.pathname)) {
      const name = url.pathname === '/' ? 'index.html' : url.pathname === '/settings' ? 'settings.html' : url.pathname.slice(1);
      res.writeHead(200,{'Content-Type':name.endsWith('.css') ? 'text/css; charset=utf-8' : name.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8','Cache-Control':'no-store'});
      return res.end(await fs.readFile(path.join(root,'ui',name)));
    }
    if(req.method==='GET'&&['/assets/dk-mark.png','/assets/dk-icon.png','/assets/devkiller-wordmark.png'].includes(url.pathname)){res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'public, max-age=3600'});return res.end(await fs.readFile(path.join(root,'ui',url.pathname.slice(1))));}
    json(res,404,{error:'Address not found.'});
  } catch (error) { json(res,400,{error:error.message,state:snapshot()}); }
});

function createPreviewServer(getTarget,listenPort,{projectId=null,memory=null}={}){return http.createServer(async(req,res) => {
  const actualPort=typeof listenPort==='function'?listenPort():listenPort;
  if (req.headers.host !== `127.0.0.1:${actualPort}`) { res.writeHead(403).end(); return; }
  const editorUrl=new URL(req.url,`http://127.0.0.1:${actualPort}`);
  if(editorUrl.pathname==='/__devkiller/photo-credits.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(await fs.readFile(path.join(root,'ui','photo-credits.js')));return;}
  if(editorUrl.pathname==='/__devkiller/visual.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(await fs.readFile(path.join(root,'ui','visual-bridge.js')));return;}
  const target=getTarget();
  if(memory&&req.headers['x-devkiller-qa']!==token){
    const entry=projectServers.get((actualPort===comparisonPort?'compare:':'')+target?.projectId);
    if(entry){res.writeHead(302,{Location:new URL(req.url,entry.url).href,'Cache-Control':'no-store'}).end();return;}
    res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8'}).end('Open a project from the panel to use its preview.');return;
  }
  if(target?.projectId&&await serveDesignFont(req,res))return;
  if(target?.projectId&&await media.serve(req,res,target.projectId))return;
  if(await serveAppData(req,res,{origin:`http://127.0.0.1:${actualPort}`,store:projects,projectId,memory}))return;
  if (!target) { res.writeHead(503,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end('<h1>Preview stopped</h1><p>Start the app in the DevKiller panel.</p>'); return; }
  if(target.backend&&!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers['x-devkiller-qa']!==token&&req.headers.origin!==`http://127.0.0.1:${actualPort}`){res.writeHead(403).end('Use the application to perform this action.');return;}
  const upstream = http.request({hostname:'127.0.0.1',port:target.port,path:req.url,method:req.method,headers:{accept:req.headers.accept || '*/*',...(req.headers['content-type']?{'content-type':req.headers['content-type']}:{}),...(req.headers['x-devkiller-qa']===token?{'x-devkiller-qa':token}:{})}}, response => {
    const nonce=editorUrl.searchParams.get('__dk_editor'),parent=editorUrl.searchParams.get('__dk_parent');
    const inject=nonce&&/^[a-f0-9-]{36}$/.test(nonce)&&/^http:\/\/127\.0\.0\.1:\d+$/.test(parent)&&String(response.headers['content-type']).includes('text/html');
    if(inject){delete response.headers['content-length'];delete response.headers.etag;}
    res.writeHead(response.statusCode, {...response.headers,
      'Content-Security-Policy':`default-src 'self' data:; script-src 'self' 'unsafe-inline'${target.framework==='angular' ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts allow-same-origin allow-forms`,
      'Referrer-Policy':'no-referrer','Cache-Control':'no-store'});
    if(inject){let content='';response.setEncoding('utf8');response.on('data',chunk=>{content+=chunk;if(content.length>4*1024*1024)upstream.destroy();});response.on('end',()=>{const script=`<script src="/__devkiller/visual.js?nonce=${nonce}&amp;parent=${encodeURIComponent(parent)}&amp;revision=${target.revision}"></script>`;res.end(content.includes('</body>')?content.replace('</body>',script+'</body>'):content+script);});}
    else response.pipe(res);
  });
  upstream.setTimeout(5000,()=>upstream.destroy(new Error('Response timed out.')));
  upstream.on('error',()=>{ if (!res.headersSent) res.writeHead(502,{'Content-Type':'text/plain; charset=utf-8'}); res.end('The app did not respond. Check the panel and try restarting it.'); });
  req.pipe(upstream);
});}
const preview=createPreviewServer(()=>state.active,previewPort,{memory:qaMemory});
const comparison=createPreviewServer(()=>alternative?.active,comparisonPort,{memory:comparisonMemory});

let monitoring = false;
const timer = setInterval(async () => {
  if (state.busy || !state.active || monitoring) return;
  monitoring = true;
  try {
    if(alternative&&Date.now()>=alternative.expiresAt){await discard(alternative.active.name);alternative=null;}
    if (Date.now() >= state.expiresAt) await stop('The 30-minute limit was reached. You can start again.');
    else {
      const checked = state.active;
      try { const r = await fetch(`http://127.0.0.1:${checked.port}/`,{signal:AbortSignal.timeout(2000)}); if (!r.ok) throw new Error('HTTP '+r.status); }
      catch { if (!state.busy && state.active?.name === checked.name) { state.lastError = 'The container stopped responding. Try restarting the app.'; state.status = 'failed'; } }
    }
  } catch (error) { log(error.message,'error'); } finally { monitoring = false; }
},5000);
timer.unref();

const listen = (s,p) => new Promise((resolve,reject) => {s.once('error',reject);s.listen(p,'127.0.0.1',resolve);});
try {
  await listen(server,port); await listen(preview,previewPort);await listen(comparison,comparisonPort);
  // Own the panel ports before touching interrupted work. A duplicate launch must not recover a live process.
  projects.recover();
  runs.recover();
  await pool?.initialize();
  try{await knowledge.initialize();}catch{knowledge.error='The knowledge catalog could not be opened. Knowledge is disabled until the panel is restarted with a valid catalog.';log(knowledge.error,'error');}
  try{connection=await connectionStore.load();}catch(error){connectionError=error.message;log(connectionError,'error');}
  try {const saved=await secrets.load();apiKey=saved?validateKey(saved):'';if(apiKey)log('OpenAI key loaded from the local vault.');}
  catch {secretError='Could not open the saved key. Open Connections to replace it using this Windows user account.';log(secretError,'error');}
  state.environment = await runtime.check();
  // Only this package's containers are labeled; recover resources from an interrupted launch.
  if (state.environment.ready) await runtime.cleanup();
  state.busy = false;
  log('Panel ready. Describe an app, load the example or import app files.');
  console.log(`DevKiller available at ${origin}`);
} catch (error) { console.error('Could not open the panel:',error.message); process.exit(1); }
async function shutdown() {
  generationController?.abort();repairController?.abort();knowledgeController?.abort();apiKey='';
  clearInterval(timer);
  server.close(); preview.close();comparison.close();
  for(const entry of projectServers.values())entry.server.close();
  await pool?.close();
  try { await stop('Panel stopped.'); } catch {}
  process.exit(0);
}
process.on('SIGINT',shutdown); process.on('SIGTERM',shutdown);
