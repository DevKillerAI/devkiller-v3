import test from 'node:test';
import assert from 'node:assert/strict';
import {browserImportGuard} from '../compiler/import-policy.mjs';

test('lazy-import runtime passes without allowing arbitrary virtual modules or build tools',()=>{
 const guard=browserImportGuard('/work/src',{react:'19',vite:'8',typescript:'5'});
 const from='/work/src/App.jsx';
 assert.equal(guard.resolveId('\0vite/preload-helper.js',from),null);
 assert.equal(guard.resolveId('react',from),null);
 assert.equal(guard.resolveId('./components/Scene.jsx',from),null);
 for(const id of ['\0vite/unknown.js','\0other/runtime','vite','vite/preload-helper.js','typescript','node:fs','https://example.com/code.js','missing-package','../private.js','./server/routes.mjs'])assert.throws(()=>guard.resolveId(id,from),/Unsupported|Frontend imports/);
});
