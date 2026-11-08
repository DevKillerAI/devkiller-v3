import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ProjectStore} from '../modules/projects.mjs';
import {filesHash,confirmedRepairIssues,reserveRepairAttempt} from '../modules/repair.mjs';
import {repairApp} from '../modules/openai.mjs';
const files=[{name:'index.html',content:'<h1>Example</h1>'}];
const defect={check:'javascript-startup',category:'funcional',status:'failed',evidence:'ReferenceError',artifactHash:filesHash(files)};
test('unreviewed model assertions and stale results cannot purchase repairs',async()=>{
  for(const issue of [{...defect,source:'model-proposed-scenario'},{...defect,check:'acceptance-5'},{...defect,artifactHash:'old-version'}]){
    let calls=0;
    await assert.rejects(async()=>repairApp({files,diagnostics:[issue],fetchImpl:async()=>{calls++;throw Error('Unexpected network');}}),/no confirmed functional issue/);
    assert.equal(calls,0);
  }
  assert.deepEqual(confirmedRepairIssues([defect],files),[defect]);
});
test('repair reservation survives reopening and cannot duplicate the same work',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dk-repair-guard-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const store=new ProjectStore(root),project=store.create();
  const fingerprint=reserveRepairAttempt(store,project.id,files,[defect],'first-job');
  assert.equal(fingerprint.length,64);
  const reopened=new ProjectStore(root);
  assert.throws(()=>reserveRepairAttempt(reopened,project.id,files,[defect],'new-job'),/already been reserved/);
  assert.equal(reopened.use(project.id,db=>db.prepare('SELECT COUNT(*) AS n FROM repair_attempt_guards').get().n),1);
});
