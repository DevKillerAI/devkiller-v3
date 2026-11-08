import {EXTENDED_STACKS,extendedProfile} from './extended-stacks.mjs';
import {validateFiles} from './files.mjs';
export const STATIC='static-v1',REACT='react-v1',REACT_DESIGN='react-v2',REACT_STUDIO='react-v3',REACT_PRO='react-v4';
export const STACKS=[...EXTENDED_STACKS,{id:REACT_PRO,label:'React Pro · forms, validation and Tailwind',compiled:true},{id:STATIC,label:'HTML, CSS and JavaScript',compiled:false},{id:REACT,label:'Basic React (compatibility)',compiled:true},{id:REACT_DESIGN,label:'React + icons, charts and local database',compiled:true},{id:REACT_STUDIO,label:'React Studio · accessible controls, motion and routing',compiled:true}];
export const isCompiled=stack=>stack!==STATIC&&!!STACKS.find(p=>p.id===stack);
export const isReact=stack=>[REACT,REACT_DESIGN,REACT_STUDIO,REACT_PRO,'react-v5','next-v1'].includes(stack);
export function stackProfile(id=STATIC){const profile=STACKS.find(s=>s.id===id);if(!profile)throw new Error('This app format is not supported yet.');return profile;}
export function validateSource(files,stack=STATIC){
 stackProfile(stack);
 if(stack===STATIC)return validateFiles(files);
 const extended=extendedProfile(stack);
 if(extended){
  validateFiles(files,{requireIndex:false,namePattern:/^[a-zA-Z0-9_./ ()\[\]-]+$/,maxFiles:160,maxBytes:4*1024*1024,extensions:['.jsx','.js','.tsx','.ts','.vue','.css','.svg','.json','.mjs','.sql']});
  for(const f of files)if(!f.name.startsWith('src/')||(f.name.endsWith('.sql')&&!f.name.startsWith('src/server/migrations/')))throw Error('Source must stay inside src/; SQL migrations inside src/server/migrations/.');
  if(!files.some(f=>f.name===extended.entry||f.name===extended.entry.replace('.jsx','.tsx')))throw Error('Required entry: '+extended.entry);
  if(!files.some(f=>f.name==='src/styles.css'))throw Error('Required stylesheet src/styles.css.');
  if(files.some(f=>f.name.startsWith('src/server/'))&&!files.some(f=>f.name==='src/server/routes.mjs'))throw Error('Backend requires src/server/routes.mjs.');
  return files;
 }
 validateFiles(files,{requireIndex:false,extensions:['.jsx','.js','.css','.svg','.json']});
 for(const file of files)if(!file.name.startsWith('src/'))throw new Error('For React, submit only files inside src/. The runtime structure belongs to DevKiller.');
 for(const required of ['src/App.jsx','src/styles.css'])if(!files.some(f=>f.name===required))throw new Error(`The React format requires ${required}.`);
 return files;
}
export const REACT_CONTRACT=`CONTRATO DEVKILLER react-v1
Use React 19.3.0, JavaScript/JSX e CSS comum. O DevKiller prepara o aplicativo com Vite 8.3.0; a configuração, index.html e main.jsx são fornecidos pela plataforma.
Entregue src/App.jsx com export default de um componente App e src/styles.css. Componentes auxiliares .jsx, funções .js, JSON e SVG locais podem ficar em subpastas de src/. Não entregue package.json, index.html, main.jsx, configurações Vite, scripts de instalação ou arquivos fora de src/.
As únicas importações de pacote permitidas nos arquivos gerados são react, react/jsx-runtime e react/jsx-dev-runtime. Use importações relativas para os demais arquivos dentro de src/. Não use ReactDOM: o DevKiller já monta o componente App.
Use useState para estado da interface e useEffect para carregamento inicial. Faça os hooks no topo dos componentes, sem condicionais. Use listas com key estável e controles com rótulos acessíveis. Navegação entre telas deve ser local por estado, sem biblioteca de rotas nesta etapa.
O banco window.DevKillerDB já está disponível: await window.DevKillerDB.get('estado'), set('estado', objetoJSON), remove('estado'). Não importe nem recrie essa API. Carregue antes de habilitar alterações. Ao salvar, aguarde a promessa; mostre estado de salvamento e erro legível, evitando gravações simultâneas conflitantes. Não grave o estado inicial por cima dos dados carregados. Use useEffect apenas para carregar e ações explícitas para salvar.
Exemplo de carregamento: useEffect(()=>{let ativo=true;window.DevKillerDB.get('estado').then(d=>{if(ativo){setItens(d??[]);setCarregando(false)}}).catch(()=>{if(ativo)setErro('Não foi possível carregar seus dados.')});return()=>{ativo=false}},[]).
Implemente as ações do pedido com estados de carregamento, vazio e erro. Use JSX para texto do usuário, sem dangerouslySetInnerHTML. Não afirme ter executado testes. Entregue arquivos completos e coerentes entre si; não remova funcionalidades para fazer a compilação passar.`;
export const REACT_DESIGN_CONTRACT=REACT_CONTRACT.replace('CONTRATO DEVKILLER react-v1','CONTRATO DEVKILLER react-v2').replace('As únicas importações de pacote permitidas nos arquivos gerados são react, react/jsx-runtime e react/jsx-dev-runtime.','As únicas importações de pacote permitidas nos arquivos gerados são react, react/jsx-runtime, react/jsx-dev-runtime, lucide-react e recharts.')+`
BIBLIOTECAS DISPONÍVEIS, JÁ INSTALADAS LOCALMENTE
lucide-react 1.45.0: importe ícones pelo nome, por exemplo import {Plus, Search, Trash2, ChevronDown} from 'lucide-react'. Use <Plus size={20} aria-hidden="true"/> ao lado de texto; botões somente com ícone precisam de aria-label. Não use importação dinâmica do catálogo ou subcaminhos.
recharts 3.10.1: importe componentes pelo nome, por exemplo import {ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid} from 'recharts'. Use apenas quando gráficos ajudarem a entender os dados do pedido; não acrescente gráficos decorativos.
Exemplo: <div style={{width:'100%',height:280,minWidth:0}}><ResponsiveContainer width="100%" height="100%"><BarChart data={dados}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="nome"/><YAxis/><Tooltip/><Bar dataKey="valor" fill="var(--accent)" isAnimationActive={false}/></BarChart></ResponsiveContainer></div>. O pai precisa de altura definida e largura disponível; os valores de dataKey devem corresponder às propriedades reais, com valores numéricos finitos. Inclua uma alternativa textual ou tabela e um estado sem dados.
Use CSS comum para Grid/Flex, gradientes, estados interativos e animações; Tailwind, componentes shadcn, bibliotecas de rotas e outras dependências não estão disponíveis. As dependências são empacotadas no aplicativo, sem CDN nem instalação durante a geração.`;
