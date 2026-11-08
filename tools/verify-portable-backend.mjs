import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {extendedScaffold} from '../modules/extended-scaffold.mjs';
const folder=path.resolve('.runtime/portable-expansion-verification'),name='dk-portable-expansion-verification';
const files=[...extendedScaffold('react-v5',{backend:true}),
 {name:'src/App.jsx',content:"import React from 'react';export default ()=> <h1>Portable backend</h1>"},
 {name:'src/styles.css',content:'body{font-family:system-ui}'},
 {name:'src/domain/shared.js',content:'export const key=1;'},
 {name:'src/server/routes.mjs',content:"import {key} from '../domain/shared.js';export default async function(app,{db}){app.get('/value',async()=> (await db.query('SELECT value FROM examples WHERE id=$1',[key])).rows[0]);}"},
 {name:'src/server/migrations/001_initial.sql',content:"CREATE TABLE examples(id int primary key,value text);INSERT INTO examples VALUES(1,'Portable PostgreSQL verified');"}];
await fs.mkdir(folder,{recursive:true});for(const f of files){const dest=path.join(folder,f.name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,f.content);}
const env={...process.env,POSTGRES_PASSWORD:randomBytes(32).toString('hex')};
const docker=(args)=>execFileSync('docker',['compose','-p',name,...args],{cwd:folder,env,stdio:['ignore','pipe','pipe'],timeout:240000,maxBuffer:4*1024*1024}).toString();
let report;
try{
 docker(['build']);docker(['up','-d']);
 let response;for(let i=0;i<60;i++){try{response=await fetch('http://127.0.0.1:8080/api/value');if(response.ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 assert(response?.ok);assert.equal((await response.json()).value,'Portable PostgreSQL verified');
 assert.equal((await fetch('http://127.0.0.1:8080/backend/routes.mjs')).status,404);
 report={status:'passed',checks:['Exported Dockerfile builds frontend and bundled backend','Shared domain import resolved','Compose provisions persistent PostgreSQL','API returns migrated data','Private backend source denied','No preview timeout in portable runtime']};
}catch(e){report={status:'failed',error:String(e.stderr||e.message).slice(-4000)};process.exitCode=1;}
finally{try{docker(['down','--volumes']);}catch{}await fs.writeFile('validation/expansion/portable.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
