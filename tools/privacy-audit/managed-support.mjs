import fs from 'node:fs';
import path from 'node:path';
export function profileSummary(p) {
  return {id:p.id,name:p.name,expectedIp:p.network?.proxy?.exitIp || null};
}
export function modelObservations(p,version) {
  const actual=/\b(\d+)\./.exec(version)?.[1];
  const claimed=/Chrome\/(\d+)/.exec(p.navigator?.userAgent || '')?.[1];
  return {
    engineVersion:version,claimedChromiumMajor:claimed || null,
    versionAgreement:actual && claimed ? (actual===claimed?'PASS':'FAIL'):'UNKNOWN',
    platformReview:p.navigator?.platform==='Linux armv81'?'REVIEW':'NOT_FLAGGED',
    note:'Model/engine disagreement is not proof of identity leakage; it is not silently repaired.',
  };
}
export function foreignBrowserCommands(commands,roots) {
  return commands.filter(args=>args.some(arg=>arg.startsWith('--user-data-dir=') &&
    roots.some(root=>{const p=arg.slice('--user-data-dir='.length);return p===root || p.startsWith(root+path.sep);}))).length;
}
export function countProjectBrowsers(roots) {
  if (!fs.existsSync('/proc')) throw new Error('Process inspection unavailable');
  const commands=[];
  for(const entry of fs.readdirSync('/proc')) {
    if(!/^\d+$/.test(entry))continue;
    try { commands.push(fs.readFileSync('/proc/'+entry+'/cmdline','utf8').split('\0')); }
    catch { /* process exited or belongs to another Android UID */ }
  }
  return foreignBrowserCommands(commands,roots);
}
export function exactProfile(profiles,id) {
  if(!/^prf_[A-Za-z0-9]+$/.test(id || ''))throw new Error('Exact --profile prf_... required');
  const found=profiles.filter(p=>p.id===id);
  if(found.length!==1)throw new Error('Exact profile ID not found or duplicated');
  return found[0];
}
export function acquireLock(directory) {
  fs.mkdirSync(path.dirname(directory),{recursive:true,mode:0o700});
  // A stale lock is deliberately not removed automatically: surviving Chromium
  // children or PID reuse require investigation, not a risky second launch.
  fs.mkdirSync(directory,{mode:0o700});
  fs.writeFileSync(path.join(directory,'owner.json'),JSON.stringify({pid:process.pid,at:new Date().toISOString()}),{mode:0o600,flag:'wx'});
  return ()=>{
    const owner=JSON.parse(fs.readFileSync(path.join(directory,'owner.json'),'utf8'));
    if(owner.pid!==process.pid)throw new Error('Lock owner changed; retained');
    fs.unlinkSync(path.join(directory,'owner.json'));
    fs.rmdirSync(directory);
  };
}
export function reportSummary(gates) {
  const states=Object.values(gates).map(g=>g.status);
  return states.includes('FAIL')?'FAIL':states.length && states.every(s=>s==='PASS')?'PASS':'INCOMPLETE';
}
