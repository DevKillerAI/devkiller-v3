import {builtinModules} from 'node:module';
import path from 'node:path';
export function backendBuildConfig(root=process.cwd()){
 return {root,configFile:false,envFile:false,publicDir:false,logLevel:'silent',resolve:{alias:{'@':path.join(root,'src')}},build:{ssr:path.join(root,'src/server/routes.mjs'),outDir:'backend-dist',target:'node24',minify:false,rollupOptions:{external:id=>['pg','zod',...builtinModules].includes(id)||id.startsWith('node:'),output:{entryFileNames:'routes.mjs',inlineDynamicImports:true}}}};
}
export default backendBuildConfig();
