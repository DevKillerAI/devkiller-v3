import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DockerRuntime} from '../modules/docker.mjs';
import {AppCompiler} from '../modules/compiler.mjs';
import {validateSource,REACT,REACT_DESIGN} from '../modules/stacks.mjs';
import {designFiles} from './design-fixture.mjs';
import {generationInstructions} from '../modules/openai.mjs';
import {reactFiles} from './react-fixture.mjs';
const compiler=new AppCompiler(new DockerRuntime(process.cwd(),'compiler-test'));
test('contrato React aceita componentes e recusa configurações ou caminhos arbitrários',()=>{
 assert.equal(validateSource(reactFiles,REACT),reactFiles);
 assert.throws(()=>validateSource([...reactFiles,{name:'vite.config.js',content:'throw 1'}],REACT),/only files/);
 assert.throws(()=>validateSource([{name:'src/../App.jsx',content:'x'}],REACT));
 assert.match(generationInstructions(REACT),/window.DevKillerDB/);assert.doesNotMatch(generationInstructions(REACT),/sem frameworks/);
});
test('React v2 compila ícones e gráficos; v1 e dependências não aprovadas continuam restritos',{timeout:90000},async()=>{
 const result=await compiler.prepare(designFiles,{stack:REACT_DESIGN});
 assert.equal(result.compiler,'devkiller-react:2');assert.equal(result.versions.recharts,'3.10.1');assert.equal(result.versions['lucide-react'],'1.45.0');
 assert.ok(result.files.some(f=>f.name.endsWith('.js')&&f.content.includes('recharts')));
 await assert.rejects(compiler.prepare(designFiles,{stack:REACT}),e=>e.checks?.[0].category==='funcional');
 await assert.rejects(compiler.prepare([{name:'src/App.jsx',content:"import x from 'unapproved-library';export default function App(){return <p>{x}</p>}"},reactFiles[1]],{stack:REACT_DESIGN}),e=>e.checks?.[0].category==='funcional');
});
test('compilação isolada gera arquivos reais e diagnostica sintaxe e bibliotecas não permitidas', {timeout:90000},async()=>{
 const valid=await compiler.prepare(reactFiles,{stack:REACT});assert.equal(valid.compiled,true);assert.ok(valid.files.some(f=>f.name==='index.html'));assert.ok(valid.files.some(f=>f.name.endsWith('.js')));assert.equal(valid.versions.react,'19.3.0');
 for(const content of ['export default function App( {',"import x from 'unapproved-library';export default function App(){return <h1>{x}</h1>}","import x from '../../opt/compiler/compile.mjs';export default function App(){return <h1>{x}</h1>}"]){
   await assert.rejects(compiler.prepare([{name:'src/App.jsx',content},reactFiles[1]],{stack:REACT}),e=>e.checks?.[0].category==='funcional'&&e.checks[0].status==='failed');
 }
 const missing=new AppCompiler({command:async()=>{throw new Error('missing')},remove:async()=>{}});
 await assert.rejects(missing.prepare(reactFiles,{stack:REACT}),e=>e.checks?.[0].category==='ambiente');
});
