const key='devkiller-demo-tasks-v1';
let tasks=[];
try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))tasks=saved.filter(t=>t&&typeof t.id==='string'&&typeof t.text==='string'&&typeof t.done==='boolean').slice(0,500);}catch{}
const list=document.getElementById('tasks');
function render(){
  list.replaceChildren(...tasks.map(task=>{
    const li=document.createElement('li');li.className=task.done?'done':'';
    const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=task.done;check.setAttribute('aria-label',`Concluir ${task.text}`);
    check.addEventListener('change',()=>{task.done=check.checked;save('Tarefa atualizada.');});
    const text=document.createElement('span');text.textContent=task.text;label.append(check,text);
    const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`Excluir ${task.text}`);remove.addEventListener('click',()=>{tasks=tasks.filter(t=>t.id!==task.id);save('Tarefa excluída.');});li.append(label,remove);return li;
  }));
  document.getElementById('empty').hidden=tasks.length>0;
  document.getElementById('count').textContent=`${tasks.length} ${tasks.length===1?'tarefa':'tarefas'}`;
  const done=tasks.filter(t=>t.done).length;
  document.getElementById('progress').textContent=tasks.length?`${done} de ${tasks.length} concluídas`:'Tudo pronto para começar.';
}
function save(message){try{localStorage.setItem(key,JSON.stringify(tasks));document.getElementById('feedback').textContent=message;}catch{document.getElementById('feedback').textContent='O navegador não permitiu salvar. As tarefas ficarão apenas nesta página.';}render();}
document.getElementById('task-form').addEventListener('submit',e=>{
  e.preventDefault();const input=document.getElementById('new-task');const text=input.value.trim();
  if(!text){document.getElementById('feedback').textContent='Digite uma tarefa antes de adicionar.';input.focus();return;}
  if(tasks.length>=500){document.getElementById('feedback').textContent='Limite de 500 tarefas atingido.';return;}
  tasks.push({id:crypto.randomUUID(),text,done:false});input.value='';save('Tarefa adicionada.');input.focus();
});render();
