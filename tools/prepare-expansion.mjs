import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const components=['button','input','textarea','label','card','badge','separator','skeleton','dialog','alert-dialog','select','tabs','dropdown-menu','popover','tooltip','sheet','checkbox','switch','table','accordion','progress','slider','scroll-area','avatar'];
const folder=path.join(root,'compiler','ui-registry');await fs.mkdir(folder,{recursive:true});
const manifest={source:'https://github.com/shadcn-ui/ui',license:'MIT',retrievedAt:new Date().toISOString(),components:[]};
for(const name of components){
 const url=`https://ui.shadcn.com/r/styles/new-york-v4/${name}.json`;
 const r=await fetch(url);if(!r.ok)throw Error(url+': '+r.status);const entry=await r.json();
 for(const file of entry.files||[]){if(!file.path.endsWith('.tsx'))continue;
  const content=file.content.replace(/from ["']cn["']/g,'from "../../lib/utils"').replace(/@\/registry\/new-york-v4\/ui\//g,'./').replace(/@\/components\/ui\//g,'./').replace(/@\/lib\/utils/g,'../../lib/utils');
  await fs.writeFile(path.join(folder,name+'.tsx'),content);
  manifest.components.push({name,file:name+'.tsx',url,sha256:createHash('sha256').update(content).digest('hex'),dependencies:entry.dependencies,registryDependencies:entry.registryDependencies||[]});
 }
}
await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2));
const license=await(await fetch('https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md')).text();await fs.writeFile(path.join(folder,'LICENSE.md'),license);
const base=JSON.parse(await fs.readFile(path.join(root,'compiler/pro/package.json')));
Object.assign(base.dependencies,{'animejs':'4.5.0','motion':'13.3.0','three':'0.186.0','@react-three/fiber':'9.4.0','@react-three/drei':'10.7.7','@tanstack/react-query':'5.103.1','@tanstack/react-table':'8.21.3','tw-animate-css':'1.4.0','typescript':'5.9.3'});
await fs.writeFile(path.join(root,'compiler/pro/package.json'),JSON.stringify(base,null,2));
for(const [id,deps] of Object.entries({vue:{vue:'3.5.42','@vitejs/plugin-vue':'6.0.9',vite:'8.3.0',typescript:'5.9.3','lucide-vue-next':'0.577.0',animejs:'4.5.0',motion:'13.3.0',three:'0.186.0'},next:{...base.dependencies,next:'16.3.5','@tailwindcss/postcss':'4.3.3','@types/react':'19.2.14','@types/node':'24.10.1'},angular:{'@angular/core':'22.1.6','@angular/common':'22.1.6','@angular/compiler':'22.1.6','@angular/platform-browser':'22.1.6',rxjs:'7.8.2',tslib:'2.8.1',vite:'8.3.0',typescript:'5.9.3',animejs:'4.5.0',motion:'13.3.0',three:'0.186.0'},backend:{fastify:'5.12.5',pg:'8.23.0',zod:'3.25.76'}})){
 await fs.mkdir(path.join(root,'compiler',id),{recursive:true});await fs.writeFile(path.join(root,'compiler',id,'package.json'),JSON.stringify({name:'devkiller-'+id+'-runtime',version:'1.0.0',private:true,type:'module',dependencies:deps},null,2));
}
console.log('Saved',manifest.components.length,'official components and pinned compiler manifests.');
