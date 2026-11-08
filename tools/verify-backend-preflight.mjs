import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {DockerRuntime} from '../modules/docker.mjs';import {inspectBackendBuild} from '../modules/backend-preflight.mjs';
const runtime=new DockerRuntime(process.cwd(),'preflight-proof');
const files=[{name:'index.html',content:'<h1>Preflight</h1>'},{name:'backend/routes.mjs',content:'export default async function(app,{db}){app.get("/count",async()=> (await db.query("SELECT COUNT(*) FROM proof")).rows[0])}'},{name:'backend/migrations/001_init.sql',content:'CREATE TABLE proof(id integer);'}];
const good=await inspectBackendBuild(runtime,files,{stack:'react-v5'});assert.equal(good.status,'passed');
const bad=await inspectBackendBuild(runtime,files.map(f=>f.name.endsWith('.sql')?{...f,content:'CREATE TABLE proof(id NOT_A_REAL_TYPE);'}:f),{stack:'react-v5'});assert.equal(bad.status,'failed');assert.match(bad.checks[0].evidence,/not_a_real_type/i);
await fs.writeFile('validation/expansion/backend-preflight.json',JSON.stringify({good,bad},null,2));console.log('Backend preflight: valid migration passed; invalid SQL returned repair evidence; both databases disposable.');
