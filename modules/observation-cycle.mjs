import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const CYCLE_INSTRUCTIONS = `Work as an evidence-driven product builder. Understand the audience and primary job, choose a composition, implement a complete journey, observe the rendered result, judge gaps, choose the next useful intervention, then verify it. A plan, a model claim and a passing build are not proof of product quality. Distinguish observed behavior from source-based risks and untested assumptions. Prioritize the primary workflow, information hierarchy, domain-specific identity, responsive composition and useful interaction over decorative effects. Reconsider a weak composition instead of merely patching its spacing. Preserve working behavior and saved data. Report what remains unverified. Never claim parity with another agent or guaranteed aesthetic quality.`;

export function identifiedFindings(review){
 return (review?.review?.findings||[]).map(f=>({...f,id:'F-'+createHash('sha256').update(JSON.stringify([f.category,f.evidence,f.action])).digest('hex').slice(0,12)}));
}

export function chooseIntervention(review){
 const findings=identifiedFindings(review);
 const targets=findings.filter(f=>['visual','improvement'].includes(f.category)&&f.evidence?.trim()&&f.action?.trim());
 const pending=findings.filter(f=>!targets.some(t=>t.id===f.id));
 return {version:1,action:review?.status!=='completed'?'needs-evidence':targets.length?'refine-presentation':pending.length?'investigate-behavior':'deliver-for-human-review',
  reason:review?.status!=='completed'?'Observation did not finish; do not guess a repair.':targets.length?'Improve the observed presentation gaps, then compare before and after.':pending.length?'Source-based functional risks need targeted behavior evidence before a repair.':'No actionable gap was found in the sampled evidence; this is not exhaustive verification.',
  targets,pending,observation:review?.review?.assessment||null};
}

// Only Engine-created captures from a trusted review folder can enter a model request.
export async function observationImages(folder,review,label='Observed app'){
 if(!review?.captures?.length)throw Error('No rendered evidence available; preserve the current preview.');
 const content=[];
 for(const capture of review?.captures||[]){
  if(!/^(?:\d+-(?:desktop|mobile)|motion-(?:reduce|no-preference)|interaction-\d+)\.png$/.test(capture.file))throw Error('Invalid observation capture path.');
  const bytes=await fs.readFile(path.join(folder,capture.file));
  content.push({type:'input_text',text:label+': '+capture.label},{type:'input_image',image_url:'data:image/png;base64,'+bytes.toString('base64'),detail:'high'});
 }
 return content;
}

export function verifiedProgress(targets,review){
 const progress=review?.review?.progress;
 if(!targets?.length||!progress||progress.regression!==false||!Array.isArray(progress.outcomes))return false;
 const outcomes=progress.outcomes;
 if(outcomes.length!==targets.length||new Set(outcomes.map(o=>o.id)).size!==targets.length)return false;
 return targets.every(t=>outcomes.some(o=>o.id===t.id&&o.status==='resolved'&&typeof o.evidence==='string'&&o.evidence.trim().length>0));
}
