import {getEncoding} from 'js-tiktoken';

export const EMBEDDING_MODEL='text-embedding-3-small';
export const EMBEDDING_DIMENSIONS=512;
const tokenizer=getEncoding('cl100k_base');
export const tokenCount=text=>tokenizer.encode(text,[],[]).length;
export const boundedEmbeddingQuery=text=>tokenizer.decode(tokenizer.encode(text,[],[]).slice(0,2000));
export function validateEmbeddingInput(texts,apiKey){
  let message;
  if(typeof apiKey!=='string'||!/^sk-[A-Za-z0-9_-]{15,500}$/.test(apiKey))message='Connect OpenAI before building or querying the semantic index.';
  else if(!Array.isArray(texts)||!texts.length||texts.length>64||texts.some(t=>typeof t!=='string'||!t.trim()||tokenCount(t)>2000)||texts.reduce((n,t)=>n+tokenCount(t),0)>64000)message='Embedding input exceeds the bounded batch size.';
  if(message){const error=new Error(message);error.providerAttempted=false;throw error;}
}

// Fixed endpoint, no retries, no raw provider errors or credentials in receipts.
export async function embedTexts(texts,{apiKey,signal,fetchImpl=fetch,timeoutMs=30000}={}){
  validateEmbeddingInput(texts,apiKey);
  const timeout=AbortSignal.timeout(timeoutMs),combined=signal?AbortSignal.any([signal,timeout]):timeout;
  try{
    const response=await fetchImpl('https://api.openai.com/v1/embeddings',{method:'POST',redirect:'error',signal:combined,headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:EMBEDDING_MODEL,input:texts,dimensions:EMBEDDING_DIMENSIONS,encoding_format:'float'})});
    if(!response.ok)throw new Error(`Embeddings unavailable (HTTP ${response.status}). No retry was made.`);
    if(!response.body)throw new Error('The embedding provider returned no body.');
    const reader=response.body.getReader();let bytes=0;const chunks=[];
    try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4*1024*1024)throw new Error('Embedding response exceeds the transfer limit.');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
    let data;try{data=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new Error('Invalid embedding response.');}
    if(data.model!==EMBEDDING_MODEL||!Array.isArray(data.data)||data.data.length!==texts.length)throw new Error('Embedding response does not match the requested model or batch.');
    const vectors=new Array(texts.length);
    for(const item of data.data){const v=item.embedding;if(!Number.isInteger(item.index)||item.index<0||item.index>=texts.length||vectors[item.index]||!Array.isArray(v)||v.length!==EMBEDDING_DIMENSIONS||v.some(n=>typeof n!=='number'||!Number.isFinite(n))||!v.some(n=>n!==0))throw new Error('Invalid embedding dimensions, values or batch indexes.');vectors[item.index]=v;}
    const tokens=data.usage?.total_tokens;
    return {vectors,usage:Number.isSafeInteger(tokens)&&tokens>=0?{tokens,model:EMBEDDING_MODEL}:null};
  }catch(error){
    if(signal?.aborted)throw new Error('Knowledge operation cancelled. Embedding work already processed may be billed.');
    if(timeout.aborted)throw new Error('Embeddings timed out. No retry was made; processed work may be billed.');
    if(error instanceof TypeError)throw new Error('Could not connect to the embedding provider. No retry was made.');
    // Only our errors survive; unexpected SDK/network strings are never returned.
    if(/^(Embeddings unavailable|The embedding provider|Embedding response|Invalid embedding|Embedding input)/.test(error.message))throw error;
    throw new Error('The embedding request failed. No retry was made.');
  }
}
