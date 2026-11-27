// Bind a Chromium-model session to the installed engine version, in memory only.
// This improves version consistency; it does not turn Chromium into Google Chrome.
export function bindEngineVersion(profile,versionOutput) {
  const p=JSON.parse(JSON.stringify(profile));
  const match=/\b(?:Chromium|Google Chrome|Chrome)\s+(\d+\.\d+\.\d+\.\d+)\b/.exec(versionOutput);
  if(!match)throw new Error('Cannot verify installed Chromium version');
  if(p.browser?.family!=='chrome')throw new Error('Engine binding supports the reviewed Chrome-family model only');
  const full=match[1],major=full.split('.')[0];
  if(!/Chrome\/\d+(?:\.\d+)*/.test(p.navigator?.userAgent || ''))throw new Error('Expected Chrome UA token missing');
  const previous=p.navigator.userAgent;
  p.navigator.userAgent=previous.replace(/Chrome\/\d+(?:\.\d+)*/,`Chrome/${major}.0.0.0`);
  p.navigator.appVersion=p.navigator.userAgent.replace(/^Mozilla\//,'');
  p.browser.major=Number(major);p.browser.fullVersion=full;
  if(p.clientHints){
    p.clientHints.fullVersion=full;
    for(const [key,v] of [['brands',major],['fullVersionList',full]]){
      for(const b of p.clientHints[key] || []){
        if(b.brand==='Chromium' || b.brand==='Google Chrome')b.version=v;
      }
    }
  }
  return {profile:p,change:{previousUa:previous,currentUa:p.navigator.userAgent,installedVersion:full,
    scope:'Session-only Chromium version binding; no database changes or authenticity guarantee.'}};
}
