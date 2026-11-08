(() => {
  const query=new URL(document.currentScript.src).searchParams;
  const nonce=query.get('nonce'),parentOrigin=query.get('parent'),revision=Number(query.get('revision'));
  if(window.parent===window||!nonce||!/^http:\/\/127\.0\.0\.1:\d+$/.test(parentOrigin))return;
  let enabled=false,selected=null;
  const overlay=document.createElement('div');
  overlay.dataset.dkOverlay='true';overlay.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #ffbe42;background:rgba(255,190,66,.10);border-radius:3px;display:none;box-sizing:border-box';
  document.documentElement.append(overlay);
  function box(el){if(!el||!el.isConnected){overlay.style.display='none';return;}const r=el.getBoundingClientRect();Object.assign(overlay.style,{display:'block',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});}
  function path(el){const parts=[];while(el&&el!==document.documentElement){if(el.id){const id='#'+CSS.escape(el.id);if(document.querySelectorAll(id).length===1){parts.unshift(id);break;}}const tag=el.localName;const siblings=[...el.parentElement.children].filter(x=>x.localName===tag);parts.unshift(tag+':nth-of-type('+(siblings.indexOf(el)+1)+')');el=el.parentElement;}return parts.join(' > ');}
  const send=data=>parent.postMessage({channel:'dk-visual',nonce,revision,...data},parentOrigin);
  window.addEventListener('message',event=>{if(event.source!==parent||event.origin!==parentOrigin||event.data?.channel!=='dk-visual'||event.data?.nonce!==nonce)return;if(event.data.action==='enable'){enabled=event.data.enabled===true;selected=null;overlay.style.display='none';send({type:'mode',enabled});}});
  document.addEventListener('pointermove',e=>{if(enabled)box(e.target);},true);
  document.addEventListener('click',e=>{if(!enabled)return;e.preventDefault();e.stopImmediatePropagation();const el=e.target;if(!(el instanceof Element)||el===overlay)return;selected=el;box(el);const selector=path(el);if(selector.length>2000)return;send({type:'selected',selection:{revision,selector,tag:el.localName,text:(el.matches('input,textarea,select')?el.getAttribute('aria-label')||el.getAttribute('placeholder')||'':el.innerText||el.getAttribute('aria-label')||el.getAttribute('alt')||'').trim().slice(0,1200),route:(location.pathname+location.hash).slice(0,1000)}});enabled=false;},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){enabled=false;selected=null;overlay.style.display='none';send({type:'cleared'});}},true);
  addEventListener('scroll',()=>box(selected),true);addEventListener('resize',()=>box(selected));
  send({type:'ready'});
})();
