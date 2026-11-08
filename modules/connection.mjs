import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const DEFAULT_MODEL='gpt-6-luna';
export const MODELS=Object.freeze([
 {id:DEFAULT_MODEL,label:'GPT-6 Luna',description:'Default · efficient app generation',reasoning:true},
 {id:'gpt-6-sol',label:'GPT-6 Sol',description:'Complex coding and agentic workflows',reasoning:true},
 {id:'gpt-6-astra',label:'GPT-6 Astra',description:'Most capable · demanding end-to-end work',reasoning:true},
 {id:'gpt-5.6-luna',label:'GPT-5.6 Luna',description:'Previous generation · cost-conscious workloads',reasoning:true},
 {id:'gpt-5.6-terra',label:'GPT-5.6 Terra',description:'Balanced capability and cost',reasoning:true},
 {id:'gpt-5.6-sol',label:'GPT-5.6 Sol',description:'Complex professional workloads',reasoning:true},
 {id:'gpt-4.1-mini',label:'GPT-4.1 mini',description:'Previous Engine model · no reasoning budget',reasoning:false}
]);
export function validateModel(model){if(!MODELS.some(m=>m.id===model))throw new Error('Choose a supported OpenAI model.');return model;}
export function validateConnection(input){
 if(input?.provider!=='openai')throw new Error('Local models are not connected yet. Choose OpenAI to generate an app.');
 return {provider:'openai',model:validateModel(input.model)};
}
export class ConnectionStore{
 constructor(directory){this.directory=directory;this.file=path.join(directory,'connection.json');}
 async load(){try{return validateConnection(JSON.parse(await fs.readFile(this.file,'utf8')));}catch(error){if(error.code==='ENOENT')return {provider:'openai',model:DEFAULT_MODEL};throw new Error('The saved model setting could not be read. Save a model in Connections before generating.');}}
 async save(input){const value=validateConnection(input);await fs.mkdir(this.directory,{recursive:true});const temporary=path.join(this.directory,randomUUID()+'.tmp');try{await fs.writeFile(temporary,JSON.stringify(value,null,2),{flag:'wx'});await fs.rename(temporary,this.file);}catch{throw new Error('The model setting could not be saved. The previous selection was kept.');}finally{await fs.rm(temporary,{force:true}).catch(()=>{});}return value;}
}
