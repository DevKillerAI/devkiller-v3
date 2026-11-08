import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {indexHtml,mainJsx} from './scaffold.mjs';
const root='/work',source=root+'/src';
try{
 let input='',size=0;for await(const chunk of process.stdin){size+=chunk.length;if(size>3*1024*1024)throw new Error('Input too large.');input+=chunk;}
 const {files,stack='react-v1'}=JSON.parse(input);
 if(!['react-v1','react-v2','react-v3','react-v4'].includes(stack))throw new Error('Invalid React profile.');
 for(const file of files){if(!/^src\/[a-zA-Z0-9_./ -]+\.(jsx|js|css|svg|json)$/.test(file.name)||file.name.split('/').some(s=>!s||s==='.'||s==='..'))throw new Error('File outside the React contract.');const dest=path.join(root,file.name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,file.content);}
 await fs.symlink('/opt/compiler/node_modules',root+'/node_modules');
 await fs.writeFile(root+'/index.html',indexHtml);
 await fs.writeFile(root+'/main.jsx',mainJsx);
 const guard={name:'devkiller-imports',enforce:'pre',resolveId(id,importer){
   if(!importer?.startsWith(source+'/'))return null;
   if((stack==='react-v4'&&['react-hook-form','@hookform/resolvers/zod','zod','clsx','tailwind-merge','class-variance-authority','tailwindcss'].includes(id))||id==='react'||id==='react/jsx-runtime'||id==='react/jsx-dev-runtime'||(['react-v2','react-v3','react-v4'].includes(stack)&&['lucide-react','recharts'].includes(id))||(['react-v3','react-v4'].includes(stack)&&['radix-ui','motion/react','react-router-dom'].includes(id)))return null;
   if(!id.startsWith('.'))throw new Error(`Unsupported dependency: ${id}. Use only packages from the current profile and local files inside src/.`);
   const resolved=path.resolve(path.dirname(importer),id.split('?')[0]);
   if(!resolved.startsWith(source+'/'))throw new Error('Imports must stay inside src/.');
   return null;
 }};
 await build({root,configFile:false,envFile:false,publicDir:false,base:'./',logLevel:'silent',plugins:[guard,react(),...(stack==='react-v4'?[(await import('@tailwindcss/vite')).default()]:[])],build:{outDir:'dist',emptyOutDir:true,sourcemap:false,minify:true,target:'es2022',assetsInlineLimit:0}});
 const result=[];async function walk(folder,prefix=''){for(const item of await fs.readdir(folder,{withFileTypes:true})){const name=prefix+item.name;if(item.isDirectory())await walk(path.join(folder,item.name),name+'/');else{const stat=await fs.lstat(path.join(folder,item.name));if(!stat.isFile()||stat.size>4*1024*1024)throw new Error('Invalid build output.');result.push({name,content:await fs.readFile(path.join(folder,item.name),'utf8')});}}}
 await walk(root+'/dist');if(Buffer.byteLength(JSON.stringify(result))>8*1024*1024)throw new Error('Built output exceeds 8 MB.');
 const dependencies=JSON.parse(await fs.readFile('/opt/compiler/package.json','utf8')).dependencies;
 process.stdout.write(JSON.stringify({ok:true,files:result,dependencies}));
}catch(error){
 const loc=error.loc||error.location||null;
 const message=String(error.message||error).replaceAll('/work/','').slice(0,5000);
 process.stdout.write(JSON.stringify({ok:false,error:{message,file:loc?.file?.replace('/work/','')||error.id?.replace('/work/','')||null,line:loc?.line||null,column:loc?.column||null,frame:String(error.frame||'').slice(0,2000)}}));process.exitCode=1;
}
