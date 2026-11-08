import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retrievalNeeds} from '../modules/knowledge-selection.mjs';
import {extendedContract} from '../modules/extended-stacks.mjs';
import {generationContract} from '../modules/openai.mjs';
test('animation retrieval remains bounded alongside persistence, business rules and design',()=>{
 const needs=retrievalNeeds('Build a premium rental booking application with persisted inventory, stock, prices and Anime.js SVG timeline animation. '.repeat(4),'react-v5');
 assert.equal(needs.length,4);
 assert.match(needs.find(n=>n.id==='technology').query,/Anime.js v4/);
 assert.equal(needs.find(n=>n.id==='technology').broad,false);
 assert.ok(needs.some(n=>n.id==='data'));
 assert.ok(needs.some(n=>n.id==='rules'));
});
test('animation contracts reach every current generation profile without changing legacy profiles',()=>{
 for(const stack of ['react-v5','vue-v1','angular-v1','next-v1']){
  assert.match(extendedContract(stack),/animejs 4.5.0/);
  assert.match(generationContract(stack),/GSAP STATUS: research-only/);
  assert.match(generationContract(stack),/reduced-motion/);
 }
 assert.doesNotMatch(generationContract('react-v1'),/animejs 4.5.0/);
});
