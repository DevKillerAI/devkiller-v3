import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {polishDesign} from '../modules/design-polish.mjs';
import {refineOnce,preparePolishMedia} from '../modules/design-process.mjs';
import {generateModular} from '../modules/modular-generation.mjs';
import {exportDesignFonts,serveDesignFont} from '../modules/design-fonts.mjs';
import {MediaLibrary} from '../modules/media.mjs';
import http from 'node:http';
import {reviewRenderedApp} from '../modules/visual-review.mjs';
const base={apiKey:'sk-test-fixture-not-a-real-key',model:'gpt-5.6-sol',stack:'react-v5'};
const files=[{name:'src/App.jsx',content:'export default function App(){return <h1>Studio</h1>}'},{name:'src/styles.css',content:'body{color:black}'},{name:'src/domain/rules.js',content:'export const total=42;'}];
const stream=files=>new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify({title:'Studio',summary:'Refined composition',limitations:[],scenarios:[],files})}]}]}})+'\n\n');
test('polish returns changed presentation files only, preserves business modules and original scenarios',async()=>{
 const scenarios=[{requirement:'existing behavior'}];let body;
 const result=await polishDesign({...base,files,scenarios,findings:[],fetchImpl:async(_,o)=>{body=JSON.parse(o.body);return stream([{name:'src/styles.css',content:'body{color:navy}'},{name:'src/components/Heading.jsx',content:'export const Heading=()=>null;'}]);}});
 assert.equal(Object.hasOwn(body,'max_output_tokens'),false);assert.equal(result.files.length,4);assert.deepEqual(result.scenarios,scenarios);assert.equal(result.files.find(f=>f.name==='src/domain/rules.js').content,files[2].content);assert.deepEqual(result.changedFiles,['src/styles.css','src/components/Heading.jsx']);
});
test('polish cannot mutate domain modules, escape paths or publish incomplete provider output',async()=>{
 for(const changed of [[{name:'src/domain/rules.js',content:'export const total=0;'}],[{name:'src/../../escape.js',content:'bad'}]])await assert.rejects(polishDesign({...base,files,findings:[],fetchImpl:async()=>stream(changed)}));
 await assert.rejects(polishDesign({...base,files,findings:[],fetchImpl:async()=>new Response('data: '+JSON.stringify({type:'response.incomplete',response:{usage:{output_tokens:100}}})+'\n\n')}),/output limit/);
 assert.equal(files[1].content,'body{color:black}');
});
test('a ready app can receive non-blocking polish, without replaying a paid attempt',async t=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-polish-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));let calls=0,promotions=0;
 const opts={folder,files,review:{status:'completed',review:{verdict:'ready-for-human-review',findings:[{category:'improvement',evidence:'Primary action is visually lost in the dense toolbar',action:'Separate the primary action in the planned command area'}]}},edit:async()=>{calls++;return {files:[...files,{name:'src/title.css',content:'h1{font-size:3rem}'}]};},evaluate:async()=>({accepted:true}),promote:async()=>promotions++};
 assert.equal((await refineOnce(opts)).status,'accepted');await refineOnce(opts);assert.equal(calls,1);assert.equal(promotions,1);
});
test('generation removes token caps and redundant reference/image delivery without dropping source',async t=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-context-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));const bodies=[];
 await generateModular({...base,folder,prompt:'Create a studio workspace',knowledgeContext:{chunks:[{id:'a',content:'same reference'},{id:'b',content:'same reference'}]},media:{assets:[{url:'/photo.png'}],images:[{url:'/photo.png',data:'data:image/png;base64,fixture'}]},fetchImpl:async(_,o)=>{const b=JSON.parse(o.body);bodies.push(b);return stream(bodies.length===1?[files[2]]:files.slice(0,2));}});
 for(const b of bodies){assert.equal(Object.hasOwn(b,'max_output_tokens'),false);assert.doesNotMatch(b.instructions,/Aim below|70%|20[.,]000 tokens/);}
 assert.deepEqual(bodies.map(b=>b.input[0].content.filter(c=>c.type==='input_image').length),[0,1,0]);
 const context=JSON.parse(bodies[1].input[0].content[0].text);assert.equal(context.knowledge.length,1);assert.equal(context.savedFiles[0].content,files[2].content);
});
test('bundled fonts export binaries and licenses only when referenced; preview serves the real binary',async()=>{
 assert.deepEqual(await exportDesignFonts(files),[]);
 const assets=await exportDesignFonts([{content:'url(/__devkiller/fonts/manrope/font.ttf)'}]);assert.equal(assets.length,2);assert.equal(Buffer.from(assets[0].base64,'base64').readUInt32BE(0),0x00010000);assert.match(Buffer.from(assets[1].base64,'base64').toString(),/SIL OPEN FONT LICENSE/);
 let status,body;assert.equal(await serveDesignFont({url:'/__devkiller/fonts/manrope/font.ttf',method:'GET'},{writeHead:s=>status=s,end:b=>body=b}),true);assert.equal(status,200);assert.ok(body.length>10000);assert.equal(await serveDesignFont({url:'/__devkiller/fonts/../../secret'},{}),false);
});
test('optional polish image does not run without authorization or relevant visual evidence',async()=>{
 let calls=0;const media={input:async()=>({assets:[]}),generateIllustration:async()=>{calls++;throw Error('should not run');}};
 const args={media,projectId:'p',findings:[{evidence:'Typography',action:'Improve hierarchy'}],plan:{imageBriefs:[{role:'hero',scene:'A coastal view at sunrise.'}]}};
 await preparePolishMedia({...args,enabled:true});await preparePolishMedia({...args,enabled:false,findings:[{evidence:'Image mismatch',action:'Change photo'}]});assert.equal(calls,0);
});
test('visual sampling opens only annotated disclosure controls and records both motion preferences',async t=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-disclosure-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));let mutations=0;
 const server=http.createServer((req,res)=>{if(req.url==='/mutate'){mutations++;res.end('bad');return;}res.setHeader('Content-Type','text/html');res.end('<button id="menu" type="button" data-dk-visual-probe aria-expanded="false" onclick="document.querySelector(\'#panel\').hidden=false">Open menu</button><div id="panel" hidden>Menu content</div><button id="save" type="submit" data-dk-visual-probe aria-haspopup="dialog" onclick="fetch(\'/mutate\')">Save</button>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const review=await reviewRenderedApp({folder,url:'http://127.0.0.1:'+server.address().port+'/',files:[],prompt:'Inspect controls',headers:{'X-DevKiller-QA':'fixture'},fetchImpl:async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({verdict:'ready-for-human-review',findings:[]})}]}]})});
 assert.equal(review.status,'completed');assert.deepEqual(review.motionSamples.map(s=>s.reducedMotion),['no-preference','reduce']);assert.equal(review.interactionSamples.length,1);assert.equal(review.interactionSamples[0].control,'menu');assert.equal(mutations,0);
});
