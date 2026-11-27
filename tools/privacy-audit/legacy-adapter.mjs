// Experimental wrapper: original files are never rewritten.
import { createHash } from 'node:crypto';
export const PHONE_RUNTIME_SHA256 = '708fa6ccbf6dbedfeabddd7450dc34ec5f7c9729be5cff0eeb0de241bfa4b392';
export const PHONE_LAUNCHER_SHA256 = 'd91527161896683a1a9d77866c146df95bb4099e76cd7f43dd20e7095d65385e';
export const sha256 = text => createHash('sha256').update(text).digest('hex');
export function prepareLegacySource(source) {
  if (sha256(source) !== PHONE_LAUNCHER_SHA256) throw new Error('Launcher hash mismatch; no launch attempted');
  const start = source.indexOf('  const slim = {');
  const end = source.indexOf('\n\n  const extraHTTPHeaders', start);
  if (start < 0 || end < 0) throw new Error('Payload boundary not found');
  let out = source.slice(0, start) + '  const slim = buildRuntimeData(P);' + source.slice(end);
  const selection = "profiles.find((x) => x.id === WANT_PROFILE_ID || (x.name || '').toLowerCase().includes(WANT_PROFILE_ID.toLowerCase()))";
  if (!out.includes(selection)) throw new Error('Selection boundary not found');
  out = out.replace(selection, 'profiles.find((x) => x.id === WANT_PROFILE_ID)');
  const relayLog = out.split('\n').find(line => line.includes("console.log('Relay   :'"));
  if (!relayLog) throw new Error('Relay logging boundary not found');
  out = out.replace(relayLog, "  console.log('Relay   :', relayOn ? 'ACTIVE [upstream hidden]' : 'INACTIVE');");
  const checkMarker = '  const surface = await page.evaluate(async () => {';
  const check = `  const boundary = await page.evaluate(() => {
    const data = window.__DOPPEL_PROFILE__;
    return {profilePresent: !!data, personaPresent: !!data && Object.hasOwn(data, 'persona'),
      upstreamProxyPresent: !!data?.network && Object.hasOwn(data.network, 'proxy')};
  });
  console.log('SECRET BOUNDARY:', JSON.stringify(boundary));
  if (!boundary.profilePresent || boundary.personaPresent || boundary.upstreamProxyPresent) {
    await context.close();
    throw new Error('Secret boundary failed; browser closed');
  }
`;
  if (!out.includes(checkMarker)) throw new Error('Audit boundary not found');
  out = out.replace(checkMarker, check + checkMarker);
  out = out.replace('PASS: Active profile & Exit IP verified in Termux Chromium!',
    'SCOPED PASS: exit IP, selected surfaces and credential projection only; full audit incomplete.');
  return out.replace(/^#![^\r\n]*(?:\r?\n|$)/, '');
}
