// Loaded only by an isolated test process. No production provider switch exists.
import './openai-fixture.mjs';
const previous=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')return previous(url,options);
 if(options.headers.Authorization!=='Bearer sk-browser-test-placeholder-not-a-real-key')throw Error('Only the fixture key is allowed.');
 const body=JSON.parse(options.body);
 if(body.text?.format?.name==='mvp_conversation')return Response.json({status:'completed',usage:{input_tokens:100,output_tokens:30,total_tokens:130},output:[{content:[{type:'output_text',text:JSON.stringify({message:'I can change that heading.',changeRequest:'Change heading to Revised title.'})}]}]});
 let data;try{data=JSON.parse(body.input);}catch{return previous(url,options);}
 if(data.task!=='user-requested revision')return previous(url,options);
 if(body.text?.format?.name==='devkiller_patch'){const first=data.files[0],broken=data.request.includes('BREAK_EDIT'),before=broken?first.content.slice(-60):'<h1>Contador de teste</h1>',after=broken?before+'<script>throw new Error("Deliberate test failure")</script>':'<h1>Revised title</h1>';return Response.json({status:'completed',usage:{input_tokens:100,output_tokens:80,total_tokens:180},output:[{content:[{type:'output_text',text:JSON.stringify({summary:'A targeted fixture edit.',patches:[{file:first.name,before,after}],visualChecks:[]})}]}]});}

 const app={title:'Revised fixture',summary:'A bounded edit from the fixture provider.',limitations:[],scenarios:[],files:data.files.map(f=>({...f,content:f.content.replace('<h1>Contador de teste</h1>','<h1>Revised title</h1>')+(data.request.includes('BREAK_EDIT')&&f.name==='index.html'?'<script>throw new Error("Deliberate test failure")</script>':'')}))};
 return new Response('data: '+JSON.stringify({type:'response.output_text.delta',delta:JSON.stringify(app)})+'\n\ndata: '+JSON.stringify({type:'response.completed',response:{usage:{input_tokens:100,output_tokens:100,total_tokens:200}}})+'\n\n');
};
