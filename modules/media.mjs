import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
const agent={'User-Agent':'DevKillerEngine/0.14 (prototype; licensed image references)'};
const clean=x=>String(x||'').replace(/<[^>]*>/g,'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').slice(0,800);
export function photoTopics(prompt){const p=prompt.toLowerCase();if(/sem (foto|image)|no (photo|image)/.test(p))return [];const topics=[];for(const [re,query] of [[/roupa|clothing|fashion|camiseta|t-shirt|apparel/,'t-shirt'],[/mochila|backpack|roupa|clothing|outdoor|hiking|camping|trilha|acampamento/,'backpack'],[/cafe|café|coffee|cafeteria/,'coffee cup'],[/restaurante|restaurant|food|comida/,'food dish'],[/hotel|travel|viagem/,'hotel room'],[/fitness|gym|academia/,'gym equipment'],[/photography|photo studio|est[uú]dio fotogr[aá]fico/,'photography studio'],[/furniture|móveis|moveis|interior/,'furniture']])if(re.test(p))topics.push(query);return topics.slice(0,2);}
export class MediaLibrary {
 constructor(projects,{fetchImpl=fetch}={}){this.projects=projects;this.fetch=fetchImpl;}
 folder(id){return path.join(path.dirname(this.projects.file(id)),'media');}
 async manifest(id){try{return JSON.parse(await fs.readFile(path.join(this.folder(id),'manifest.json'),'utf8'));}catch{return {assets:[],status:'not-requested'};}}
 async prepare(id,prompt,{signal}={}){
  const prior=await this.manifest(id);if(prior.status!=='not-requested')return prior;
  const topics=photoTopics(prompt);if(!topics.length)return prior;
  const assets=[],warnings=[];await fs.mkdir(this.folder(id),{recursive:true});
  // Curated, visually checked photo references supplement provider search. No generated app code is reused.
  if(/outdoor|hiking|camping|trilha|acampamento|backpack/i.test(prompt)){
   const catalog=JSON.parse(await fs.readFile(new URL('../knowledge/media/catalog.json',import.meta.url),'utf8'));
   for(const item of catalog.assets){const buffer=await fs.readFile(new URL('../knowledge/media/'+item.file,import.meta.url));const name=createHash('sha256').update(buffer).digest('hex')+'.jpg';await fs.writeFile(path.join(this.folder(id),name),buffer);const {file,...metadata}=item;assets.push({...metadata,name,url:'/__devkiller/media/'+name,title:item.description,mime:'image/jpeg',bytes:buffer.length,review:'Visually reviewed reference; generation model must still match the intended role to the request.'});}
  }
  for(const topic of (assets.length?[]:topics)){try{
   const url=new URL('https://commons.wikimedia.org/w/api.php');Object.entries({action:'query',format:'json',generator:'search',gsrsearch:`${topic} filetype:bitmap -drawing -logo -poster`,gsrnamespace:'6',gsrlimit:'4',prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'1280'}).forEach(([k,v])=>url.searchParams.set(k,v));
   const r=await this.fetch(url,{headers:agent,redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(12000),...(signal?[signal]:[])])});if(!r.ok)throw Error('Photo search unavailable');const data=await r.json();
   for(const page of Object.values(data.query?.pages||{}).slice(0,4)){
    const info=page.imageinfo?.[0],meta=info?.extmetadata,license=clean(meta?.LicenseShortName?.value),artist=clean(meta?.Artist?.value);if(!info||!/^image\/(jpeg|png)$/.test(info.mime)||!(/^(?:CC BY(?:-SA)? [0-9.]+|CC0(?: [0-9.]+)?|Public domain)$/i.test(license))||!artist)continue;
    const target=new URL(info.thumburl||info.url);if(target.protocol!=='https:'||!['upload.wikimedia.org','thumb.wikimedia.org'].includes(target.hostname))continue;
    const photo=await this.fetch(target,{headers:agent,redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(8000),...(signal?[signal]:[])])});if(!photo.ok)continue;
    const chunks=[];let bytes=0;for await(const chunk of photo.body){bytes+=chunk.length;if(bytes>1200000)throw Error('Image too large');chunks.push(chunk);}const buffer=Buffer.concat(chunks),jpeg=buffer[0]===255&&buffer[1]===216&&buffer[2]===255,png=buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));if(!jpeg&&!png)continue;
    const name=createHash('sha256').update(buffer).digest('hex')+(jpeg?'.jpg':'.png');if(assets.some(a=>a.name===name))continue;await fs.writeFile(path.join(this.folder(id),name),buffer);
    assets.push({name,url:'/__devkiller/media/'+name,topic,title:clean(page.title),description:clean(meta?.ImageDescription?.value),artist,license,source:'https://commons.wikimedia.org/wiki/'+encodeURIComponent(page.title),licenseUrl:clean(meta?.LicenseUrl?.value),mime:jpeg?'image/jpeg':'image/png',bytes});
    if(assets.filter(a=>a.topic===topic).length>=2)break;
   }
  }catch(error){signal?.throwIfAborted();warnings.push(`${topic}: no suitable licensed photo was retrieved within the search allowance.`);}}
  const result={status:assets.length?'available':'unavailable',assets,warnings,createdAt:Date.now(),selection:'Candidates must be visually checked against the request by the generation model; these are illustrative demo photos, not verified merchant inventory.'};await fs.writeFile(path.join(this.folder(id),'manifest.json'),JSON.stringify(result,null,2));return result;
 }
 async generateEditorialSet(id,brief,{apiKey,signal,count=1,onProgress=()=>{},briefs}={}){
  const roles=briefs?briefs.map(b=>b.role):['hero','environment','detail'];const records=[];
  for(const role of roles.slice(0,count)){
   signal?.throwIfAborted();onProgress(`Creating editorial image ${records.length+1}/${count}: ${role}`);
   const direction={hero:'Wide establishing hero image. Strong focal point and negative space for HTML text.',environment:'A complementary scene or environment that supports the same subject and visual identity. Do not repeat the hero framing.',detail:'A close-up of materials or a subject detail relevant to the same brief. Compose it as a supporting editorial image.'}[role];
   const result=await this.generateIllustration(id,briefs?briefs.find(b=>b.role===role).scene:brief,{apiKey,signal,assetRole:count===1?'editorial':role,direction});records.push(result.imageGeneration||{status:'previous-attempt'});
   if(result.imageGeneration?.status!=='completed')break;
  }
  const result=await this.manifest(id);return {...result,imageGeneration:{status:records.length===count&&records.every(r=>r.status==='completed')?'completed':'partial',records}};
 }
 async generateIllustration(id,brief,{apiKey,signal,assetRole='editorial',direction=''}={}){
  if(typeof brief!=='string'||brief.length<10||brief.length>8000)throw Error('Invalid image brief.');
  if(!['editorial','hero','environment','detail','polish'].includes(assetRole))throw Error('Invalid image role.');
  const folder=this.folder(id);await fs.mkdir(folder,{recursive:true});const receipt=path.join(folder,assetRole==='editorial'?'image-generation.json':`image-generation-${assetRole}.json`);
  // Exclusive reservation survives crashes: uncertain requests are never silently repeated.
  try{await fs.writeFile(receipt,JSON.stringify({status:'reserved',model:'gpt-image-2.5-flare',calls:1,createdAt:Date.now()}),{flag:'wx'});}catch(e){if(e.code==='EEXIST')return {...await this.manifest(id),imageGeneration:JSON.parse(await fs.readFile(receipt,'utf8'))};throw e;}
  const record={model:'gpt-image-2.5-flare',calls:1,role:assetRole,createdAt:Date.now()};
  try{
   const response=await this.fetch('https://api.openai.com/v1/images/generations',{method:'POST',redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(600000),...(signal?[signal]:[])]),headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({model:record.model,n:1,size:'1536x1024',quality:'high',output_format:'png',prompt:'Create a single photographic scene of the physical subject described below. This is a photograph, not a design presentation. Art-direct a coherent scene specific to this subject, with a strong focal point, natural materials and convincing detail. Leave natural negative space. No embedded text, UI, logos, watermarks, collage, unrelated objects, or alleged merchant product photographs. This is a conceptual hero/category illustration, never proof of actual inventory. Art direction: '+direction+' Brief: '+brief})});
   if(!response.ok){record.status='rejected';record.httpStatus=response.status;throw Error('Image provider did not accept the request.');}
   const data=await response.json();record.usage=data.usage||null;const encoded=data.data?.[0]?.b64_json;if(typeof encoded!=='string'||encoded.length>24000000)throw Error('Invalid image response.');const buffer=Buffer.from(encoded,'base64');if(!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Expected a PNG image.');
   const name=createHash('sha256').update(buffer).digest('hex')+'.png';await fs.writeFile(path.join(folder,name),buffer);const manifest=await this.manifest(id);manifest.assets.push({name,url:'/__devkiller/media/'+name,title:'AI-generated '+assetRole+' visual',description:brief.slice(0,800),role:'editorial',editorialRole:assetRole,kind:'ai-generated',artist:record.model,source:'Generated with OpenAI',license:'AI-generated; review before publishing',licenseUrl:'',mime:'image/png',bytes:buffer.length});manifest.status='available';await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2));record.status='completed';record.asset=name;
  }catch(e){record.status=record.status||'uncertain';record.message='No automatic image retry. Continue with available photos or honest placeholders.';signal?.throwIfAborted();}
  finally{await fs.writeFile(receipt,JSON.stringify(record,null,2));}
  const result=await this.manifest(id);return {...result,imageGeneration:record};
 }
 async input(id,{includeUnreviewed=false}={}){const m=await this.manifest(id);if(m.reviewRequired&&!includeUnreviewed)m.assets=m.assets.filter(a=>a.reviewStatus==='approved');return {...m,images:await Promise.all(m.assets.map(async a=>({url:a.url,data:'data:'+a.mime+';base64,'+(await fs.readFile(path.join(this.folder(id),a.name))).toString('base64')})))};}
 async export(id){const m=await this.manifest(id);return Promise.all(m.assets.map(async a=>({name:'public/__devkiller/media/'+a.name,base64:(await fs.readFile(path.join(this.folder(id),a.name))).toString('base64')})));}
 async serve(req,res,id){const u=new URL(req.url,'http://preview');if(u.pathname==='/__devkiller/media/credits'){const m=await this.manifest(id);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(m));return true;}const match=u.pathname.match(/^\/__devkiller\/media\/([a-f0-9]{64}\.(?:jpg|png))$/);if(!match)return false;try{const data=await fs.readFile(path.join(this.folder(id),match[1]));res.writeHead(200,{'Content-Type':match[1].endsWith('.jpg')?'image/jpeg':'image/png','Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(404).end();}return true;}
}


