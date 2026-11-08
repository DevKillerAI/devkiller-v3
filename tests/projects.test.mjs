import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ProjectStore} from '../modules/projects.mjs';
import {reactFiles} from './react-fixture.mjs';

test('banco por projeto preserva código, histórico e dados sem misturar aplicativos',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'devkiller-projects-'));
 try{let store=new ProjectStore(root);const a=store.create({title:'A',prompt:'Pedido original'}),b=store.create({title:'B'});
 const files=[{name:'index.html',content:'<h1>Versão 1</h1>'}];const v1=store.saveVersion(a.id,files),v2=store.saveVersion(a.id,[{name:'index.html',content:'<h1>Versão 2</h1>'}]);
 store.update(a.id,{selectedVersion:v1});store.data(a.id,'PUT','tarefas',[{nome:'Persistir'}]);store.data(b.id,'PUT','tarefas',[]);
 store.saveArtifact(a.id,v1,{files,stack:'static-v1',compiled:false});
 const folder=path.join(path.dirname(store.file(a.id)),'versions',String(v1));
 assert.equal(fs.readFileSync(path.join(folder,'source','index.html'),'utf8'),files[0].content);assert.equal(fs.readFileSync(path.join(folder,'preview','index.html'),'utf8'),files[0].content);assert.equal(JSON.parse(fs.readFileSync(path.join(folder,'environment.json'),'utf8')).profile,'static-v1');
 store.job(a.id,{id:'job',type:'generation',status:'running',called:true,prompt:a.prompt});store.event(a.id,'Arquivos recebidos');
 store=new ProjectStore(root);store.recover();assert.deepEqual(store.version(a.id,v1).files,files);assert.equal(store.version(a.id,v2).files[0].content,'<h1>Versão 2</h1>');assert.equal(store.info(a.id).selectedVersion,v1);
 assert.deepEqual(store.data(a.id,'GET','tarefas'),[{nome:'Persistir'}]);assert.deepEqual(store.data(b.id,'GET','tarefas'),[]);
 assert.equal(store.details(a.id).jobs[0].status,'interrupted');assert.equal(store.details(a.id).events.length,1);assert.notEqual(store.file(a.id),store.file(b.id));
 assert.throws(()=>store.info('../outro'));assert.throws(()=>store.data(a.id,'PUT','grande','a'.repeat(300000)),/256 KB/);assert.equal(store.data(a.id,'GET','grande'),null);
 store.data(a.id,'DELETE','tarefas');assert.equal(store.data(a.id,'GET','tarefas'),null);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('versões React mantêm dependências próprias ao ampliar o perfil',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'devkiller-profiles-'));
 try{let store=new ProjectStore(root);const p=store.create({title:'Perfis'});
 const legacy=store.saveVersion(p.id,reactFiles,{stack:'react-v1'}),next=store.saveVersion(p.id,reactFiles,{stack:'react-v2'});
 store=new ProjectStore(root);
 const oldPkg=JSON.parse(store.sourcePackage(p.id,legacy).find(f=>f.name==='package.json').content);
 const newPkg=JSON.parse(store.sourcePackage(p.id,next).find(f=>f.name==='package.json').content);
 assert.equal(oldPkg.dependencies.recharts,undefined);assert.equal(newPkg.dependencies.recharts,'3.10.1');
 for(const version of [legacy,next]){const folder=path.join(path.dirname(store.file(p.id)),'versions',String(version));const environment=JSON.parse(fs.readFileSync(path.join(folder,'environment.json'),'utf8'));assert.equal(environment.dependencies.recharts,version===next?'3.10.1':undefined);assert.equal(fs.readFileSync(path.join(folder,'source','src','App.jsx'),'utf8'),reactFiles[0].content);}
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
