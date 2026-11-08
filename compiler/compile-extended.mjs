import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {backendBuildConfig} from './backend-config.mjs';
import {browserImportGuard} from './import-policy.mjs';
const exec=promisify(execFile),root='/work',source=root+'/src';
try{
 let input='';for await(const c of process.stdin){input+=c;if(Buffer.byteLength(input)>4*1024*1024)throw Error('Source exceeds 4 MB.');}
 const {files,stack}=JSON.parse(input),pkg=JSON.parse(await fs.readFile('/opt/compiler/package.json','utf8'));
 const family=stack==='vue-v1'?'vue':stack==='angular-v1'?'angular':stack==='next-v1'?'next':'react';
 for(const file of files){if(!/^src\/[a-zA-Z0-9_./ ()\[\]-]+\.(jsx|js|tsx|ts|vue|css|svg|json|mjs|sql)$/.test(file.name)||file.name.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('Invalid source path.');const dest=path.join(root,file.name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,file.content);}
 await fs.symlink('/opt/compiler/node_modules',root+'/node_modules');
 await fs.writeFile(root+'/package.json',JSON.stringify({...pkg,type:'module'}));
 await fs.writeFile(root+'/tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'bundler',jsx:'preserve',experimentalDecorators:true,skipLibCheck:true,allowJs:true,baseUrl:'.',paths:{'@/*':['./src/*']}},include:['src']}));
 let out=root+'/dist';
 if(family==='next'){
  await fs.writeFile(root+'/next.config.mjs',"export default {output:'export',trailingSlash:true,images:{unoptimized:true},typescript:{ignoreBuildErrors:false},experimental:{cpus:1},webpack(c){c.resolve.alias['@']='/work/src';return c}};");
  await fs.writeFile(root+'/postcss.config.mjs',"export default {plugins:{'@tailwindcss/postcss':{}}};");
  await exec(process.execPath,['/opt/compiler/node_modules/next/dist/bin/next','build','--webpack'],{cwd:root,timeout:160000,maxBuffer:4*1024*1024,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});out=root+'/out';
 }else{
  const {build}=await import('vite');let plugins=[];
  let entry;
  if(family==='vue'){plugins.push((await import('@vitejs/plugin-vue')).default());entry="import {createApp} from 'vue';import App from './src/App.vue';import './src/styles.css';createApp(App).mount('#root');";}
  else if(family==='angular'){entry="import '@angular/compiler';import {bootstrapApplication} from '@angular/platform-browser';import {AppComponent} from './src/app.component';import './src/styles.css';bootstrapApplication(AppComponent).catch(console.error);";}
  else {plugins.push((await import('@vitejs/plugin-react')).default(),(await import('@tailwindcss/vite')).default());entry="import React from 'react';import {createRoot} from 'react-dom/client';import App from './src/App';import './src/styles.css';createRoot(document.getElementById('root')).render(<App/>);";}
  await fs.writeFile(root+'/main.tsx',entry);
  await fs.writeFile(root+'/index.html','<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DevKiller application</title></head><body>'+(family==='angular'?'<app-root></app-root>':'<div id="root"></div>')+'<script src="/__devkiller/db.js"></script><script type="module" src="/main.tsx"></script></body></html>');
  const guard=browserImportGuard(source,pkg.dependencies);
  await build({root,configFile:false,envFile:false,publicDir:false,base:'/',logLevel:'silent',resolve:{alias:{'@':source}},plugins:[guard,...plugins],esbuild:{tsconfigRaw:{compilerOptions:{experimentalDecorators:true}}},build:{outDir:'dist',target:'es2022',assetsInlineLimit:0}});
 }
 const result=[];async function walk(folder,prefix=''){for(const item of await fs.readdir(folder,{withFileTypes:true})){const name=prefix+item.name;if(item.isDirectory())await walk(path.join(folder,item.name),name+'/');else{if(!/\.(html|js|css|json|txt|svg)$/.test(name))continue;result.push({name,content:await fs.readFile(path.join(folder,item.name),'utf8')});}}}
 await walk(out);
 if(files.some(f=>f.name==='src/server/routes.mjs')){
  const {build}=await import('vite');
  await build(backendBuildConfig(root));
  result.push({name:'backend/routes.mjs',content:await fs.readFile(root+'/backend-dist/routes.mjs','utf8')});
  for(const f of files.filter(f=>f.name.startsWith('src/server/migrations/')&&f.name.endsWith('.sql')))result.push({name:'backend/'+f.name.slice('src/server/'.length),content:f.content});
 }
 if(Buffer.byteLength(JSON.stringify(result))>24*1024*1024)throw Error('Built output exceeds 24 MB.');
 process.stdout.write(JSON.stringify({ok:true,files:result,dependencies:pkg.dependencies}));
}catch(error){process.stdout.write(JSON.stringify({ok:false,error:{message:String(error.stderr||error.message).slice(-6000),file:error.id||null}}));process.exitCode=1;}
