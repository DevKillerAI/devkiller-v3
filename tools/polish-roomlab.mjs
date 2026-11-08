// User-authorized polish; creates a new source version and preserves original/data.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ProjectStore} from '../modules/projects.mjs';
import {digest} from '../modules/knowledge.mjs';
import {AppCompiler} from '../modules/compiler.mjs';
import {DockerRuntime} from '../modules/docker.mjs';
const store=new ProjectStore('projects/4310'),id='46ee1b69-734a-4406-bf75-0324d0d0e060';
const state=await(await fetch('http://127.0.0.1:4310/api/state')).json();if(state.busy)throw new Error('Engine busy.');
const original=store.version(id,1),originalHash=digest(JSON.stringify(original.files));
const dataHash=()=>store.use(id,db=>digest(JSON.stringify(db.prepare('SELECT key,value FROM app_data ORDER BY key').all()))),before=dataHash();
const files=original.files.map(f=>({...f,content:f.content.replace('.mobile-bar,.mobile-panel-head,.drawer-wrap{display:contents}', '.mobile-bar,.mobile-panel-head{display:none}.drawer-wrap{display:contents}')}));
assert.notEqual(digest(JSON.stringify(files)),originalHash);
const build=await new AppCompiler(new DockerRuntime(process.cwd(),'roomlab-polish')).prepare(files,{stack:original.info.stack});
const old=store.details(id).versions.find(v=>v.info.polish==='desktop-mobile-controls-2026-09-14');
const {jobId,scaffold,...info}=original.info;
const version=old?.id??store.saveVersion(id,files,{...info,status:'saved',quality:null,polish:'desktop-mobile-controls-2026-09-14',summary:'Desktop/mobile visibility polish by Codex. Original AI version preserved.',basedOn:1});
store.saveArtifact(id,version,build);assert.equal(digest(JSON.stringify(store.version(id,1).files)),originalHash);assert.equal(dataHash(),before);
await fs.mkdir('validation/studio-v1',{recursive:true});await fs.writeFile('validation/studio-v1/roomlab.json',JSON.stringify({project:id,version,basedOn:1,originalSourcePreserved:true,dataPreserved:true,compiled:true,paidGenerationCalls:0,change:'Hide mobile-only bars and panel headings on desktop; retain existing mobile styles',authorship:'Codex polish, not model regeneration'},null,2));console.log(JSON.stringify({project:id,version,compiled:true,dataPreserved:true}));
