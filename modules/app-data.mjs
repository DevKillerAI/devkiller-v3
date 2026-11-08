export const databaseScript=`window.DevKillerDB=Object.freeze({
  async get(key){return this.request('GET',key)},
  async set(key,value){return this.request('PUT',key,value)},
  async remove(key){return this.request('DELETE',key)},
  async request(method,key,value){const response=await fetch('/__devkiller/data/'+encodeURIComponent(key),{method,headers:{'Content-Type':'application/json'},...(method==='PUT'?{body:JSON.stringify({value})}:{})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not access the local database.');return data.value;}
});`;

// Called only on an app's own origin. QA origins receive disposable memory storage.
export async function serveAppData(req,res,{origin,store,projectId,memory}){
  const url=new URL(req.url,origin);
  if(url.pathname==='/__devkiller/db.js'){
    res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(databaseScript);return true;
  }
  if(!url.pathname.startsWith('/__devkiller/data/'))return false;
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{
    if(!['GET','PUT','DELETE'].includes(req.method)){reply(405,{error:'Operation not allowed.'});return true;}
    if(req.method!=='GET'&&(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json'))){reply(403,{error:'Open this app at its own address to save data.'});return true;}
    const key=decodeURIComponent(url.pathname.slice('/__devkiller/data/'.length));
    if(!key||key.length>120)throw new Error('Invalid record name.');
    let value=null;
    if(req.method==='PUT'){
      const chunks=[];let bytes=0;
      for await(const chunk of req){bytes+=chunk.length;if(bytes>270000)throw new Error('Record too large.');chunks.push(chunk);}
      const input=JSON.parse(Buffer.concat(chunks).toString());if(!Object.hasOwn(input,'value'))throw new Error('Provide the record value.');value=input.value;
    }
    if(memory){if(req.method==='PUT')memory.set(key,value);if(req.method==='DELETE')memory.delete(key);value=memory.get(key)??null;}
    else {if(!projectId)throw new Error('Save the app as a project before using the database.');value=store.data(projectId,req.method,key,value);}
    reply(200,{value});
  }catch(error){reply(400,{error:error.message});}
  return true;
}
