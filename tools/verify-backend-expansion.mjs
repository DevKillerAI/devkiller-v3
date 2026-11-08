import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {DockerRuntime} from '../modules/docker.mjs';
import {inspectPreview} from '../modules/qa.mjs';
const root=path.resolve(import.meta.dirname,'..'),runtime=new DockerRuntime(root,'backend-verification'),name='dk-backend-verification',folder=path.join(root,'.runtime',name),projectId=randomUUID(),qaToken=randomUUID();
const files=[{name:'index.html',content:'<!doctype html><h1>API test</h1>'},{name:'backend/migrations/001_initial.sql',content:'CREATE TABLE items(id integer primary key, stock integer not null CHECK(stock>=0));INSERT INTO items VALUES(1,1);CREATE TABLE orders(id bigserial primary key);'}, {name:'backend/routes.mjs',content:`export default async function(app,{db}){
 app.get('/items',async()=> (await db.query('SELECT * FROM items')).rows);
 app.get('/orders',async()=> (await db.query('SELECT * FROM orders')).rows);
 app.post('/reserve',async(req,res)=>{const c=await db.connect();try{await c.query('BEGIN');const r=await c.query('UPDATE items SET stock=stock-1 WHERE id=$1 AND stock>0 RETURNING id',[1]);if(!r.rows.length){await c.query('ROLLBACK');return res.code(409).send({error:'No stock'});}await c.query('INSERT INTO orders DEFAULT VALUES');await c.query('COMMIT');return {saved:true};}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}});
}`}];
for(const f of files){const dest=path.join(folder,f.name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,f.content);}
let preview;const report={projectId,checks:[]};
try{
 await runtime.remove(name);preview=await runtime.start(name,folder,{projectId,qaToken});assert.equal((await inspectPreview(preview.port)).status,'passed');let origin='http://127.0.0.1:'+preview.port;
 const get=(url,headers={})=>fetch(origin+url,{headers}).then(r=>r.json());
 const reserve=(headers={})=>fetch(origin+'/api/reserve',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:'{}'});
 assert.equal((await get('/api/items'))[0].stock,1);
 assert.equal((await reserve({Origin:'https://unrelated.example'})).status,403);report.checks.push('Cross-origin mutation rejected at backend runtime');
 assert.equal((await reserve({'x-devkiller-qa':qaToken})).status,200);assert.equal((await get('/api/items'))[0].stock,1);report.checks.push('QA data isolated from live stock');
 const responses=await Promise.all([reserve(),reserve()]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal((await get('/api/orders')).length,1);report.checks.push('Concurrent reservations: one commit, one conflict, no overselling');
 assert.equal((await fetch(origin+'/backend/routes.mjs')).status,404);report.checks.push('Server source not exposed over HTTP');
 await runtime.remove(name);preview=await runtime.start(name,folder,{projectId,qaToken});assert.equal((await inspectPreview(preview.port)).status,'passed');origin='http://127.0.0.1:'+preview.port;
 assert.equal((await get('/api/orders')).length,1);assert.equal((await get('/api/items'))[0].stock,0);report.checks.push('PostgreSQL persisted after application restart; seed not repeated');
 report.status='passed';console.log(JSON.stringify(report));
}catch(e){report.status='failed';report.error=e.message;console.log(e.message);try{console.log((await runtime.command(['logs',name])).slice(-3000));}catch{}process.exitCode=1;}
finally{await runtime.remove(name);await fs.mkdir(path.join(root,'validation/expansion'),{recursive:true});await fs.writeFile(path.join(root,'validation/expansion/backend.json'),JSON.stringify(report,null,2));if(preview?.databaseContainer)await runtime.command(['stop',preview.databaseContainer]);}
