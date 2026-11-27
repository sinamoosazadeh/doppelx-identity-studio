// Measurement only: no browser API patches or credential values in reports.
import { compareRealms } from './gates.mjs';
export const PARITY_FIELDS = ['ua', 'platform', 'language', 'languages', 'hints'];
export async function collectRealms() {
  async function snapshot(n) {
    const result = {ua:n.userAgent, platform:n.platform, language:n.language,
      languages:Array.from(n.languages || [])};
    try {
      result.hints = n.userAgentData ? await n.userAgentData.getHighEntropyValues([
        'fullVersionList','uaFullVersion','platformVersion','architecture',
        'bitness','model','formFactors',
      ]) : null;
    } catch (e) { result.hints = null; result.hintsError = e.name; }
    const p = globalThis.__DOPPEL_PROFILE__;
    result.boundary = {
      profilePresent: !!p,
      personaPresent: !!p && Object.hasOwn(p, 'persona'),
      upstreamProxyPresent: !!p?.network && Object.hasOwn(p.network, 'proxy'),
    };
    return result;
  }
  const report = {main:{status:'OK', values:await snapshot(navigator)}};
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  try {
    // Snapshot is evaluated by the parent here: only navigator reads are iframe
    // measurements; globals are not claimed to be measured in that frame.
    report.blankIframe = {status:'OK', values:await snapshot(frame.contentWindow.navigator)};
    const p = frame.contentWindow.__DOPPEL_PROFILE__;
    report.blankIframe.values.boundary = {
      profilePresent:!!p, personaPresent:!!p && Object.hasOwn(p,'persona'),
      upstreamProxyPresent:!!p?.network && Object.hasOwn(p.network,'proxy'),
    };
  } catch (e) { report.blankIframe={status:'ERROR', error:e.name}; }
  finally { frame.remove(); }
  for (const type of ['classic','module']) {
    report[type+'BlobWorker'] = await new Promise(resolve => {
      let worker, url, timer, finished=false;
      const finish = value => {
        if (finished) return;
        finished=true;
        clearTimeout(timer);
        if (worker) worker.terminate();
        if (url) URL.revokeObjectURL(url);
        resolve(value);
      };
      try {
        if (typeof Worker !== 'function') return finish({status:'UNSUPPORTED'});
        const code='('+snapshot.toString()+')(navigator).then(values=>postMessage({status:"OK",values})).catch(e=>postMessage({status:"ERROR",error:e.name}))';
        url=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
        timer=setTimeout(()=>finish({status:'TIMEOUT'}),8000);
        worker=new Worker(url,{type});
        worker.onmessage=e=>finish(e.data);
        worker.onerror=()=>finish({status:'ERROR'});
      } catch(e) { finish({status:'ERROR',error:e.name}); }
    });
  }
  return report;
}
export function assessRealms(report) {
  const names=['main','blankIframe','classicBlobWorker','moduleBlobWorker'];
  const results=names.map(name=>report?.[name]);
  const exposed=results.some(r=>r?.values?.boundary?.personaPresent || r?.values?.boundary?.upstreamProxyPresent);
  const completed=results.every(r=>r?.status==='OK' && r.values?.boundary);
  return {
    parity:compareRealms(results, PARITY_FIELDS),
    credentialObjects:exposed?'FAIL':completed?'PASS':'UNKNOWN',
    scope:'Selected navigator fields and named credential objects in four tested realms only.',
    notTested:['cross-origin iframe','SharedWorker','Service Worker','server headers','storage isolation','network leak prevention'],
  };
}
export async function runRealmAudit(page) {
  const report = await page.evaluate(collectRealms);
  console.log('REALM AUDIT:',JSON.stringify(report,null,2));
  const result = assessRealms(report);
  console.log('REALM GATES:',JSON.stringify(result,null,2));
  return result;
}
