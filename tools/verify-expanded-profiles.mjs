import fs from 'node:fs/promises';
import path from 'node:path';
import {AppCompiler} from '../modules/compiler.mjs';
import {DockerRuntime} from '../modules/docker.mjs';
import {hydrateComponents} from '../modules/extended-stacks.mjs';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..'),runtime=new DockerRuntime(root,'expansion-verification'),compiler=new AppCompiler(runtime);
const fixtures={
 'react-v5':[{name:'src/App.jsx',content:`import React,{useState} from 'react';import {Button} from '@/components/ui/button';import {Dialog,DialogContent,DialogTitle,DialogTrigger} from '@/components/ui/dialog';import {Vector3} from 'three';export default function App(){const [n,setN]=useState(0);return <main><h1>React verified</h1><Button onClick={()=>setN(n+1)}>Count {n}</Button><Dialog><DialogTrigger asChild><Button>Open details</Button></DialogTrigger><DialogContent><DialogTitle>Accessible dialog</DialogTitle><p>Vector {new Vector3(1,2,3).length().toFixed(2)}</p></DialogContent></Dialog></main>}`}],
 'vue-v1':[{name:'src/App.vue',content:`<script setup>import {ref} from 'vue';const n=ref(0)</script><template><main><h1>Vue verified</h1><button @click="n++">Count {{n}}</button></main></template>`}],
 'angular-v1':[{name:'src/app.component.ts',content:`import {Component,signal} from '@angular/core';@Component({selector:'app-root',standalone:true,template:'<main><h1>Angular verified</h1><button (click)="increment()">Count {{n()}}</button></main>'})export class AppComponent{n=signal(0);increment(){this.n.update(n=>n+1)}}`}],
 'next-v1':[{name:'src/app/layout.jsx',content:`import '../styles.css';export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}`},{name:'src/app/page.jsx',content:`'use client';import {useState} from 'react';import {Button} from '@/components/ui/button';export default function Home(){const [n,setN]=useState(0);return <main><h1>Next verified</h1><Button onClick={()=>setN(n+1)}>Count {n}</Button><a href="/about/">About</a></main>}`},{name:'src/app/about/page.jsx',content:`export default function About(){return <h1>Second route verified</h1>}`}]
};
const browser=await chromium.launch({headless:true}),results=[];
for(const [stack,source] of Object.entries(fixtures)){
 if(process.argv[2]&&process.argv[2]!==stack)continue;
 const name='dk-verify-'+stack,folder=path.join(root,'.runtime',name);let page;
 try{
 const files=hydrateComponents([...source,{name:'src/styles.css',content:'body{font-family:system-ui;padding:32px}button{padding:12px}'}],stack);
 const output=await compiler.prepare(files,{stack});await fs.mkdir(folder,{recursive:true});for(const f of output.files){const p=path.join(folder,f.name);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,f.content);}
 await runtime.remove(name);const preview=await runtime.start(name,folder);page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+preview.port);await page.getByRole('button',{name:'Count 0',exact:true}).click();await page.getByRole('button',{name:'Count 1',exact:true}).waitFor();
 if(stack==='react-v5'){await page.getByRole('button',{name:'Open details'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});}
 if(stack==='next-v1'){await page.getByRole('link',{name:'About'}).click();await page.getByRole('heading',{name:'Second route verified'}).waitFor();}
 if(errors.length)throw Error(errors.join('; '));results.push({stack,status:'passed',files:output.files.length});console.log(stack,'PASS');
 }catch(e){results.push({stack,status:'failed',error:e.message,checks:e.checks});console.log(stack,'FAIL',JSON.stringify(e.checks||e.message));}
 finally{await page?.close();await runtime.remove(name);}
}
await browser.close();await fs.mkdir(path.join(root,'validation/expansion'),{recursive:true});await fs.writeFile(path.join(root,'validation/expansion/profiles'+(process.argv[2]?'-'+process.argv[2]:'')+'.json'),JSON.stringify(results,null,2));if(results.some(r=>r.status==='failed'))process.exitCode=1;
