import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateFiles} from '../modules/files.mjs';
const index={name:'index.html',content:'<h1>Oi</h1>'};
test('aceita página inicial e arquivos em subpastas',()=>assert.equal(validateFiles([index,{name:'assets/app.js',content:'console.log(1)'}]).length,2));
test('exige index.html na raiz',()=>assert.throws(()=>validateFiles([{name:'app.js',content:''}]),/index.html/));
test('rejeita saída da pasta, caminhos Windows e formatos executáveis',()=>{
  for(const name of ['../escape.html','/etc/file.js','a/../../x.js','C:/temp/app.js','a\\app.js','server.exe'])assert.throws(()=>validateFiles([index,{name,content:''}]));
});
test('rejeita duplicatas e entradas malformadas',()=>{
  for(const files of [null,[],[index,index],[index,{name:'INDEX.HTML',content:''}],[index,{name:'x.js',content:123}]])assert.throws(()=>validateFiles(files));
});
test('impõe limites de volume e quantidade',()=>{
  assert.throws(()=>validateFiles([{...index,content:'x'.repeat(2*1024*1024+1)}]),/2 MB/);
  assert.throws(()=>validateFiles(Array.from({length:81},()=>index)),/80/);
});
