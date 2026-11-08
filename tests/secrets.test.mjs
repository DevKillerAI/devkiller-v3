import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {SecretStore} from '../modules/secrets.mjs';
test('DPAPI persiste criptografado, recupera em nova instância, substitui e exclui',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'devkiller-secret-test-'));
  const secret='sk-dpapi-test-placeholder-not-a-real-key';
  try{
    const store=new SecretStore(directory);assert.equal(await store.load(),'');
    await store.save(secret);
    const stored=await fs.readFile(store.file,'utf8');assert.equal(stored.includes(secret),false);assert.notEqual(stored,Buffer.from(secret).toString('base64'));
    assert.equal(await new SecretStore(directory).load(),secret);
    await store.save(secret+'-replacement');assert.equal(await new SecretStore(directory).load(),secret+'-replacement');
    await store.remove();assert.equal(await new SecretStore(directory).load(),'');
  }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('cofre corrompido falha sem expor conteúdo nem criar chave substituta',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'devkiller-secret-test-'));
  try{const store=new SecretStore(directory);await fs.writeFile(store.file,'invalid-secret-payload');await assert.rejects(store.load(),error=>!error.message.includes('invalid-secret-payload'));assert.equal(await fs.readFile(store.file,'utf8'),'invalid-secret-payload');}
  finally{await fs.rm(directory,{recursive:true,force:true});}
});
