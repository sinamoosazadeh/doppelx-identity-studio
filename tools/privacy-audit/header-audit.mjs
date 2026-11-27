// Third-party HTTPS echo measurement. Never logs raw response/headers.
import { randomUUID } from 'node:crypto';
const SELECTED = ['user-agent','accept-language','sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform',
  'sec-ch-ua-full-version-list','sec-ch-ua-platform-version','sec-ch-ua-arch','sec-ch-ua-model'];
export function selectHeaders(headers) {
  const out = {};
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return out;
  for (const [key,value] of Object.entries(headers)) {
    const name=key.toLowerCase();
    if (SELECTED.includes(name) && typeof value==='string' && value.length<4096) out[name]=value;
  }
  return out;
}
function brandsFromHeader(value) {
  if (typeof value!=='string') return null;
  const items=value.split(',').map(x=>x.trim());
  const parsed=[];
  for (const item of items) {
    const match=/^"([^"\\]*)";\s*v="([0-9.]+)"$/.exec(item);
    if (!match) return null;
    parsed.push({brand:match[1],version:match[2]});
  }
  return parsed;
}
export function assessHeaders(headers, js) {
  const h=selectHeaders(headers);
  const checks=[];
  const compare=(id,actual,expected)=>checks.push({id,status:
    actual==null || expected==null?'UNKNOWN':actual===expected?'PASS':'FAIL'});
  compare('user-agent',h['user-agent'],js?.ua);
  compare('language-list',h['accept-language']?.split(',').map(s=>s.trim().split(';')[0]).join(','),js?.languages?.join(','));
  compare('ch-mobile',h['sec-ch-ua-mobile'],js?.hints ? (js.hints.mobile?'?1':'?0'):null);
  compare('ch-platform',h['sec-ch-ua-platform'],js?.hints?.platform ? JSON.stringify(js.hints.platform):null);
  const parsed=brandsFromHeader(h['sec-ch-ua']);
  // Brands compared as multisets, not sorted-away duplicates or header order.
  const canonical=list=>list.map(b=>JSON.stringify([b.brand,b.version])).sort().join('|');
  compare('ch-brands',parsed?canonical(parsed):null,
    Array.isArray(js?.hints?.brands)?canonical(js.hints.brands):null);
  return {
    status:checks.some(c=>c.status==='FAIL')?'FAIL':checks.every(c=>c.status==='PASS')?'PASS':'UNKNOWN',
    checks,
    scope:'Strict selected-header equality policy; a mismatch is not proof of identity leakage. Reduced Accept-Language can be legitimate. Not TLS or high-entropy verification.',
  };
}
export async function runHeaderAudit(page) {
  const url='https://httpbin.org/anything/doppelx-audit?nonce='+randomUUID();
  // Avoid sending site cookies or HTTP authorization in the diagnostic request.
  // User-Agent and Client Hints are deliberately NOT rewritten by this probe.
  let beforeRouteHeaders = null;
  const handler=async route=>{
    const headers={...route.request().headers()};
    beforeRouteHeaders = selectHeaders(headers);
    for (const key of Object.keys(headers)) {
      if (['cookie','authorization','proxy-authorization'].includes(key.toLowerCase())) delete headers[key];
    }
    await route.continue({headers});
  };
  await page.route(url,handler);
  let report;
  try {
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    if (!response || response.status()!==200 || new URL(response.url()).origin!=='https://httpbin.org') {
      throw new Error('Unexpected echo response');
    }
    const echo=await response.json();
    if (echo.url!==url || !echo.headers || typeof echo.headers!=='object') throw new Error('Unverified echo freshness');
    const js=await page.evaluate(()=>({ua:navigator.userAgent,languages:Array.from(navigator.languages),
      hints:navigator.userAgentData ? navigator.userAgentData.toJSON():null}));
    const headers=selectHeaders(echo.headers);
    let playwrightRequestHeaders = null;
    try {
      playwrightRequestHeaders = selectHeaders(await response.request().allHeaders());
    } catch { /* Optional observation; absence is not success evidence. */ }
    report={observedAt:new Date().toISOString(),endpoint:'https://httpbin.org',
      beforeRouteHeaders,playwrightRequestHeaders,receivedHeaders:headers,js,
      observationNote:'Playwright header observations are not packet captures. Routing/intermediaries may influence the request.',
      result:assessHeaders(headers,js)};
  } catch (error) {
    report={observedAt:new Date().toISOString(),endpoint:'https://httpbin.org',
      result:{status:'UNKNOWN',reason:'Echo measurement unavailable or unexpected response',errorType:error.name}};
  } finally {
    await page.unroute(url,handler);
  }
  console.log('SERVER HEADER AUDIT:',JSON.stringify(report,null,2));
  const {result,...observations}=report;
  return {...result,observations};
}
