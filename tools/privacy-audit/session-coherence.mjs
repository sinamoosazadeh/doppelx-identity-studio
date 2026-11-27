// In-memory repair of duplicated model entries; no change to engine/UA version.
export function prepareSessionProfile(profile) {
  const copy=JSON.parse(JSON.stringify(profile));
  if (!copy.clientHints) return copy;
  for (const key of ['brands','fullVersionList']) {
    const list=copy.clientHints[key];
    if (list==null) continue;
    if (!Array.isArray(list)) throw new TypeError('Invalid client hint brand list');
    const seen=new Map();
    copy.clientHints[key]=list.filter(entry=>{
      if (!entry || typeof entry.brand!=='string' || typeof entry.version!=='string') throw new TypeError('Invalid client hint brand entry');
      if (seen.has(entry.brand)) {
        if (seen.get(entry.brand)!==entry.version) throw new Error('Conflicting versions for one client hint brand');
        return false;
      }
      seen.set(entry.brand,entry.version);
      return true;
    });
  }
  return copy;
}
export function buildSessionHeaders(profile) {
  const headers={'Accept-Language':profile.locale?.languages?.join(',') || 'en-US,en;q=0.9'};
  const hints=profile.clientHints;
  if (hints && Array.isArray(hints.brands) && hints.brands.length>=2) {
    headers['Sec-CH-UA']=hints.brands.map(b=>JSON.stringify(b.brand)+';v='+JSON.stringify(b.version)).join(', ');
    headers['Sec-CH-UA-Mobile']=hints.mobile?'?1':'?0';
    headers['Sec-CH-UA-Platform']=JSON.stringify(hints.platform);
  }
  for (const value of Object.values(headers)) {
    if (typeof value!=='string' || /[\r\n]/.test(value)) throw new TypeError('Invalid outgoing header value');
  }
  return headers;
}
export function addSessionCoherence(source) {
  const selection='  const P = WANT_PROFILE_ID';
  const selected="  if (!P) throw new Error('Requested profile not found: ' + WANT_PROFILE_ID);";
  const begin=source.indexOf('  const extraHTTPHeaders = {');
  const end=source.indexOf("\n\n  console.log('=== DOPPEL X Active Session Runner ===');",begin);
  if (source.split(selection).length!==2 || source.split(selected).length!==2 || begin<0 || end<0) {
    throw new Error('Unexpected session settings boundary');
  }
  let out=source.slice(0,begin)+'  const extraHTTPHeaders = buildSessionHeaders(P);'+source.slice(end);
  out=out.replace(selection,'  let P = WANT_PROFILE_ID');
  return out.replace(selected, selected+'\n  P = prepareSessionProfile(P);');
}
