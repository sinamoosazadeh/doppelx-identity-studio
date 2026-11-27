#!/usr/bin/env node
// Integrated, additive runner. No hub/proxy mutations or runtime source rewrites.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {buildRuntimeData} from './runtime-boundary.mjs';
import {prepareModuleOrder} from './module-order.mjs';
import {prepareSessionProfile,buildSessionHeaders} from './session-coherence.mjs';
import {runRealmAudit} from './realm-audit.mjs';
import {runHeaderAudit} from './header-audit.mjs';
import {runStorageAudit} from './storage-audit.mjs';
import {observeSurfaces} from './surface-audit.mjs';
import {bindEngineVersion} from './engine-binding.mjs';
import {acquireLock,countProjectBrowsers,exactProfile,modelObservations,profileSummary,reportSummary} from './managed-support.mjs';
const home=os.homedir();
const argv=process.argv.slice(2);
const value=flag=>{const n=argv.indexOf(flag);return n<0?'':argv[n+1] || '';};
const open=argv.includes('--open') || argv.includes('--keep');
const root=path.join(home,'dx-experimental-sessions');
const state=path.join(home,'dx-managed');
const reportDir=path.join(state,'reports');
let context,release,stopping=false,closing,retainLock=false;
let stopResolve;
const stopped=new Promise(resolve=>{stopResolve=resolve;});
async function closeContext(){
  if(closing)return closing;
  if(!context)return;
  const c=context;
  closing=c.close().then(()=>{if(context===c)context=null;}).finally(()=>{closing=null;});
  return closing;
}
async function stop(){stopping=true;stopResolve();try{await closeContext();}catch{/* finally records incomplete cleanup */}}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
const get=async route=>{
  const response=await fetch('http://127.0.0.1:8787'+route,{signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!response.ok)throw new Error('Hub request failed');
  return response.json();
};
function blankReport(p){return {schema:1,profile:profileSummary(p),startedAt:new Date().toISOString(),
  gates:Object.fromEntries(['exit-ip','credential-objects','realm-parity','headers-strict','storage-scratch','model-version',
    'proxy-failure','webrtc-comprehensive','capability-regression','existing-profile-isolation'].map(id=>[id,{status:'UNKNOWN'}])),
  scope:'Recorded checks only, not anonymity or undetectability certification.'};}
function save(report){
  report.finishedAt=new Date().toISOString();report.status=reportSummary(report.gates);
  fs.mkdirSync(reportDir,{recursive:true,mode:0o700});
  const name=report.profile.id+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
  fs.writeFileSync(path.join(reportDir,name),JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});
  if(report.status!=='PASS' || report.error)process.exitCode=1;
  console.log('PROFILE RESULT:',report.status,'REPORT:',path.join(reportDir,name));
}
async function runProfile(chromium,p,health,runtime){
  const report=blankReport(p);report.stage='preflight';let launchUnconfirmed=false;
  try {
    if(!health.relay?.running)throw new Error('Relay is not running');
    if(health.scheduler?.running)throw new Error('Stop the scheduler before a controlled profile test');
    if(!p.network?.proxy?.exitIp)throw new Error('Profile has no expected exit IP');
    const binary=process.env.CHROMIUM_BIN || ['chromium-browser','chromium'].map(n=>path.join(process.env.PREFIX || '/data/data/com.termux/files/usr','bin',n)).find(f=>fs.existsSync(f));
    if(!binary)throw new Error('Chromium executable unavailable');
    const bound=bindEngineVersion(prepareSessionProfile(p),execFileSync(binary,['--version'],{encoding:'utf8',timeout:10000}));
    const P=bound.profile;report.sessionChanges=bound.change;
    const slim=buildRuntimeData(P);
    const payload='window.__DOPPEL_PROFILE__='+JSON.stringify(slim)+';\n'+runtime;
    const options={executablePath:binary,headless:process.env.HEADED==='0'?true:!open,
      userAgent:P.navigator.userAgent,locale:P.locale.locale,timezoneId:P.geo.tz,
      viewport:{width:P.display.innerWidth,height:P.display.innerHeight},deviceScaleFactor:P.display.dpr,
      isMobile:!!P.clientHints?.mobile,hasTouch:(P.navigator.maxTouchPoints || 0)>0,
      colorScheme:P.display.prefersColorScheme || 'dark',extraHTTPHeaders:buildSessionHeaders(P),
      ignoreDefaultArgs:['--enable-automation'],args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled','--force-webrtc-ip-handling-policy=disable_non_proxied_udp','--proxy-bypass-list=<-loopback>'],
      proxy:{server:'http://127.0.0.1:'+Number(health.relay.listenPort || 18080)}};
    if(stopping)throw new Error('Stop requested');
    report.stage='browser-launch';
    launchUnconfirmed=true;
    context=await chromium.launchPersistentContext(path.join(root,P.id),options);
    launchUnconfirmed=false;
    if(stopping)throw new Error('Stop requested');
    context.on('close',()=>stopResolve());
    await context.addInitScript(payload);
    report.model=modelObservations(P,context.browser()?.version() || 'unknown');
    report.gates['model-version']={status:report.model.versionAgreement};
    const page=context.pages()[0] || await context.newPage();
    report.stage='exit-ip';
    await page.goto('https://www.cloudflare.com/cdn-cgi/trace',{waitUntil:'domcontentloaded',timeout:45000});
    const trace=Object.fromEntries((await page.textContent('body')).trim().split('\n').filter(l=>l.includes('=')).map(l=>l.split('=')));
    report.observedExit=trace.ip;
    report.gates['exit-ip']={status:trace.ip===P.network.proxy.exitIp?'PASS':'FAIL'};
    if(report.gates['exit-ip'].status!=='PASS')throw new Error('Exit IP mismatch; no target navigation');
    report.stage='realm-audit';
    const realms=await runRealmAudit(page);
    report.gates['credential-objects']={status:realms.credentialObjects};
    report.gates['realm-parity']={status:realms.parity};
    report.realmObservations=realms.observations;
    report.surfaces=await page.evaluate(observeSurfaces);
    console.log('SURFACES:',JSON.stringify(report.surfaces,null,2));
    if(realms.credentialObjects!=='PASS')throw new Error('Credential-object boundary not confirmed');
    // Independent failures remain in the report; they do not suppress other tests.
    report.stage='server-headers';
    report.gates['headers-strict']=await runHeaderAudit(page);
    if(open){
      report.stage='headed-session';
      const target=value('--url') || 'https://www.cloudflare.com/cdn-cgi/trace';
      if(new URL(target).protocol!=='https:')throw new Error('Only HTTPS target URLs allowed');
      await page.goto(target,{waitUntil:'domcontentloaded',timeout:45000});
      console.log('OPEN: close Chromium using its Exit menu or press Ctrl+C here for managed cleanup.');
      console.log('WARNING: model/header failures are not cleared; this is still a testing session.');
      const keepAlive=setInterval(()=>{},1000);
      try {await stopped;} finally {clearInterval(keepAlive);}
    }
    await closeContext();
    if(!stopping && !open){
      report.stage='storage-scratch';
      report.gates['storage-scratch']=await runStorageAudit(chromium,options,payload);
    }
  } catch(error){
    report.error={type:error.name,stage:report.stage,message:'Run stopped; credentials and raw error details suppressed.'};
    console.error('RUN STOPPED at',report.stage,':',error.name,'(details redacted)');
  } finally {
    try {await closeContext();report.cleanup=launchUnconfirmed?'UNCONFIRMED':'CLOSED';
      if(launchUnconfirmed){retainLock=true;stopping=true;}}
    catch {report.cleanup='UNCONFIRMED';stopping=true;}
    save(report);
  }
}
async function main(){
  if(argv.includes('--export-reports')){
    const downloads=path.join(home,'storage/downloads');
    if(!fs.existsSync(downloads))throw new Error('Downloads access unavailable');
    const target=path.join(downloads,'doppelx-audit-results-'+Date.now()+'.zip');
    const program="from pathlib import Path; import sys,zipfile; root=Path(sys.argv[1]); files=sorted(root.glob('*.json')); assert files, 'No reports available'; z=zipfile.ZipFile(sys.argv[2],'x',zipfile.ZIP_DEFLATED); [z.write(p,p.name) for p in files]; z.close()";
    execFileSync('python',[ '-c',program,reportDir,target],{stdio:'pipe',timeout:10000});
    console.log('REPORT EXPORT:',target,'Review before sharing; contains IP and browser diagnostic metadata.');
    return;
  }
  for(const key of ['DX_ROOT','RUNNER_DIR','PW_CORE','DOPPELX_HUB','SESS_ROOT']){
    if(process.env[key])throw new Error('Unset '+key+' for this controlled runner');
  }
  const data=await get('/api/vault/profiles');
  if(!Array.isArray(data.profiles))throw new Error('Unexpected profiles response');
  if(argv.includes('--list')){console.log(JSON.stringify(data.profiles.map(profileSummary),null,2));return;}
  if(argv.includes('--all') && value('--profile'))throw new Error('Choose --all or --profile, not both');
  if(open && argv.includes('--all'))throw new Error('--all and --open cannot be combined');
  const profiles=argv.includes('--all')?data.profiles:[exactProfile(data.profiles,value('--profile'))];
  if(!profiles.length)throw new Error('No saved profiles');
  if(countProjectBrowsers([root,path.join(home,'dx-sessions')])>0)throw new Error('A project browser is already running; close it normally first');
  release=acquireLock(path.join(state,'runner.lock'));
  const runtime=prepareModuleOrder(fs.readFileSync(path.join(home,'DOPPEL-X/02-android/app/assets/js/spoof.js'),'utf8'));
  if(process.platform==='android'){
    Object.defineProperty(process,'platform',{value:'linux',configurable:true});os.platform=()=> 'linux';
  }
  const require=createRequire(path.join(home,'dx-runner/launch_active.js'));
  const {chromium}=require(path.join(home,'dx-runner/node_modules/playwright-core'));
  for(const p of profiles){if(stopping)break;await runProfile(chromium,p,await get('/api/health'),runtime);}
}
try {await main();}
catch(error){console.error('STOP:',error.message?.startsWith('A project browser') || error.message?.startsWith('Exact ') || error.message?.startsWith('Unset ')?error.message:error.code==='EEXIST'?'Managed lock exists; no second browser started.':'Preflight failed; no credentials printed.');process.exitCode=1;}
finally {
  try {await closeContext();}catch{stopping=true;}
  // Retain lock if a profile's browser cleanup could not be confirmed.
  if(release && !context && !retainLock){try{release();}catch{console.error('Lock retained; cleanup needs review.');}}
  process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
}
