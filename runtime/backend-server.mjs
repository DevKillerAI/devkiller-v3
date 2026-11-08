import Fastify from 'fastify';
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
const scope=new AsyncLocalStorage(),schema='qa_'+process.env.QA_SCHEMA;
if(!/^qa_[a-f0-9]{16}$/.test(schema))throw Error('Invalid QA scope');
const base={connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:5000,statement_timeout:10000};
const live=new pg.Pool(base),qa=new pg.Pool({...base,options:`-c search_path=${schema}`});
await live.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
async function migrate(pool){
 const client=await pool.connect();try{
 await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(941035)");
 await client.query('CREATE TABLE IF NOT EXISTS _dk_migrations(name text primary key, hash text not null, applied_at timestamptz default now())');
 const names=await fs.readdir('/app/public/backend/migrations').catch(e=>{if(e.code==='ENOENT')return [];throw e;});
 for(const name of names.filter(n=>/^\d+[a-zA-Z0-9_-]*\.sql$/.test(n)).sort()){
  const sql=await fs.readFile('/app/public/backend/migrations/'+name,'utf8'),hash=createHash('sha256').update(sql).digest('hex');
  const old=await client.query('SELECT hash FROM _dk_migrations WHERE name=$1',[name]);
  if(old.rows.length){if(old.rows[0].hash!==hash)throw Error('Previously applied migration changed: '+name);continue;}
  await client.query(sql);await client.query('INSERT INTO _dk_migrations(name,hash) VALUES ($1,$2)',[name,hash]);
 }
 await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
await migrate(live);await migrate(qa);
const db={query:(...a)=>(scope.getStore()?.qa?qa:live).query(...a),connect:(...a)=>(scope.getStore()?.qa?qa:live).connect(...a)};
const app=Fastify({logger:false,bodyLimit:1024*1024,requestTimeout:15000});
app.addHook('onRequest',async(req,res)=>{
 if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin){
  let sameOrigin=false;try{sameOrigin=new URL(req.headers.origin).host===req.headers.host;}catch{}
  if(!sameOrigin)return res.code(403).send({error:'Use this application to perform the action.'});
 }
});
app.addHook('onRequest',(req,res,done)=>{scope.run({qa:!!process.env.QA_TOKEN&&req.headers['x-devkiller-qa']===process.env.QA_TOKEN},done);});
app.setErrorHandler((error,req,res)=>{res.code(error.statusCode||500).send({error:error.statusCode&&error.statusCode<500?error.message:'The server could not complete this action. Your changes were not confirmed.'});});
await fs.cp('/app/public/backend','/tmp/backend',{recursive:true});
await fs.symlink('/opt/backend/node_modules','/tmp/backend/node_modules');
const {default:register}=await import('/tmp/backend/routes.mjs');
await app.register(async instance=>register(instance,{db}),{prefix:'/api'});
app.get('/__backend/health',async()=>{await live.query('SELECT 1');return {ready:true,database:'PostgreSQL'};});
app.post('/__backend/reset-qa',async(req,res)=>{
 if(!process.env.QA_TOKEN||req.headers['x-devkiller-qa']!==process.env.QA_TOKEN)return res.code(403).send();
 await live.query(`DROP SCHEMA ${schema} CASCADE`);await live.query(`CREATE SCHEMA ${schema}`);await migrate(qa);return {reset:true};
});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.txt':'text/plain','.svg':'image/svg+xml'};
app.setNotFoundHandler(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)||req.url.startsWith('/api/'))return res.code(404).send({error:'Not found'});
 const name=decodeURIComponent(new URL(req.url,'http://local').pathname),root='/app/public',file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+'/')&&file!==root||name.split('/').includes('backend'))return res.code(404).send();
 for(const candidate of [file,path.join(file,'index.html'),path.join(root,'index.html')]){try{if(!(await fs.stat(candidate)).isFile())continue;return res.type(types[path.extname(candidate)]||'application/octet-stream').header('Cache-Control','no-store').send(await fs.readFile(candidate));}catch{}}
 return res.code(404).send();
});
await app.listen({host:'0.0.0.0',port:8080});
const previewTtl=Number(process.env.PREVIEW_TTL_MS||0);if(previewTtl>0)setTimeout(()=>process.exit(0),previewTtl).unref();
process.on('SIGTERM',async()=>{await app.close();await live.end();await qa.end();process.exit(0);});
