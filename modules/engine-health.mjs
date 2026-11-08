import {tasteStatus} from './taste.mjs';
import {EXTENDED_STACKS} from './extended-stacks.mjs';
import os from 'node:os';
import fs from 'node:fs/promises';
import {GENERATION_LIMITS,MODEL} from './openai.mjs';
import {BUILD_LIMITS,buildLimits,compilerImage} from './compiler.mjs';
import {REACT,REACT_DESIGN,REACT_STUDIO,REACT_PRO} from './stacks.mjs';

const cpuTicks=()=>os.cpus().reduce((sum,cpu)=>({idle:sum.idle+cpu.times.idle,total:sum.total+Object.values(cpu.times).reduce((a,b)=>a+b,0)}),{idle:0,total:0});
export function summarizeProjects(store){
 const listing=store.list(),result={projects:listing.projects.length,versions:0,records:0,jobs:0,completed:0,failed:0,inputTokens:0,outputTokens:0,unknownUsage:0,errors:listing.errors.length,recent:[]};
 for(const item of listing.projects){try{const p=store.details(item.id);result.versions+=p.versions.length;result.records+=p.dataRecords;
   for(const job of p.jobs){result.jobs++;if(job.status==='completed')result.completed++;if(['failed','not-fixed','no-progress','interrupted'].includes(job.status))result.failed++;if(job.called&&!job.usage)result.unknownUsage++;result.inputTokens+=(job.totalUsage||job.usage)?.input||0;result.outputTokens+=(job.totalUsage||job.usage)?.output||0;
     result.recent.push({id:job.id,type:job.type,status:job.status,called:!!job.called,startedAt:job.startedAt,finishedAt:job.finishedAt,outputTokens:job.usage?.output??null});}
 }catch{result.errors++;}}
 result.recent.sort((a,b)=>b.startedAt-a.startedAt);result.recent=result.recent.slice(0,6);return result;
}
export class EngineHealth{
 constructor({runtime,store,getState,secretConfigured,secretError,getConnection=()=>({model:MODEL})}){Object.assign(this,{runtime,store,getState,secretConfigured,secretError,getConnection});this.previousCpu=cpuTicks();this.lastCpu=Date.now();this.cache=null;this.inflight=null;this.checks=null;this.checkTime=0;}
 async sample({fresh=false}={}){
   if(!fresh&&this.cache&&Date.now()-this.cache.sampledAt<4000)return this.cache;
   if(this.inflight)return this.inflight;
   this.inflight=this.collect().finally(()=>{this.inflight=null});return this.inflight;
 }
 async collect(){
   const now=Date.now(),cpu=cpuTicks(),elapsed=cpu.total-this.previousCpu.total;
   const cpuPercent=now-this.lastCpu>=500&&elapsed>0?Math.max(0,Math.min(100,100*(1-(cpu.idle-this.previousCpu.idle)/elapsed))):null;this.previousCpu=cpu;this.lastCpu=now;
   if(!this.checks||now-this.checkTime>30000){
     const [docker,v1,v2,v3,v4]=await Promise.allSettled([this.runtime.check(),this.runtime.command(['image','inspect',compilerImage(REACT),'--format','{{.Id}}'],8000),this.runtime.command(['image','inspect',compilerImage(REACT_DESIGN),'--format','{{.Id}}'],8000),this.runtime.command(['image','inspect',compilerImage(REACT_STUDIO),'--format','{{.Id}}'],8000),this.runtime.command(['image','inspect',compilerImage(REACT_PRO),'--format','{{.Id}}'],8000)]);
     this.checks={docker:docker.status==='fulfilled'?docker.value:{ready:false,message:'Could not check Docker.'},react1:v1.status==='fulfilled',react2:v2.status==='fulfilled',react3:v3.status==='fulfilled',react4:v4.status==='fulfilled'};this.checks.extended=await Promise.all(EXTENDED_STACKS.map(async p=>({id:p.id,label:p.label,ready:await this.runtime.command(['image','inspect',p.image],8000).then(()=>true,()=>false)})));this.checks.backend=await this.runtime.command(['image','inspect','devkiller-backend:1','postgres:17-alpine'],8000).then(()=>true,()=>false);this.checkTime=Date.now();
   }
   let storage;try{storage=summarizeProjects(this.store);}catch{storage={projects:null,versions:null,records:null,jobs:0,completed:0,failed:0,inputTokens:0,outputTokens:0,unknownUsage:0,errors:1,recent:[]};}
   let disk=null;try{const stat=await fs.statfs(this.store.root);disk={freeBytes:stat.bavail*stat.bsize,totalBytes:stat.blocks*stat.bsize};}catch{}
   const state=this.getState(),configured=this.secretConfigured(),secretProblem=this.secretError()||this.getConnection().error;
   const allBuildersReady=this.checks.extended.every(p=>p.ready)&&this.checks.backend;
   const components=[
     {id:'runtime',name:'Executor',detail:this.checks.docker.message,status:this.checks.docker.ready?'ready':'blocked'},
     {id:'compiler',name:'Application builders',detail:allBuildersReady?'React Complete, shadcn source registry, Three.js, Vue, Angular and Next profiles. See installed capability readings below.':'Run Preparar.ps1 to install the full build profile.',status:allBuildersReady?'ready':'blocked'},
     {id:'storage',name:'Projects and data',detail:storage.errors?'A database could not be read. Its files have been preserved.':'Local databases accessible. Each app has separate project records and data.',status:storage.errors?'warning':'ready'},
     {id:'provider',name:'AI connection',detail:secretProblem?'Could not load connection settings or the key. Open Connections.':configured?'Key saved. Balance and model access are checked when a request is made.':'Add your key in Connections to generate with AI.',status:configured&&!secretProblem?'configured':'warning'}
   ];
   const ready=components.every(c=>['ready','configured'].includes(c.status));
   this.cache={name:'DevKiller Engine',version:'0.14.0',sampledAt:Date.now(),checksAt:this.checkTime,ready,status:ready?'ready':components.some(c=>c.status==='blocked')?'blocked':'attention',components,
     machine:{cpuPercent,memoryTotal:os.totalmem(),memoryUsed:os.totalmem()-os.freemem(),cores:os.cpus().length,platform:process.platform,processMemory:process.memoryUsage().rss,uptimeSeconds:Math.floor(process.uptime()),disk},
     activity:{busy:state.busy,stage:state.status,previewActive:!!state.active,expiresAt:state.expiresAt,quality:state.quality?.status||null},storage,
     capacity:{designAssistance:tasteStatus(),model:this.getConnection().model,generation:state.generationProfile?.id==='ultimate'?{...GENERATION_LIMITS,outputTokens:state.generationProfile.outputTokens,seconds:state.generationProfile.timeoutMs/1000,calls:null}:GENERATION_LIMITS,build:state.activeStack?buildLimits(state.activeStack):BUILD_LIMITS,preview:{memoryMB:state.active?.backend?384:128,cpu:state.active?.backend?1:0.5,minutes:30,concurrent:1,databaseMemoryMB:384,gatewayMemoryMB:64},data:{recordKB:256,recordsPerApp:1000,totalMB:10},files:{count:80,totalMB:2},profiles:{static:true,react1:this.checks.react1,react2:this.checks.react2,react3:this.checks.react3,react4:this.checks.react4},frameworks:this.checks.extended,backend:this.checks.backend?'Generated Fastify APIs and per-project PostgreSQL available. Isolated QA data, transactional migrations and persistent volumes. Authentication and external service credentials need separate configuration.':'Backend setup incomplete: install Fastify runtime and PostgreSQL images.'}};
   return this.cache;
 }
}
