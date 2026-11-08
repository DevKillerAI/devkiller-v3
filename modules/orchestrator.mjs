// A durable, single-worker generation controller. Provider calls are never replayed.
import {randomUUID} from 'node:crypto';
export const ORCHESTRATOR_VERSION='1.0';
const runnable=new Set(['ready','paused']);
export class RunStore{
  constructor(projects){this.projects=projects;}
  use(projectId,fn){return this.projects.use(projectId,db=>{
    db.exec('CREATE TABLE IF NOT EXISTS engine_runs(id TEXT PRIMARY KEY, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS engine_run_events(seq INTEGER PRIMARY KEY,run_id TEXT NOT NULL,event TEXT NOT NULL)');
    return fn(db);
  });}
  create(job){const run={id:job.id,projectId:job.projectId,version:ORCHESTRATOR_VERSION,job:structuredClone(job),status:'ready',stage:'environment',owner:null,calls:0,maxCalls:job.generationProfile==='ultimate'?null:job.modularGeneration?5:1,outputLimit:null,usage:null,usageState:'not-started',response:null,revision:null,result:null,createdAt:Date.now(),updatedAt:Date.now()};
    this.use(run.projectId,db=>db.prepare('INSERT INTO engine_runs VALUES (?,?)').run(run.id,JSON.stringify(run)));return run;
  }
  get(projectId,id){return this.use(projectId,db=>{const row=db.prepare('SELECT state FROM engine_runs WHERE id=?').get(id);if(!row)throw new Error('Saved execution not found.');return JSON.parse(row.state);});}
  change(projectId,id,event,mutate){return this.use(projectId,db=>{db.exec('BEGIN IMMEDIATE');try{
    const row=db.prepare('SELECT state FROM engine_runs WHERE id=?').get(id);if(!row)throw new Error('Saved execution not found.');const run=JSON.parse(row.state);mutate(run);run.updatedAt=Date.now();
    db.prepare('UPDATE engine_runs SET state=? WHERE id=?').run(JSON.stringify(run),id);
    db.prepare('INSERT INTO engine_run_events(run_id,event) VALUES (?,?)').run(id,JSON.stringify({type:event,at:run.updatedAt,status:run.status,stage:run.stage,calls:run.calls,revision:run.revision,usageState:run.usageState}));db.exec('COMMIT');return run;
  }catch(error){db.exec('ROLLBACK');throw error;}});}
  claim(projectId,id){const owner=randomUUID();return this.change(projectId,id,'execution.claimed',r=>{if(!runnable.has(r.status))throw new Error('This execution cannot be resumed. No AI call was repeated.');r.status='running';r.owner=owner;r.result=null;});}
  checkpoint(run,type,patch){return this.change(run.projectId,run.id,type,r=>{if(r.status!=='running'||r.owner!==run.owner)throw new Error('Execution ownership changed.');Object.assign(r,patch);});}
  reserve(run){return this.change(run.projectId,run.id,'provider.reserved',r=>{if(r.owner!==run.owner||r.status!=='running'||(r.maxCalls!==null&&r.calls>=r.maxCalls))throw new Error('The saved AI-call limit was reached.');r.calls++;r.callInFlight=true;r.stage='generating';r.usageState='reserved';});}
  list(projectId){return this.use(projectId,db=>db.prepare('SELECT state FROM engine_runs ORDER BY rowid DESC').all().map(row=>JSON.parse(row.state)));}
  summary(run){const {response,owner,job,knowledgeContext,...safe}=run;return {...safe,knowledge:knowledgeContext?{...knowledgeContext,stages:knowledgeContext.stages?Object.fromEntries(Object.entries(knowledgeContext.stages).map(([s,c])=>[s,{...c,chunks:c.chunks.map(({content,...source})=>source)}])):undefined,chunks:knowledgeContext.chunks.map(({content,...source})=>source)}:null,designAssistance:job.designAssistance||{mode:"off",enabled:false},hasSavedResponse:!!response,canResume:run.status==='paused',model:job.model,prompt:job.prompt,events:this.use(run.projectId,db=>db.prepare('SELECT event FROM engine_run_events WHERE run_id=? ORDER BY seq').all(run.id).map(e=>JSON.parse(e.event)))};}
  recover(){for(const project of this.projects.list().projects)for(const run of this.list(project.id))if(['ready','running'].includes(run.status))this.change(project.id,run.id,'execution.recovered',r=>{
    r.owner=null;r.status=r.response||r.calls===0||(r.job.modularGeneration&&r.callInFlight===false)?'paused':'uncertain';r.usageState=r.calls&&!r.response&&r.callInFlight!==false?'unknown':r.usageState;
    r.result=r.status==='paused'?'Saved progress is ready to continue. Completed generation will not be repeated.':'The panel stopped before the AI result was saved. Usage may be unknown. This call will not be repeated automatically.';
  });}
}

export async function executeGeneration({store,projectId,id,signal,checkEnvironment,prepareContext=async()=>null,validateContext=()=>{},generate,saveVersion,deploy,onUpdate=()=>{}}){
  let run=store.claim(projectId,id);
  const update=(type,patch)=>{run=store.checkpoint(run,type,patch);onUpdate(store.summary(run));};
  try{
    onUpdate(store.summary(run));signal?.throwIfAborted();await checkEnvironment(run.job);signal?.throwIfAborted();
    if(!run.response){
      if(!Object.hasOwn(run,'knowledgeContext')){
        update('knowledge.retrieving',{stage:'retrieving'});
        const knowledgeContext=await prepareContext(run.job);
        update('knowledge.saved',{knowledgeContext});
      }
      signal?.throwIfAborted();await validateContext(run.knowledgeContext,run.job);
      if(!run.job.modularGeneration){run=store.reserve(run);onUpdate(store.summary(run));}
      const response=await generate(run.job,run.knowledgeContext,{reserve:stage=>{run=store.reserve(run);update('module.started',{moduleStage:stage.id,moduleLabel:stage.label});},checkpoint:data=>update('module.saved',{moduleStage:data.stage,moduleLabel:data.label,moduleFiles:data.files,usage:data.usage,usageState:'confirmed',callInFlight:false})});
      // Store the complete provider response before materializing files or publishing.
      update('provider.response-saved',{response,usage:response.usage||null,usageState:response.usage?'confirmed':'unknown',callInFlight:false,stage:'saving'});
    }
    signal?.throwIfAborted();
    if(!run.revision){const revision=await saveVersion(run.response,run.job);update('source.saved',{revision,stage:'deploying'});}
    signal?.throwIfAborted();update('preview.preparing',{stage:'deploying'});
    const result=await deploy(run.response,run.revision,run.job,signal);
    signal?.throwIfAborted();update('execution.completed',{status:'completed',stage:'completed',revision:result?.revision||run.revision,result,finishedAt:Date.now()});return store.summary(run);
  }catch(error){
    const cancelled=!!signal?.aborted;
    const knownFailure=['rejected','completed-invalid','incomplete'].includes(error.providerOutcome);
    const status=cancelled?'cancelled':knownFailure&&!run.response?'failed':run.response||run.calls===0||(run.job.modularGeneration&&run.callInFlight===false)?'paused':knownFailure?'failed':'uncertain';
    update('execution.stopped',{status,stage:status,usage:error.usage||run.usage||null,usageState:run.calls&&!run.response?(error.usage?'confirmed':'unknown'):run.usageState,result:error.message,finishedAt:Date.now()});
    throw error;
  }
}
