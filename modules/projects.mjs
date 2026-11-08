import {extendedProfile} from './extended-stacks.mjs';
import {extendedScaffold} from './extended-scaffold.mjs';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateFiles} from './files.mjs';
import {validateSource,STATIC,REACT_DESIGN,REACT_STUDIO,REACT_PRO,isReact,isCompiled} from './stacks.mjs';
import {buildLimits} from './compiler.mjs';
import {indexHtml,mainJsx,viteConfig} from '../compiler/scaffold.mjs';

const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const encode=value=>JSON.stringify(value);
function reactScaffold(stack,files=[]){if(extendedProfile(stack))return extendedScaffold(stack,{backend:files.some(f=>f.name.startsWith("src/server/"))});const folder=stack===REACT_PRO?'../compiler/pro-v4/':stack===REACT_STUDIO?'../compiler/studio/':stack===REACT_DESIGN?'../compiler/':'../compiler/legacy/';const pkg=JSON.parse(fs.readFileSync(new URL(folder+'package.json',import.meta.url),'utf8'));return [{name:'README.md',content:'# Generated application\n\nSource: src/. Entry: main.jsx. Build: npm ci, then npm run build. Development: npm run dev. Dependencies are pinned in package-lock.json.\n\nThe Engine supplies /__devkiller/db.js and approved media routes in the preview. This source package does not contain a standalone database server: those routes must be provided when deploying elsewhere. No credentials are included. Each Engine project has its own SQLite database outside the source directory. environment.json next to this folder records the runtime profile.\n\nGenerated acceptance scenarios and diagnostics are stored with the project version. A successful build is not proof that all requested behavior passed.\n'},{name:'index.html',content:indexHtml},{name:'main.jsx',content:mainJsx},{name:'vite.config.mjs',content:stack===REACT_PRO?viteConfig.replace("plugins:[react()]","plugins:[react(),tailwindcss()]").replace("import {defineConfig}","import tailwindcss from '@tailwindcss/vite';import {defineConfig}"):viteConfig},{name:'package.json',content:JSON.stringify({...pkg,scripts:{dev:'vite --host 127.0.0.1',build:'vite build',preview:'vite preview --host 127.0.0.1'}},null,2)},{name:'package-lock.json',content:fs.readFileSync(new URL(folder+'package-lock.json',import.meta.url),'utf8')}];}
export class ProjectStore {
  constructor(root){this.root=path.resolve(root);fs.mkdirSync(this.root,{recursive:true});}
  file(id){if(!uuid.test(id||''))throw new Error('Invalid project.');return path.join(this.root,id,'application.sqlite');}
  use(id,fn){const file=this.file(id);if(!fs.existsSync(file))throw new Error('Project not found.');const db=new DatabaseSync(file,{timeout:3000});try{db.exec('PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;');return fn(db);}finally{db.close();}}
  create({title='Novo aplicativo',prompt=null}={}){
    const id=randomUUID(),file=this.file(id);fs.mkdirSync(path.dirname(file),{recursive:true});
    const db=new DatabaseSync(file);
    try{db.exec(`PRAGMA synchronous=FULL;
      CREATE TABLE project (id TEXT PRIMARY KEY, info TEXT NOT NULL);
      CREATE TABLE versions (id INTEGER PRIMARY KEY, created INTEGER NOT NULL, info TEXT NOT NULL, files TEXT NOT NULL);
      CREATE TABLE jobs (id TEXT PRIMARY KEY, info TEXT NOT NULL);
      CREATE TABLE events (id INTEGER PRIMARY KEY, created INTEGER NOT NULL, message TEXT NOT NULL, kind TEXT NOT NULL);
      CREATE TABLE app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated INTEGER NOT NULL);
      PRAGMA user_version=1;`);
      const now=Date.now();db.prepare('INSERT INTO project VALUES (?,?)').run(id,encode({id,title,prompt,createdAt:now,updatedAt:now,selectedVersion:null,previewPort:null}));
    }finally{db.close();}return this.info(id);
  }
  info(id){return this.use(id,db=>JSON.parse(db.prepare('SELECT info FROM project WHERE id=?').get(id).info));}
  update(id,patch){return this.use(id,db=>{const info=JSON.parse(db.prepare('SELECT info FROM project WHERE id=?').get(id).info);const updated={...info,...patch,id,updatedAt:Date.now()};db.prepare('UPDATE project SET info=? WHERE id=?').run(encode(updated),id);return updated;});}
  list(){const projects=[],errors=[];for(const entry of fs.readdirSync(this.root,{withFileTypes:true})){if(!entry.isDirectory()||!uuid.test(entry.name))continue;try{projects.push(this.info(entry.name));}catch{errors.push({id:entry.name,message:'Could not read this project. Its files were preserved.'});}}return {projects:projects.sort((a,b)=>b.updatedAt-a.updatedAt),errors};}
  saveVersion(id,files,info={}){
    validateSource(files,info.stack||STATIC);
    if(isCompiled(info.stack))info={...info,scaffold:reactScaffold(info.stack,files)};
    const version=this.use(id,db=>{db.exec('BEGIN IMMEDIATE');try{
      if(info.jobId){const previous=db.prepare('SELECT id,files FROM versions WHERE json_extract(info,\'$.jobId\')=?').get(info.jobId);if(previous){if(previous.files!==encode(files))throw new Error('This execution already saved different files.');db.exec('COMMIT');return Number(previous.id);}}
      const version=Number(db.prepare('SELECT COALESCE(MAX(id),0)+1 AS n FROM versions').get().n);db.prepare('INSERT INTO versions VALUES (?,?,?,?)').run(version,Date.now(),encode({status:'saved',...info}),encode(files));db.exec('COMMIT');return version;}catch(e){db.exec('ROLLBACK');throw e;}});
    this.materialize(id,version,'source',this.sourcePackage(id,version));return version;
  }
  sourcePackage(id,version){const saved=this.version(id,version);if(!isCompiled(saved.info.stack))return saved.files;return [...saved.files,...(saved.info.scaffold||reactScaffold(saved.info.stack,saved.files))];}
  materialize(id,version,kind,files){
    const parent=path.join(path.dirname(this.file(id)),'versions',String(version));fs.mkdirSync(parent,{recursive:true});
    const destination=path.join(parent,kind);if(fs.existsSync(destination))return;
    const staging=path.join(parent,kind+'-'+randomUUID()+'.pending');fs.mkdirSync(staging);
    for(const file of files){const dest=path.resolve(staging,...file.name.split('/'));if(!dest.startsWith(staging+path.sep))throw new Error('File outside the version folder.');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,file.content,'utf8');}
    fs.renameSync(staging,destination);
    fs.writeFileSync(path.join(parent,'environment.json'),JSON.stringify({profile:this.version(id,version).info.stack||STATIC,database:this.version(id,version).files.some(f=>f.name==='src/server/routes.mjs')?'Project-specific PostgreSQL Docker volume (credentials in backend vault)':'Project-specific SQLite',preview:'Local Docker',buildLimits:buildLimits(this.version(id,version).info.stack),dependencies:isCompiled(this.version(id,version).info.stack)?JSON.parse(this.sourcePackage(id,version).find(f=>f.name==='package.json').content).dependencies:{}},null,2));
  }
  version(id,version){if(!Number.isSafeInteger(version)||version<1)throw new Error('Invalid version.');return this.use(id,db=>{const row=db.prepare('SELECT * FROM versions WHERE id=?').get(version);if(!row)throw new Error('Version not found.');return {...row,info:JSON.parse(row.info),files:JSON.parse(row.files)};});}
  markVersion(id,version,patch){this.use(id,db=>{const row=db.prepare('SELECT info FROM versions WHERE id=?').get(version);if(!row)throw new Error('Version not found.');db.prepare('UPDATE versions SET info=? WHERE id=?').run(encode({...JSON.parse(row.info),...patch}),version);});}
  artifact(id,version){return this.use(id,db=>{if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='artifacts'").get())return null;const row=db.prepare('SELECT result FROM artifacts WHERE version=?').get(version);return row?JSON.parse(row.result):null;});}
  saveArtifact(id,version,result){validateFiles(result.files,{maxBytes:24*1024*1024,maxFiles:512,namePattern:/^[a-zA-Z0-9_./ ()%\[\]-]+$/,extensions:['.html','.js','.css','.json','.txt','.svg','.mjs','.sql']});this.use(id,db=>{db.exec('CREATE TABLE IF NOT EXISTS artifacts(version INTEGER PRIMARY KEY, result TEXT NOT NULL)');db.prepare('INSERT INTO artifacts VALUES (?,?) ON CONFLICT(version) DO UPDATE SET result=excluded.result').run(version,encode(result));});this.materialize(id,version,'preview',result.files);const {files,...build}=result;fs.writeFileSync(path.join(path.dirname(this.file(id)),'versions',String(version),'environment.json'),JSON.stringify({profile:result.stack,runtime:{type:'Docker',memoryMB:result.files.some(f=>f.name==='backend/routes.mjs')?384:128,cpu:result.files.some(f=>f.name==='backend/routes.mjs')?1:0.5,minutes:30},database:result.files.some(f=>f.name==='backend/routes.mjs')?'PostgreSQL with persistent per-project volume':'SQLite project adapter',build,buildLimits:buildLimits(this.version(id,version).info.stack)},null,2));}
  job(id,job){this.use(id,db=>{db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO jobs VALUES (?,?) ON CONFLICT(id) DO UPDATE SET info=excluded.info').run(job.id,encode(job));const info=JSON.parse(db.prepare('SELECT info FROM project WHERE id=?').get(id).info);info.updatedAt=Date.now();db.prepare('UPDATE project SET info=? WHERE id=?').run(encode(info),id);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}});}
  event(id,message,kind='info'){this.use(id,db=>db.prepare('INSERT INTO events(created,message,kind) VALUES (?,?,?)').run(Date.now(),message,kind));}
  details(id){return this.use(id,db=>({
    ...JSON.parse(db.prepare('SELECT info FROM project WHERE id=?').get(id).info),
    versions:db.prepare('SELECT id,created,info FROM versions ORDER BY id DESC').all().map(v=>{const {scaffold,...info}=JSON.parse(v.info);return {...v,info};}),
    jobs:db.prepare('SELECT info FROM jobs ORDER BY rowid DESC').all().map(j=>JSON.parse(j.info)),
    events:db.prepare('SELECT created,message,kind FROM events ORDER BY id DESC LIMIT 100').all(),
    dataRecords:Number(db.prepare('SELECT COUNT(*) AS n FROM app_data').get().n),databasePath:this.file(id)
  }));}
  recover(){for(const p of this.list().projects)this.use(p.id,db=>{for(const row of db.prepare('SELECT id,info FROM jobs').all()){const job=JSON.parse(row.info);if(job.status==='running'){job.status='interrupted';job.stage='interrupted';job.finishedAt=Date.now();job.result='The panel stopped during this attempt. Saved content was preserved. No call was repeated; usage records may be incomplete.';db.prepare('UPDATE jobs SET info=? WHERE id=?').run(encode(job),row.id);}}});}
  data(id,method,key,value){
    if(typeof key!=='string'||key.length<1||key.length>120)throw new Error('Invalid record name.');
    return this.use(id,db=>{
      if(method==='GET'){const row=db.prepare('SELECT value FROM app_data WHERE key=?').get(key);return row?JSON.parse(row.value):null;}
      if(method==='DELETE'){db.prepare('DELETE FROM app_data WHERE key=?').run(key);return null;}
      if(method!=='PUT')throw new Error('Invalid operation.');
      const text=encode(value);if(!text||Buffer.byteLength(text)>256*1024)throw new Error('This record exceeds 256 KB.');
      db.exec('BEGIN IMMEDIATE');try{
        const size=Number(db.prepare('SELECT COALESCE(SUM(length(CAST(value AS BLOB))),0) AS n FROM app_data WHERE key<>?').get(key).n);
        const count=Number(db.prepare('SELECT COUNT(*) AS n FROM app_data WHERE key<>?').get(key).n);
        if(size+Buffer.byteLength(text)>10*1024*1024||count>=1000)throw new Error('The database reached this version’s limit: 10 MB or 1,000 records.');
        db.prepare('INSERT INTO app_data VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated').run(key,text,Date.now());db.exec('COMMIT');return value;
      }catch(e){db.exec('ROLLBACK');throw e;}
    });
  }
}
