import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {inspectMedia,refineOnce,refinementAccepted,imageBriefs} from '../modules/design-process.mjs';
import {MediaLibrary} from '../modules/media.mjs';
import http from 'node:http';
import {reviewRenderedApp} from '../modules/visual-review.mjs';
const temp=()=>fs.mkdtemp(path.join(os.tmpdir(),'dk-design-'));
const response=assets=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({assets})}]}]});
test('asset inspection rejects mockups and excludes them from generation while retaining originals',async()=>{
 const folder=await temp(),media=new MediaLibrary({file:()=>path.join(folder,'project.sqlite')});await fs.mkdir(media.folder('p'));
 const assets=[{url:'/photo',name:'photo.png',mime:'image/png'},{url:'/mockup',name:'mockup.png',mime:'image/png'}];for(const a of assets)await fs.writeFile(path.join(media.folder('p'),a.name),'fixture');
 const result=await inspectMedia({folder,media:{assets,images:[]},fetchImpl:async()=>response(assets.map(a=>({url:a.url,approved:a.url==='/photo',description:'Visible subject',reason:'Review'})))});
 assert.equal(result.approved.length,1);assert.equal(result.rejected.length,1);
 await fs.writeFile(path.join(media.folder('p'),'manifest.json'),JSON.stringify({assets:assets.map(a=>({...a,reviewStatus:result.approved.some(r=>r.url===a.url)?'approved':'excluded'})),reviewRequired:true}));
 assert.equal((await media.input('p')).assets.length,1);assert.equal((await media.input('p',{includeUnreviewed:true})).assets.length,2);
});
test('inspection uncertainty and invalid decisions never trigger a second paid call',async()=>{
 const folder=await temp();let calls=0;const opts={folder,media:{assets:[{url:'/a'}],images:[]},fetchImpl:async()=>{calls++;throw Error('connection lost');}};
 assert.equal((await inspectMedia(opts)).status,'unverified');await inspectMedia(opts);assert.equal(calls,1);
 const invalid=await inspectMedia({...opts,folder:await temp(),fetchImpl:async()=>response([{url:'/invented',approved:true,description:'x'}])});assert.equal(invalid.status,'unverified');assert.deepEqual(invalid.approved,[]);
});
test('image calls receive a standalone scene instead of the application prompt',async()=>{
 const folder=await temp();let received;const media=new MediaLibrary({file:()=>path.join(folder,'project.sqlite')},{fetchImpl:async(_,o)=>{received=JSON.parse(o.body).prompt;return Response.json({data:[{b64_json:Buffer.from([137,80,78,71,13,10,26,10]).toString('base64')}]});}});
 await media.generateEditorialSet('p','Build a booking app with navigation and checkout',{briefs:imageBriefs({imageBriefs:[{role:'hero',scene:'Sunlit limestone terrace above a blue ocean.'}]}),count:1});assert.match(received,/Sunlit limestone/);assert.doesNotMatch(received,/booking app|checkout/);
});
const needsWork={status:'completed',review:{verdict:'needs-work',findings:[{category:'visual',evidence:'Text overlap',action:'Separate text'}]}};
test('refinement makes one attempt, preserves prior preview on failure and never replays',async()=>{
 const folder=await temp();let calls=0,promotions=0;const options={folder,review:needsWork,files:[1],edit:async()=>{calls++;return {files:[2]};},evaluate:async()=>({accepted:false}),promote:async()=>promotions++};
 assert.equal((await refineOnce(options)).status,'kept-previous');await refineOnce(options);assert.equal(calls,1);assert.equal(promotions,0);
});
test('refinement promotion requires visual approval and retention of passing checks',()=>{
 const baseline=[{check:'booking',requirement:'Reserve',status:'passed'}],targets=[{id:'F-layout'}],good={status:'completed',review:{verdict:'ready-for-human-review',progress:{regression:false,outcomes:[{id:'F-layout',status:'resolved',evidence:'The candidate mobile screenshot shows separated controls.'}]}}};
 assert.equal(refinementAccepted(baseline,baseline,good,targets),true);assert.equal(refinementAccepted(baseline,[],good,targets),false);assert.equal(refinementAccepted(baseline,[{...baseline[0],status:'pending'}],good,targets),false);assert.equal(refinementAccepted(baseline,baseline,needsWork,targets),false);
});
test('rendered review captures three real routes on desktop and mobile, with isolated QA headers',async t=>{
 const server=http.createServer((req,res)=>{if(req.headers['x-test-qa']!=='isolated'){res.writeHead(403).end();return;}res.setHeader('Content-Type','text/html');res.end('<a href="/#/rooms">Rooms</a><a href="/#/story">Story</a><h1>Working fixture</h1>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());let captured;
 const review=await reviewRenderedApp({folder:await temp(),url:'http://127.0.0.1:'+server.address().port+'/',headers:{'X-Test-QA':'isolated'},files:[],prompt:'Review fixture',fetchImpl:async(_,o)=>{captured=JSON.parse(o.body);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({verdict:'ready-for-human-review',findings:[]})}]}]});}});
 assert.equal(review.status,'completed');assert.equal(review.pages.length,6);assert.deepEqual(review.motionSamples.map(s=>s.reducedMotion),['no-preference','reduce']);assert.equal(captured.input[0].content.filter(c=>c.type==='input_image').length,8);
});
