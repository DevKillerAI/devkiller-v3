import {extendedProfile,hydrateComponents} from './extended-stacks.mjs';
import {spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {validateFiles} from './files.mjs';
import {validateSource,isReact,isCompiled,REACT_DESIGN,REACT_STUDIO,REACT_PRO,STATIC} from './stacks.mjs';
export const COMPILER_IMAGE='devkiller-react:2';
export const compilerImage=stack=>extendedProfile(stack)?.image||(stack===REACT_PRO?'devkiller-react:4':stack===REACT_STUDIO?'devkiller-react:3':stack===REACT_DESIGN?COMPILER_IMAGE:'devkiller-react:1');
export const BUILD_LIMITS={seconds:60,memoryMB:1024,cpu:1};
export const buildLimits=stack=>extendedProfile(stack)?{seconds:180,memoryMB:3072,cpu:2}:({...BUILD_LIMITS,memoryMB:[REACT_STUDIO,REACT_PRO].includes(stack)?1024:512});
export function buildFinding(error,environment=false){return {category:environment?'ambiente':'funcional',status:'failed',check:environment?'build-environment':'build-code',requirement:environment?'Provide the build environment.':'Build the code for the browser.',expected:environment?'Compiler available and build completed within its limits.':'Complete files, valid syntax and supported imports.',observed:environment?'The environment did not finish the build. This does not prove a code defect.':'The received code could not be built.',evidence:[error.message,error.file,error.line?`Line ${error.line}`:null,error.frame].filter(Boolean).join('\n'),file:error.file||null,line:error.line||null,correction:environment?'Check the environment or run Preparar.ps1. Repeating a build needs no AI call.':'Repair the indicated file while preserving features; one attempt per click.'};}
export class BuildError extends Error{constructor(message,checks){super(message);this.checks=checks;}}
export class AppCompiler{
 constructor(runtime){this.runtime=runtime;}
 async check(stack){if(!isCompiled(stack))return {ready:true};try{await this.runtime.command(['image','inspect',compilerImage(stack)],8000);return {ready:true};}catch{return {ready:false,message:'This framework needs setup. Run Preparar.ps1. No AI call was made.'};}}
 async prepare(files,{stack=STATIC,onProgress=()=>{}}={}){
   files=hydrateComponents(files,stack);validateSource(files,stack);if(stack===STATIC)return {files,stack,compiled:false};
   const ready=await this.check(stack);if(!ready.ready)throw new BuildError(ready.message,[buildFinding({message:ready.message},true)]);
   const imageId=await this.runtime.command(['image','inspect',compilerImage(stack),'--format','{{.Id}}'],8000);
   const name='devkiller-build-'+randomUUID().slice(0,12),startedAt=Date.now(),limits=buildLimits(stack);onProgress('Building the '+stack+' app…');
   let output;
   try{
     output=await new Promise((resolve,reject)=>{
       const child=spawn('docker',['run','--rm','-i','--name',name,'--label',this.runtime.label,'--network','none','--read-only','--memory',limits.memoryMB+'m','--memory-swap',limits.memoryMB+'m','--cpus',String(limits.cpu),'--pids-limit','256','--cap-drop','ALL','--security-opt','no-new-privileges','--user','1000:1000','--tmpfs','/work:rw,noexec,nosuid,size=1073741824,uid=1000,gid=1000','--tmpfs','/tmp:rw,noexec,nosuid,size=33554432,uid=1000,gid=1000',imageId],{windowsHide:true,stdio:['pipe','pipe','pipe']});
       let stdout='',stderr='',done=false;const fail=message=>{if(done)return;done=true;clearTimeout(timer);child.kill();reject(new BuildError(message,[buildFinding({message},true)]));};
       const timer=setTimeout(()=>fail('The build reached its time limit. The previous version was kept.'),limits.seconds*1000);
       child.stdout.on('data',chunk=>{stdout+=chunk;if(Buffer.byteLength(stdout)>32*1024*1024)fail('The build produced more data than allowed.');});
       child.stderr.on('data',chunk=>{if(stderr.length<8000)stderr+=chunk;});
       child.stdin.on('error',()=>{});child.on('error',()=>fail('Could not start the Docker compiler.'));
       child.on('close',code=>{clearTimeout(timer);if(done)return;done=true;try{const result=JSON.parse(stdout);if(!result.ok)throw new BuildError('A code issue prevented the build.',[buildFinding(result.error)]);if(code!==0)throw new Error();resolve(result);}catch(error){reject(error instanceof BuildError?error:new BuildError('The compiler did not finish. Source files were preserved.',[buildFinding({message:stderr.trim()||`Process exited with code ${code}.`},true)]));}});
       child.stdin.end(JSON.stringify({files,stack}));
     });
     validateFiles(output.files,{maxBytes:24*1024*1024,maxFiles:512,namePattern:/^[a-zA-Z0-9_./ ()%\[\]-]+$/,extensions:['.html','.js','.css','.json','.txt','.svg','.mjs','.sql']});
     return {files:output.files,stack,compiled:true,compiler:compilerImage(stack),imageId,versions:output.dependencies||{react:'19.3.0',vite:'8.3.0',pluginReact:'6.1.1'},sourceHash:createHash('sha256').update(JSON.stringify(files)).digest('hex'),durationMs:Date.now()-startedAt};
   }finally{try{await this.runtime.remove(name);}catch{}}
 }
}
