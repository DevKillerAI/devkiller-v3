import {MOTION_CONTRACT} from './motion-contract.mjs';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const registry=new URL('../compiler/ui-registry/',import.meta.url);
export const EXTENDED_STACKS=[
 {id:'react-v5',label:'React Complete · shadcn, Three.js, optional Node + PostgreSQL',compiled:true,folder:'pro',image:'devkiller-react:5',entry:'src/App.jsx',family:'react'},
 {id:'vue-v1',label:'Vue · single-file components and optional Node + PostgreSQL',compiled:true,folder:'vue',image:'devkiller-vue:1',entry:'src/App.vue',family:'vue'},
 {id:'angular-v1',label:'Angular · standalone components and optional Node + PostgreSQL',compiled:true,folder:'angular',image:'devkiller-angular:1',entry:'src/app.component.ts',family:'angular'},
 {id:'next-v1',label:'Next.js · App Router static export and optional Node + PostgreSQL',compiled:true,folder:'next',image:'devkiller-next:1',entry:'src/app/page.jsx',family:'next'}
];
export const extendedProfile=id=>EXTENDED_STACKS.find(s=>s.id===id);
export function chooseStack(prompt=''){
 if(/\bnext(?:\.js|js)\b/i.test(prompt))return 'next-v1';
 if(/\bvue(?:\.js|js)?\b/i.test(prompt))return 'vue-v1';
 if(/\bangular\b/i.test(prompt))return 'angular-v1';
 return 'react-v5';
}
export const BACKEND_CONTRACT=`OPTIONAL REAL BACKEND: When requested functionality needs server-side validation, shared multi-user state, transactions or a relational database, deliver src/server/routes.mjs exporting default async function register(app,{db}). app is a Fastify instance scoped to /api; define routes such as app.get('/items', async()=>...). Frontend calls fetch('/api/items'). db is a pg Pool connected to a persistent, isolated PostgreSQL database for this project, never exposed to the browser. Deliver ordered migrations src/server/migrations/001_initial.sql etc. Migrations run transactionally once and are immutable: append later migrations, never rewrite applied ones. Use parameterized SQL ($1,$2), schema validation, pagination and transactions with SELECT FOR UPDATE or constraints for stock/bookings. Always release acquired clients in finally. Return real errors and status codes; await commits before confirming. No secrets in source, no listen() or process startup in routes. Helpers may be .mjs in src/server/. Only backend imports pg and node builtins. Zod is available in both frontend and backend. Do not use window.DevKillerDB for records owned by PostgreSQL. Lightweight apps may instead use the existing DevKillerDB service. Auth/payments/third-party credentials are not provisioned automatically: never simulate them. Backend is private local preview infrastructure, not production tenant authentication.`;
export const LIBRARY_CONTRACT=`OFFICIAL COMPONENT REGISTRY: shadcn/ui source components are supplied automatically when imported from @/components/ui/<name>. Available: button, input, textarea, label, card, badge, separator, skeleton, dialog, alert-dialog, select, tabs, dropdown-menu, popover, tooltip, sheet, checkbox, switch, table, accordion, progress, slider, scroll-area, avatar. Use their standard named exports. Do not regenerate these primitives; compose domain-specific UI around them. @/lib/utils supplies cn(). Source is copied into the project and remains editable/exportable. A token stylesheet is supplied; customize CSS variables for the requested art direction. Import @import "tailwindcss"; at the start of src/styles.css. shadcn is not an importable npm package.
ADDITIONAL INSTALLED LIBRARIES: three, three/addons/*, @react-three/fiber (Canvas/useFrame), @react-three/drei, @tanstack/react-query (QueryClientProvider required), @tanstack/react-table v8. Use only where needed. Three.js must dispose resources and handle unavailable WebGL with a usable fallback; explicit canvas dimensions; respect reduced motion, intentional requestAnimationFrame/render loops with pause/unmount cleanup and appropriate pixel ratio. R3F Canvas needs an error boundary. For requested 3D experiences, compose intentional silhouettes, layered geometry, materials, lighting and camera movement appropriate to the brief; procedural scenes may be detailed and stylized, while supplied approved models can be used. do not invent model URLs. Prefer conventional layout for ordinary content, not a 3D scene everywhere. Table and charts must reflect saved data. React Query must invalidate related queries after successful mutations.`;
export function extendedContract(stack){
 const p=extendedProfile(stack);if(!p)return null;
 const common=`DEVKILLER ${stack}. Complete source under src/ only, organized by pages/components/domain/data/styles. JavaScript/TypeScript supported. Configuration, package manifests and entry bootstrap are supplied by Engine. No package installation during generation. Required stylesheet src/styles.css. Alias @/ maps to src/. Browser persistence for lightweight apps: await window.DevKillerDB.get(key), set(key,value), remove(key). Load before mutations, never overwrite loaded data with seeds, await saves and show errors. All requested actions and secondary screens must work. Never claim tests were executed. ${BACKEND_CONTRACT} ${MOTION_CONTRACT}`;
 if(p.family==='react')return common+' React 19, Vite. Deliver src/App.jsx (or src/App.tsx) default App. Available React Pro libraries: React, lucide-react, Recharts, radix-ui, motion/react, react-router-dom, react-hook-form, @hookform/resolvers/zod, zod, clsx, tailwind-merge, class-variance-authority, Tailwind. '+LIBRARY_CONTRACT;
 if(p.family==='vue')return common+' Vue 3 SFCs with <script setup>, <template>, scoped CSS as needed. Deliver src/App.vue. Available packages: vue, lucide-vue-next, three and three/addons/*. Do not import React, shadcn, Angular or React-only packages. Use refs/computed and proper lifecycle cleanup. Bootstrap is platform-owned.';
 if(p.family==='angular')return common+' Angular standalone components in TypeScript, JIT build with Vite. Deliver src/app.component.ts exporting AppComponent with selector app-root and standalone:true. Use inline template/styles, signals and imports from @angular/core, @angular/common, @angular/platform-browser, rxjs. Zoneless change detection; use signals for async UI state. @angular/compiler is supplied by bootstrap. Do not use constructor-injected dependencies; use inject(). Do not import React or shadcn. This profile is a browser application, not Angular SSR.';
 return common+' Next.js App Router with STATIC EXPORT. Deliver src/app/page.jsx and src/app/layout.jsx; layout imports ../styles.css, returns html/body and includes <script src="/__devkiller/db.js"/>. Use use client for interactive components. Static build has no request-time Server Actions, cookies, API routes or SSR; requested APIs belong in the separate Fastify backend described above. Known dynamic routes need generateStaticParams; use client-side search/state for unbounded IDs. No next/font network fetch: use supplied local fonts with CSS fallbacks. next/image needs unoptimized. React Pro libraries available. '+LIBRARY_CONTRACT;
}
// Materialize only referenced official primitives (and their dependencies), never all components blindly.
export function hydrateComponents(files,stack){
 if(!['react-v5','next-v1'].includes(stack))return files;
 const map=new Map(files.map(f=>[f.name,f]));const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',registry),'utf8'));
 const known=new Map(manifest.components.map(x=>[x.name,x]));let added=true;
 while(added){added=false;for(const f of [...map.values()]){
  for(const match of f.content.matchAll(/(?:@\/components\/ui\/|from\s+["']\.\/)([a-z-]+)(?:\.[jt]sx)?["']/g)){
   const name=match[1];if(!known.has(name))continue;
   if([...map.keys()].some(k=>new RegExp('^src/components/ui/'+name+'\\.[jt]sx?$').test(k)))continue;
   const file={name:'src/components/ui/'+name+'.tsx',content:fs.readFileSync(new URL(name+'.tsx',registry),'utf8')};if(createHash('sha256').update(file.content).digest('hex')!==known.get(name).sha256)throw Error('Official component registry changed: '+name);map.set(file.name,file);added=true;
  }
 }}
 if([...map.keys()].some(k=>k.startsWith('src/components/ui/'))||[...map.values()].some(f=>f.content.includes('@/lib/utils'))){
  if(!map.has('src/lib/utils.ts')&&!map.has('src/lib/utils.js'))map.set('src/lib/utils.ts',{name:'src/lib/utils.ts',content:"import {clsx} from 'clsx';import {twMerge} from 'tailwind-merge';export function cn(...inputs:any[]){return twMerge(clsx(inputs));}"});
  const name='src/styles/shadcn-tokens.css';if(!map.has(name))map.set(name,{name,content:fs.readFileSync(new URL('tokens.css',registry),'utf8')});
  const style=map.get('src/styles.css');if(style&&!style.content.includes('shadcn-tokens.css'))map.set(style.name,{...style,content:'@import "tailwindcss";\n@import "./styles/shadcn-tokens.css";\n'+style.content.replace(/@import\s+["']tailwindcss["'];?/g,'')});
  map.set('src/shadcn-provenance.json',{name:'src/shadcn-provenance.json',content:JSON.stringify({source:manifest.source,license:manifest.license,components:manifest.components.filter(c=>map.has('src/components/ui/'+c.name+'.tsx'))})});
 }
 return [...map.values()];
}
