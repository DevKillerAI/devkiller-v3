// Bounded retrieval by need, not a second LLM planning call.
export function retrievalNeeds(query,stack){
  const q=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const needs=[];
  if(/persist|sav[ei]|salv|banco|database|reserv|booking|estoque|inventory|customer|cliente|crud/.test(q))
    needs.push({id:'data',query:'Persistence database load before save failure concurrent writes persistencia banco salvamento',match:/persist|database|banco|salv|storage/i});
  if(/reserv|booking|rental|alug|dinheiro|centavos|cents|money|price|preco|currency|finance|dates|datas|estoque|stock/.test(q))
    needs.push({id:'rules',query:'Calendar dates money integer cents availability reservations stock validation datas valores monetarios estoque reservas',match:/dates|calendar|money|monetar|cent|estoque|stock|\breserv|booking/i});
  if(q.length>250||/react|javascript|form|stack|component|menu|dropdown/.test(q))needs.push({id:'technology',query:stack.startsWith('react')?'React components dependencies events forms error prevention accessible controls bibliotecas formularios erros':'JavaScript forms events validation script loading formularios erros',match:/react|depend|stack|forms|formular|errors|erros|controls|controles/i});
  if(q.length>250||/design|visual|premium|photo|image|imagem|layout|dropdown/.test(q))needs.push({id:'design',query:'Design visual composition typography photography polished interface responsive layout',match:/design|visual|composition|typograph|photograph|layout|premium/i});
  const motionRequest=/motion|animat|animac|three|webgl|3d|gsap|svg|choreograph|folder|pasta expans/.test(q);
  if(motionRequest&&['react-v5','next-v1','vue-v1','angular-v1'].includes(stack)){
    const topicQueries=[];
    const requiredIds=[];
    if(/three\.?js|webgl|\b3d\b|react three fiber|\br3f\b|glass|meshphysicalmaterial/i.test(q)){
      topicQueries.push('M06 Three.js React Three Fiber R3F premium scene art direction PBR glass environment map transmission lighting camera visual acceptance');
      requiredIds.push('M06');
    }
    if(/\bgsap\b|scrolltrigger/.test(q)){
      topicQueries.push('M07 GSAP timeline choreography lifecycle matchMedia ScrollTrigger licensing boundary');
      requiredIds.push('M07','M04');
    }
    if(/\bmotion\b|framer motion|motion for react/.test(q)){
      topicQueries.push('M05 Motion for React gestures scroll choreography layout shared elements reduced motion interaction visual acceptance');
      requiredIds.push('M05');
    }
    if(!topicQueries.length&&/anime|svg|timeline/.test(q))topicQueries.push('Anime.js v4 motion components SVG timelines');
    if(!topicQueries.length)topicQueries.push('M05 Motion React visual design interaction reduced motion');
    const requested=topicQueries.join(' ; ');
    const index=needs.findIndex(n=>n.id==='technology');
    const need={id:'technology',query:requested+' accessible reduced motion cleanup lifecycle performance visual QA '+stack,match:/motion|animation|three|gsap|visual design/i,broad:false,requiredIds:[...new Set(requiredIds)]};
    if(index>=0)needs[index]=need;else needs.push(need);
  }
  for(const need of needs)if(need.broad===undefined)need.broad=q.length>250;
  return needs.length?needs:[{id:'request',query,match:/$a/}];
}
export function diversify(candidates,needs){
  const remaining=[...candidates],ordered=[];
  // First reserve one matching reference per need, then fill by retrieval rank.
  const preferred={data:['react-persistence','static-persistence','DK03','DK02'],rules:['dates-local','money-cents','DK08','T05','inventory-stock'],technology:['studio-v1-s01','S01','react-events','DK01'],design:['professional-product-delivery','P10','studio-v1-s06','S06','P01']};
  for(const need of needs){let i=-1;for(const id of need.requiredIds||[]){i=remaining.findIndex(c=>c.id===id);if(i>=0){ordered.push({...remaining.splice(i,1)[0],selectedFor:need.id,selectionReason:'explicit-technology'});i=-1;}}for(const id of need.broad?(preferred[need.id]||[]):[]){i=remaining.findIndex(c=>c.id===id);if(i>=0)break;}if(i<0)i=remaining.findIndex(c=>need.match.test(c.title));if(i>=0)ordered.push({...remaining.splice(i,1)[0],selectedFor:need.id});}
  return [...ordered,...remaining];
}
export function coverageFor(chunks,needs){return needs.map(n=>({need:n.id,references:chunks.filter(c=>(c.selectedFor===n.id||n.match.test(c.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))).map(c=>c.id)}));}
