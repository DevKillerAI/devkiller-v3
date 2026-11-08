import fs from 'node:fs/promises';
import path from 'node:path';
import {AppCompiler} from '../modules/compiler.mjs';
import {DockerRuntime} from '../modules/docker.mjs';
import {hydrateComponents} from '../modules/extended-stacks.mjs';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..'),runtime=new DockerRuntime(root,'motion-verification'),compiler=new AppCompiler(runtime);
const fixtures={
 'react-v5':[{name:'src/App.jsx',content:`import React,{useState} from 'react';import {Button} from '@/components/ui/button';import {Dialog,DialogContent,DialogTitle,DialogTrigger} from '@/components/ui/dialog';import {Vector3} from 'three';export default function App(){const [n,setN]=useState(0);return <main><h1>React verified</h1><Button onClick={()=>setN(n+1)}>Count {n}</Button><Dialog><DialogTrigger asChild><Button>Open details</Button></DialogTrigger><DialogContent><DialogTitle>Accessible dialog</DialogTitle><p>Vector {new Vector3(1,2,3).length().toFixed(2)}</p></DialogContent></Dialog></main>}`}],
 'vue-v1':[{name:'src/App.vue',content:`<script setup>import {ref} from 'vue';const n=ref(0)</script><template><main><h1>Vue verified</h1><button @click="n++">Count {{n}}</button></main></template>`}],
 'angular-v1':[{name:'src/app.component.ts',content:`import {Component,signal} from '@angular/core';@Component({selector:'app-root',standalone:true,template:'<main><h1>Angular verified</h1><button (click)="increment()">Count {{n()}}</button></main>'})export class AppComponent{n=signal(0);increment(){this.n.update(n=>n+1)}}`}],
 'next-v1':[{name:'src/app/layout.jsx',content:`import '../styles.css';export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}`},{name:'src/app/page.jsx',content:`'use client';import {useState} from 'react';import {Button} from '@/components/ui/button';export default function Home(){const [n,setN]=useState(0);return <main><h1>Next verified</h1><Button onClick={()=>setN(n+1)}>Count {n}</Button><a href="/about/">About</a></main>}`},{name:'src/app/about/page.jsx',content:`export default function About(){return <h1>Second route verified</h1>}`}]
};
const proof=`import {animate,createScope} from 'animejs';import {animate as motionAnimate} from 'motion';import {Vector3} from 'three';
export function mountProof(){const root=document.createElement('section');root.innerHTML='<button id="animate-proof">Animate</button><div class="sample">Spatial '+new Vector3(3,4,0).length()+'</div><div class="fade">Motion target</div>';document.body.append(root);let controls;const scope=createScope({root}).add(()=>{});const click=()=>{const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;scope.add(()=>{animate('.sample',{translateX:reduced?0:80,duration:reduced?0:100,onComplete:()=>root.dataset.finished='true'});});controls=motionAnimate(root.querySelector('.fade'),{opacity:0.7},{duration:reduced?0:0.1});};root.querySelector('button').addEventListener('click',click);return ()=>{controls?.stop();scope.revert();root.remove();};}`;
const browser=await chromium.launch({headless:true}),results=[];
for(const [stack,source] of Object.entries(fixtures)){
 if(process.argv[2]&&process.argv[2]!==stack)continue;
 const name='dk-verify-'+stack,folder=path.join(root,'.runtime',name);let page;
 try{
 const instrumented=source.map(f=>f.name.endsWith('App.jsx')||f.name.endsWith('App.vue')||f.name.endsWith('app.component.ts')||f.name.endsWith('page.jsx')?{...f,content:f.content.replace("'use client';",'')}:f);
 const importPath=stack==='next-v1'?'../motion-proof.js':'./motion-proof.js';
 const entry=instrumented.find(f=>f.name===({'react-v5':'src/App.jsx','vue-v1':'src/App.vue','angular-v1':'src/app.component.ts','next-v1':'src/app/page.jsx'}[stack]));
 if(stack==='vue-v1')entry.content=entry.content.replace('<script setup>', '<script setup>import {onMounted,onUnmounted} from \'vue\';import {mountProof} from \'./motion-proof.js\';let stop;onMounted(()=>{stop=mountProof()});onUnmounted(()=>stop?.());');
 else if(stack==='angular-v1'){entry.content=entry.content.replace('export class AppComponent{', 'export class AppComponent{ stop:any;ngAfterViewInit(){this.stop=mountProof()}ngOnDestroy(){this.stop?.()}');entry.content="import {mountProof} from './motion-proof.js';"+entry.content;}
 else {entry.content=entry.content.replace('return <main>', 'ReactEffect();return <main>');entry.content="'use client';import {useEffect} from 'react';import {mountProof} from '"+importPath+"';function ReactEffect(){useEffect(mountProof,[])}"+entry.content;}
 const files=hydrateComponents([...instrumented,{name:'src/motion-proof.js',content:proof},{name:'src/styles.css',content:'body{font-family:system-ui;padding:32px}button{padding:12px}'}],stack);
 const output=await compiler.prepare(files,{stack});await fs.mkdir(folder,{recursive:true});for(const f of output.files){const p=path.join(folder,f.name);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,f.content);}
 await runtime.remove(name);const preview=await runtime.start(name,folder);page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+preview.port);await page.getByRole('button',{name:'Count 0',exact:true}).click();await page.getByRole('button',{name:'Count 1',exact:true}).waitFor();
 if(stack==='react-v5'){await page.getByRole('button',{name:'Open details'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});}
 
 await page.locator('#animate-proof').click();await page.waitForFunction(()=>document.querySelector('section[data-finished="true"]'));
 const x=await page.locator('.sample').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41);if(Math.abs(x-80)>1)throw Error('Anime did not animate to target: '+x);
 await page.waitForFunction(()=>Math.abs(Number(getComputedStyle(document.querySelector('.fade')).opacity)-.7)<.02);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('#animate-proof').click();await page.waitForFunction(()=>document.querySelector('section[data-finished="true"]'));const reducedX=await page.locator('.sample').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41);if(reducedX!==0)throw Error('Reduced motion failed');
 if(errors.length)throw Error(errors.join('; '));results.push({stack,status:'passed',files:output.files.length});console.log(stack,'PASS');
 }catch(e){results.push({stack,status:'failed',error:e.message,checks:e.checks});console.log(stack,'FAIL',JSON.stringify(e.checks||e.message));}
 finally{await page?.close();await runtime.remove(name);}
}
await browser.close();await fs.mkdir(path.join(root,'validation/motion-v1'),{recursive:true});await fs.writeFile(path.join(root,'validation/motion-v1/profiles'+(process.argv[2]?'-'+process.argv[2]:'')+'.json'),JSON.stringify(results,null,2));if(results.some(r=>r.status==='failed'))process.exitCode=1;
