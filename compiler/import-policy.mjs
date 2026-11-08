import {posix as path} from 'node:path';

export function browserImportGuard(source, dependencies) {
 return {name:'devkiller-import-policy',enforce:'pre',resolveId(id,importer){
  if(!importer?.startsWith(source+'/'))return null;
  // Vite injects this virtual runtime into application chunks for lazy imports.
  // Defer this exact internal ID to Vite; other virtual IDs remain blocked.
  if(id==='\0vite/preload-helper.js')return null;
  if(id.startsWith('@/'))id='./'+path.relative(path.dirname(importer),source+'/'+id.slice(2)).replaceAll('\\','/');
  if(id.startsWith('.')||id.startsWith(source+'/')){const dest=path.resolve(path.dirname(importer),id.split('?')[0]);if(!dest.startsWith(source+'/')||dest.startsWith(source+'/server/'))throw Error('Frontend imports must remain in frontend source.');return null;}
  const name=id.startsWith('@')?id.split('/').slice(0,2).join('/'):id.split('/')[0];
  if(!dependencies[name]||['vite','typescript','@tailwindcss/vite','@vitejs/plugin-react','@vitejs/plugin-vue'].includes(name))throw Error('Unsupported browser dependency: '+id);
  return null;
 }};
}
