fetch('/__devkiller/media/credits').then(r=>r.json()).then(manifest=>{
 const box=document.createElement('details');box.style.cssText='position:fixed;bottom:8px;right:8px;z-index:10000;max-width:300px;max-height:40vh;overflow:auto;background:#111e;color:white;padding:8px 12px;border-radius:8px;font:11px/1.5 system-ui';const label=document.createElement('summary');label.textContent='Photo credits · demo imagery';box.append(label);
 // Keep every candidate credited: route changes and delayed React rendering may reveal it later.
 if(!manifest.assets?.length)return;
 for(const a of manifest.assets){const p=document.createElement('p'),link=document.createElement('a');p.textContent=a.artist+' · '+a.license+' · ';link.href=a.source;link.textContent='Source';link.style.color='#b8dcff';p.append(link);box.append(p);}document.body.append(box);
}).catch(()=>{});
