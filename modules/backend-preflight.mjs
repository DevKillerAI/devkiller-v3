import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {inspectPreview} from './qa.mjs';
// A disposable project identity prevents candidate migrations from touching user data.
export async function inspectBackendBuild(runtime,files,{stack,signal}={}){
 if(!files.some(f=>f.name==='backend/routes.mjs'))return {status:'passed',scope:'Frontend build; no custom backend requested.'};
 const name='dk-backend-probe-'+randomUUID().slice(0,12),folder=path.join(runtime.root,'.runtime',name),projectId=randomUUID();let candidate;
 try{
 signal?.throwIfAborted();for(const file of files){const dest=path.resolve(folder,file.name);if(!dest.startsWith(folder+path.sep))throw Error('Invalid artifact path');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,file.content);}
 candidate=await runtime.start(name,folder,{projectId,qaToken:randomUUID(),stack,temporary:true});
 const health=await inspectPreview(candidate.port);signal?.throwIfAborted();
 if(health.status!=='passed')throw Error('Backend did not start.');
 const response=await fetch(`http://127.0.0.1:${candidate.port}/__backend/health`,{signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('Backend database readiness failed.');
 return {status:'passed',scope:'Frontend build, real backend startup, SQL migrations and PostgreSQL connectivity in a disposable database. User workflows still require browser acceptance tests.'};
 }catch(error){
 signal?.throwIfAborted();let evidence=error.message;
 try{evidence+='\n'+await runtime.command(['logs',name+'-api']);}catch{}
 evidence=evidence.replace(/postgres(?:ql)?:\/\/[^\s'"`]+/g,'[database connection redacted]').slice(-5000);
 return {status:'failed',checks:[{category:'funcional',status:'failed',check:'backend-startup',requirement:'Start the generated API and apply its schema.',expected:'Backend responds and migrations complete transactionally.',observed:'The disposable backend did not become ready.',evidence,correction:'Correct the server modules or migrations using this evidence. Preserve requested functionality; no user data was touched.'}]};
 }finally{
 await runtime.remove(name).catch(()=>{});
 const id=createHash('sha256').update(runtime.root.toLowerCase()+':'+projectId).digest('hex').slice(0,20),network='dk-app-'+id;
 // Names derive exclusively from this fresh disposable identity, including startup failures.
 await runtime.command(['rm','-f',network+'-db']).catch(()=>{});await runtime.command(['network','rm',network]).catch(()=>{});
 const resolved=path.resolve(folder);if(resolved.startsWith(path.resolve(runtime.root,'.runtime')+path.sep)&&path.basename(resolved)===name)await fs.rm(resolved,{recursive:true,force:true});
 }
}
