import fs from 'node:fs/promises';
import {AnythingLLMKnowledge} from './anythingllm-knowledge.mjs';
import {contextPayload,digest,KNOWLEDGE_LIMITS} from './knowledge.mjs';
import {tokenCount} from './knowledge-embeddings.mjs';

export const STAGE_COLLECTIONS=Object.freeze({
 planning:['DESIGN_INTELLIGENCE'],
 foundation:['UI_COMPONENT_SYSTEMS','SECURITY_ACCESSIBILITY'],
 features:['DESIGN_INTELLIGENCE','UI_COMPONENT_SYSTEMS'],
 integration:['FUNCTIONAL_QA','SECURITY_ACCESSIBILITY'],
 'visual-review':['VISUAL_QA'],
 repair:['FUNCTIONAL_QA','UI_COMPONENT_SYSTEMS','VISUAL_QA']
});
const queries={
 DESIGN_INTELLIGENCE:'Product-specific art direction, typography, hierarchy, composition, relevant photography, responsive states. Distinguish a working application from a marketing website.',
 UI_COMPONENT_SYSTEMS:'Focused module contracts, accessible component composition, imports, controlled state, design tokens and consistent styling. Use only the supported Engine stack.',
 FUNCTIONAL_QA:'Playwright Best Practices: test user-visible behavior, isolated tests, user-facing locators, web-first assertions, persistence, empty/error states. Distinguish application defects from test defects.',
 SECURITY_ACCESSIBILITY:'Requirements relevant to this application: input validation, safe rendering, keyboard interaction, focus, contrast and data integrity. Do not add unrequested authentication or services.',
 VISUAL_QA:'Rendered desktop and mobile review: readable contrast, spacing, overlap, image relevance, typography and interaction states. Separate observed defects from aesthetic suggestions.'
};
const coreTopics={
 planning:/motion|animation|design|composition|product|direção|typograph|visual|three|webgl|3d|glass|gsap|material/i,
 foundation:/motion|animation|persist|database|banco|forms|react|stack|dates|money|validation|postgre|backend|migration|shadcn|three|webgl|3d|glass|gsap|angular|vue|next|component|transaction/i,
 features:/motion|animation|design|visual|three|webgl|3d|glass|material|gsap|shader|layout|responsive|photograph/i,
 integration:/motion|animation|persist|database|banco|forms|react|dates|money|validation|test|cenário|error|postgre|backend|migration|three|webgl|3d|glass|material|gsap|angular|vue|next|transaction/i,
 'visual-review':/motion|animation|design|visual|composition|photograph|responsive|layout|three|webgl|3d|glass|gsap|material|shader/i
};
export function stageContext(context,stage){return context?.stages?.[stage]||context;}
export class StageKnowledge extends AnythingLLMKnowledge{
 constructor(directory,{stageManifestFile=new URL('../knowledge/stage-collections.json',import.meta.url),...options}={}){super(directory,options);this.stageManifestFile=stageManifestFile;}
 async initialize(){
  await super.initialize();this.stageCatalog=JSON.parse(await fs.readFile(this.stageManifestFile,'utf8'));
  const ids=new Set();
  for(const d of this.stageCatalog.documents){
   const ws=this.stageCatalog.workspaces[d.group];
   if(!/^DS\d{3}(?:-V\d+)?$/.test(d.id)||ids.has(d.id)||!ws||ws.slug!=='dk_'+d.group.toLowerCase()||!/^[a-f0-9]{64}$/.test(d.hash)||!d.location||typeof d.title!=='string')throw Error('Invalid specialist knowledge catalog.');ids.add(d.id);
  }
  this.stageHash=digest(JSON.stringify(this.stageCatalog));return this.status();
 }
 status(){return {...super.status(),stageRouting:this.stageCatalog?{version:1,collections:Object.values(this.stageCatalog.workspaces),documents:this.stageCatalog.documents.length,stages:STAGE_COLLECTIONS,maxContextTokens:4000,maxSpecialistSearches:5}:null};}
 async retrieve(options={}){
  const stages=options.stages||[];
  for(const stage of stages)if(!Object.hasOwn(STAGE_COLLECTIONS,stage))throw Error('Unknown RAG stage.');
  const base=await super.retrieve(options);
  if(base.mode!=='anythingllm'||!stages.length)return base;
  const groups=[...new Set(stages.flatMap(s=>STAGE_COLLECTIONS[s]))];
  const hits={},warnings=[];let calls=0;
  const specialistTimeout=AbortSignal.timeout(30000),specialistSignal=options.signal?AbortSignal.any([options.signal,specialistTimeout]):specialistTimeout;
  const coreConnection=this.connection;
  for(const group of groups){
   options.signal?.throwIfAborted();
   if(specialistTimeout.aborted){hits[group]=[];warnings.push({group,reason:'Specialist retrieval time budget reached; core library preserved.'});continue;}
   calls++;
   try{
    const r=await this.api('/vector-search',{query:queries[group]+'\nApplication request: '+options.query.slice(0,3500),topN:8,scoreThreshold:0.2},specialistSignal,this.stageCatalog.workspaces[group].slug);
    if(!Array.isArray(r.results))throw Error('Invalid results');
    // Benchmark READMEs describe evaluations, not implementation recipes. Keep them
    // searchable in AnythingLLM research chats, outside production stage prompts.
    const eligible=new Map(this.stageCatalog.documents.filter(d=>d.group===group&&d.role!=='evaluation-methodology').map(d=>[d.id,d]));const seen=new Set();hits[group]=[];
    for(const h of r.results.sort((a,b)=>b.score-a.score)){
     const d=eligible.get(h.metadata?.chunkSource);
     if(!d||seen.has(d.id)||typeof h.text!=='string'||!h.text.trim()||h.text.length>60000||!Number.isFinite(h.score)||h.score<0.2)continue;
     const chunk={id:d.id,title:d.title,source:d.url,workspace:this.stageCatalog.workspaces[group].slug,group,content:h.text,hash:digest(h.text),catalogHash:d.hash,methods:['anythingllm-specialist-vector'],score:h.score};
     if(tokenCount(contextPayload({chunks:[chunk]}))>1900)continue;
     hits[group].push(chunk);seen.add(d.id);
    }
    if(!hits[group].length)warnings.push({group,reason:'No eligible specialist reference was found; the core library remains in use.'});
   }catch(error){options.signal?.throwIfAborted();this.connection=coreConnection;hits[group]=[];warnings.push({group,reason:'Specialist retrieval unavailable; the verified core library remains in use. No retry.'});}
  }
  base.stages={};base.routing={version:1,catalogHash:this.stageHash,searchCalls:calls,warnings,groups};
  for(const stage of stages){
   const c={version:base.version,requestedMode:base.requestedMode,mode:base.mode,provider:base.provider,stage,indexVersion:digest(base.indexVersion+this.stageHash),chunks:[],reason:'Stage-specific references; external material is advisory and does not enable new dependencies.'};
   const push=(chunk,limit=4000)=>{if(c.chunks.some(d=>d.id===chunk.id)||c.chunks.length>=6)return false;c.chunks.push(chunk);if(tokenCount(contextPayload(c))>limit){c.chunks.pop();return false;}return true;};
   // Retain verified Engine recipes/contracts first; reserve space for specialist evidence.
   const core=base.chunks.filter(chunk=>!coreTopics[stage]||coreTopics[stage].test(chunk.title));
   for(const chunk of core){if(c.chunks.length>=3)break;push(chunk,2000);}
   for(const group of STAGE_COLLECTIONS[stage])for(const chunk of hits[group]||[])if(push(chunk))break;
   for(const group of STAGE_COLLECTIONS[stage])for(const chunk of hits[group]||[])if(push(chunk))break;
   for(const chunk of core)push(chunk);
   c.tokens=tokenCount(contextPayload(c));c.hash=digest(contextPayload(c));
   c.specialistReferences=c.chunks.filter(d=>d.group).length;base.stages[stage]=c;
  }
  base.usage.specialistRetrievalCalls=calls;base.usage.retrievalCalls+=calls;
  return base;
 }
 async validateContext(context,stack){
  await super.validateContext(context,stack);
  if(!context?.stages)return;
  if(context.routing?.catalogHash!==this.stageHash)throw Error('RAG specialist catalog changed; start a new generation.');
  const core=new Map(context.chunks.map(d=>[d.id,d])),catalog=new Map(this.stageCatalog.documents.map(d=>[d.id,d]));
  const inventories=new Map();
  for(const [stage,c] of Object.entries(context.stages)){
   if(!STAGE_COLLECTIONS[stage]||c.stage!==stage||c.indexVersion!==digest(context.indexVersion+this.stageHash)||c.hash!==digest(contextPayload(c))||tokenCount(contextPayload(c))>KNOWLEDGE_LIMITS.contextTokens||c.chunks.length>6)throw Error('Invalid saved stage knowledge.');
   for(const chunk of c.chunks){
    if(!chunk.group){if(core.get(chunk.id)?.hash!==chunk.hash||digest(chunk.content)!==chunk.hash)throw Error('Core stage reference changed.');continue;}
    const d=catalog.get(chunk.id);
    if(!d||!STAGE_COLLECTIONS[stage].includes(d.group)||chunk.group!==d.group||chunk.catalogHash!==d.hash||chunk.hash!==digest(chunk.content)||chunk.workspace!==this.stageCatalog.workspaces[d.group].slug)throw Error('Invalid specialist stage source.');
    if(!inventories.has(d.group)){const r=await this.api('',undefined,undefined,chunk.workspace);const w=Array.isArray(r.workspace)?r.workspace[0]:r.workspace;if(w?.slug!==chunk.workspace||!Array.isArray(w.documents))throw Error('Invalid specialist inventory.');inventories.set(d.group,new Set(w.documents.map(x=>x.docpath)));}
    if(!inventories.get(d.group).has(d.location))throw Error('A saved specialist source was removed; start a new generation.');
   }
  }
 }
}
