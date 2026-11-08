const $=id=>document.getElementById(id);
let token='',pending=false,current,initialized=false;
function message(text,error=false){$('settings-message').textContent=text;$('settings-message').hidden=!text;$('settings-message').className=error?'error':'';}
function modelDescription(){const model=current?.connection?.models.find(m=>m.id===$('model').value);$('model-description').textContent=model?model.description+'. '+(model.reasoning?'The output budget includes reasoning and generated code.':'The output budget is used for the response.'):'Choose a model.';}
function render(s){
 current=s;if(s.token)token=s.token;
 const configured=!!s.openai?.configured,busy=s.busy||pending;
 $('secret-status').textContent=configured?'Key saved':s.openai?.error?'Needs attention':'Not configured';
 $('secret-status').className='status '+(configured?'running':'');
 $('saved-description').textContent=s.openai?.error||(configured?'Your key is protected on this computer and ready for the Engine. You can replace it below.':'Save your key once. The Engine will remember it when you return.');
 $('save-secret').textContent=pending?'Saving…':configured?'Replace key':'Save key';
 $('save-secret').disabled=busy;$('api-key').disabled=busy;$('remove-secret').disabled=busy||(!configured&&!s.openai?.error);
 if(!initialized&&s.connection){$('model').replaceChildren(...s.connection.models.map(m=>{const option=document.createElement('option');option.value=m.id;option.textContent=m.label+(m.id==='gpt-6-luna'?' · default':'');return option;}));$('model').value=s.connection.model;initialized=true;modelDescription();}
 $('provider').disabled=busy;$('model').disabled=busy;$('save-connection').disabled=busy||!initialized;
 $('connection-status').textContent=s.connection?.error||`Saved model: ${s.connection?.model||'loading…'}. Used for new generations and repairs.`;
 $('connection-status').className=s.connection?.error?'error':'';
}
async function refresh(){try{const res=await fetch('/api/state');if(!res.ok)throw new Error();render(await res.json());}catch{message('Could not reach the Engine. Reopen the panel and try again.',true);}}
async function update(route,payload){
 pending=true;message('');if(current)render(current);
 try{const res=await fetch(route,{method:'POST',headers:{'Content-Type':'application/json','X-DevKiller-Token':token},body:JSON.stringify(payload)});const data=await res.json();if(!res.ok)throw new Error(data.error);render(data);message(route==='/api/connection'?'Model saved on this PC. No AI call was made.':route.endsWith('/clear')?'Key removed from this Engine.':'Key saved securely. It will remain available when you reopen the Engine.');}
 catch(error){message(error.message,true);}
 finally{pending=false;await refresh();}
}
$('connection-form').addEventListener('submit',event=>{event.preventDefault();void update('/api/connection',{provider:$('provider').value,model:$('model').value});});
$('model').addEventListener('change',modelDescription);
$('secret-form').addEventListener('submit',event=>{event.preventDefault();const value=$('api-key').value;$('api-key').value='';void update('/api/openai/key',{apiKey:value});});
$('remove-secret').addEventListener('click',()=>update('/api/openai/clear',{}));
await refresh();setInterval(refresh,1500);
