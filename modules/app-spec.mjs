import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

// Read on each use: the kill switch also works for resident workers.
export function appSpecEnabled(){
 try{return JSON.parse(readFileSync(new URL('../settings/app-spec.json',import.meta.url),'utf8')).enabled===true;}catch{return false;}
}
export function createAppSpec(plan){
 if(!Array.isArray(plan?.requirements)||!plan.requirements.length)return null;
 const ids=new Set();
 for(const r of plan.requirements){if(!r||typeof r.id!=='string'||!r.id.trim()||ids.has(r.id)||typeof r.requirement!=='string'||typeof r.acceptance!=='string'||!r.acceptance.trim())return null;ids.add(r.id);}
 const copy=structuredClone(plan);
 const revision=createHash('sha256').update(JSON.stringify(copy)).digest('hex');
 return {schemaVersion:1,revision,origin:'existing-model-plan',userConfirmed:false,plan:copy};
}
export const ACCEPTANCE_LINK_INSTRUCTION='Advisory traceability only: for a scenario that verifies one AppSpec acceptance criterion, copy that criterion verbatim into scenario.requirement. Do not invent requirements, add scenarios merely for coverage, change scenario limits, or claim execution. Partial scenarios must describe their actual scope instead of copying a broader criterion.';

export function requirementReport(spec,checks=[],mapping=null){
 if(!spec?.plan?.requirements)return null;
 const rows=spec.plan.requirements.map(r=>{
  // No fuzzy matching, ID substring matching, or trust in model-declared source coverage.
  const linked=checks.filter(c=>c.source==='model-proposed-scenario'&&c.requirement===r.acceptance);
  const functionalFailures=linked.filter(c=>c.category==='funcional'&&c.status==='failed');
  const passed=linked.filter(c=>c.status==='passed');
  const status=functionalFailures.length?'observed-failure':linked.length&&passed.length===linked.length?'scenario-passed':'not-verified';
  const declared=mapping?.requirements?.find(m=>m.id===r.id);
  return {id:r.id,requirement:r.requirement,acceptance:r.acceptance,status,implementationDeclared:declared?.declared===true,sourceFilesExist:declared?.sourceFilesExist===true,evidence:linked.map(c=>({check:c.check,status:c.status,category:c.category,expected:c.expected,evidence:c.evidence}))};
 });
 return {mode:'advisory',schemaVersion:1,specRevision:spec.revision,blocksPreview:false,automaticRepair:false,extraModelCalls:0,basis:'Criteria come from the existing AI plan, not independent confirmation of the original request. A matching scenario is evidence about that scenario only; it is not proof of full requirement coverage.',rows};
}
