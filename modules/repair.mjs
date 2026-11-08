import {createHash} from 'node:crypto';
export function filesHash(files){return createHash('sha256').update(JSON.stringify([...files].sort((a,b)=>a.name.localeCompare(b.name)))).digest('hex');}
// Model-authored assertions are observations, not independently confirmed defects.
// Legacy acceptance results must follow the same rule, even without source metadata.
export function confirmedRepairIssues(checks,files){
  const hash=files?filesHash(files):null;
  return checks.filter(q=>q.category==='funcional'&&q.status==='failed'
    &&q.source!=='model-proposed-scenario'&&!q.check?.startsWith('acceptance-')
    &&(!hash||!q.artifactHash||q.artifactHash===hash));
}
export function reserveRepairAttempt(projects,projectId,files,diagnostics,jobId){
  const issues=confirmedRepairIssues(diagnostics,files);
  if(!issues.length)throw new Error('There is no confirmed functional issue. The test needs review before a paid repair.');
  // Reserve before any retrieval/provider work. A crash cannot silently release it.
  const fingerprint=createHash('sha256').update(JSON.stringify({artifact:filesHash(files),checks:issues.map(q=>q.check).sort()})).digest('hex');
  return projects.use(projectId,db=>{
    db.exec('CREATE TABLE IF NOT EXISTS repair_attempt_guards(fingerprint TEXT PRIMARY KEY, job_id TEXT NOT NULL, created INTEGER NOT NULL)');
    const inserted=db.prepare('INSERT OR IGNORE INTO repair_attempt_guards VALUES (?,?,?)').run(fingerprint,jobId,Date.now());
    if(!inserted.changes)throw new Error('A repair for this version and these issues has already been reserved. Review its result before spending again. Your preview was preserved.');
    return fingerprint;
  });
}
export function compareRepair(before,after,beforeFiles,afterFiles){
  const errors=checks=>checks.filter(q=>q.category==='funcional'&&q.status==='failed');
  const previous=errors(before),remaining=errors(after);
  return {changed:filesHash(beforeFiles)!==filesHash(afterFiles),beforeErrors:previous.length,afterErrors:remaining.length,resolved:previous.filter(old=>!remaining.some(next=>next.check===old.check&&next.observed===old.observed)).map(q=>q.observed||q.requirement),accepted:remaining.length===0&&!after.some(q=>q.category==='ambiente'&&['failed','pending'].includes(q.status))&&before.filter(q=>q.check?.startsWith('acceptance-')).every(old=>after.some(q=>q.check===old.check&&q.status==='passed'))};
}
