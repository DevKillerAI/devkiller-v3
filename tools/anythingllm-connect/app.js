const form=document.querySelector('#connection'),input=document.querySelector('#api-key'),button=document.querySelector('#save'),status=document.querySelector('#status');
let token='';
async function init(){
  try{const response=await fetch('/api/status',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();token=data.token;input.disabled=false;button.disabled=false;status.textContent=data.configured?'Já existe uma chave guardada. Salvar outra substituirá a anterior.':'Pronto para receber sua chave.';}
  catch{status.dataset.kind='error';status.textContent='Não foi possível abrir a conexão. Recarregue esta tela.';}
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled||!input.value.trim())return;
  let apiKey=input.value;input.value='';input.disabled=true;button.disabled=true;button.textContent='Validando e guardando…';status.dataset.kind='';status.textContent='Conferindo a chave no AnythingLLM…';
  try{
    const pending=fetch('/api/key',{method:'POST',headers:{'Content-Type':'application/json','X-Connect-Token':token},body:JSON.stringify({apiKey})});apiKey='';
    const response=await pending;const data=await response.json();
    if(!response.ok){status.dataset.kind='error';status.textContent=data.error||'Não foi possível salvar. Tente novamente.';return;}
    status.textContent=data.message;form.hidden=true;
  }catch{status.dataset.kind='error';status.textContent='Conexão interrompida. Recarregue a tela para conferir se a chave foi guardada.';}
  finally{apiKey='';input.value='';input.disabled=false;button.disabled=false;button.textContent='Validar e guardar →';}
});
window.addEventListener('pagehide',()=>{input.value='';});
init();
