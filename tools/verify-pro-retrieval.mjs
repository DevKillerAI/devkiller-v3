import fs from 'node:fs/promises';
import {AnythingLLMKnowledge} from '../modules/anythingllm-knowledge.mjs';
import {generationContract} from '../modules/openai.mjs';
import assert from 'node:assert/strict';
const k=new AnythingLLMKnowledge(await fs.mkdtemp('.runtime/pro-retrieval-'));
try{await k.initialize();await k.setMode('anythingllm');const results=[];
for(const [id,query] of [['R01','React Pro forms validation with React Hook Form and Zod'],['R02','React Pro Tailwind accessible local UI components and visual composition']]){const c=await k.retrieve({query,stack:'react-v4'});await k.validateContext(c,'react-v4');results.push({id,found:c.chunks.some(x=>x.id===id),references:c.chunks.map(x=>x.id)});}
assert.ok(results.every(r=>r.found));assert.ok(generationContract('react-v4').includes('react-hook-form'));assert.ok(!generationContract('react-v3').includes('react-hook-form'));
await fs.writeFile('validation/pro-v1/retrieval.json',JSON.stringify({results,paidGenerations:0},null,2));console.log(JSON.stringify(results));}finally{k.close();}
