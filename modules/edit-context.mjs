import {validateSource} from './stacks.mjs';
// Keep full editable files, with an inventory of omitted files. Never truncate code.
export function editContext({files,request,selection,originalPrompt,stack},limit=150000){
 validateSource(files,stack);
 const base={task:'user-requested revision',originalPrompt,request,selection};
 const full=JSON.stringify({...base,files});if(full.length<=limit)return full;
 const query=[request,selection?.text,selection?.selector].filter(Boolean).join(' '),words=new Set(query.toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g)||[]);
 const visual=/visual|color|font|spacing|layout|style|contrast|mobile|lighting|canvas|surface/i.test(query);
 const ranked=files.map((f,index)=>{let score=0;const name=f.name.toLowerCase(),text=f.content.toLowerCase();
  if(query.toLowerCase().includes(name)||query.toLowerCase().includes(name.split('/').at(-1)))score+=1000;
  for(const word of words)if(text.includes(word))score+=1;
  if(visual&&/\.(css|jsx|tsx|vue)$/.test(name))score+=20;
  if(visual&&name.startsWith('src/server/'))score-=100;
  if(name.startsWith('src/components/ui/'))score-=30;
  if(/\.json$/.test(name))score-=20;
  return {f,index,score};}).sort((a,b)=>b.score-a.score||a.index-b.index);
 const selected=[];const inventory=files.map(f=>({name:f.name,characters:f.content.length}));
 for(const {f} of ranked){const candidate=[...selected,f];if(JSON.stringify({...base,files:candidate,inventory}).length<=limit)selected.push(f);}
 if(!selected.length)throw Error('The relevant source cannot fit in one edit. Split this change into smaller requests. No call was made.');
 return JSON.stringify({...base,files:selected,inventory,contextNote:'Only files listed in files have complete source and may be patched. Inventory entries are not source. If a needed target is omitted, return no patches and name the needed file. Preserve all unlisted files.'});
}
