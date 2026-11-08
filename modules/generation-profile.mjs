import fs from 'node:fs/promises';
import path from 'node:path';
export const ULTIMATE=Object.freeze({id:'ultimate',outputTokens:null,timeoutMs:1800000,reasoning:'high',maxCodeCalls:null,maxContinuations:null,imageModel:'gpt-image-2.5-flare',imageCount:3});
export function generationProfile(id='standard'){
 if(!['standard','efficient','ultimate'].includes(id))throw Error('Unknown generation profile.');
 return id==='ultimate'?ULTIMATE:id==='efficient'?{id:'efficient',reasoning:'medium',outputTokens:null,planningTokens:null,reviewTokens:null}:{id:'standard'};
}
export async function loadGenerationProfile(directory){try{return generationProfile(JSON.parse(await fs.readFile(path.join(directory,'generation-profile.json'),'utf8')).profile);}catch(e){if(e.code==='ENOENT')return generationProfile();throw e;}}
