import fs from 'node:fs';
const mode=process.argv[2];
if(!['on','off'].includes(mode))throw Error('Use: node tools/toggle-app-spec.mjs on|off');
fs.writeFileSync(new URL('../settings/app-spec.json',import.meta.url),JSON.stringify({enabled:mode==='on',mode:'advisory'},null,2));
console.log('AppSpec advisory '+mode+'. Reload MVP. Existing records are preserved; in-flight work may retain its original context.');
