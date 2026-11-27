// Evidence evaluator only: no browser launch, profile mutation, or networking.
export const REQUIRED_GATES = Object.freeze([
  'exit-ip', 'secret-boundary', 'realm-parity', 'server-headers',
  'storage-isolation', 'storage-persistence', 'proxy-failure', 'webrtc',
  'capability-regression',
]);
const STATES = new Set(['PASS', 'FAIL', 'UNKNOWN', 'UNSUPPORTED']);
export function evaluateEvidence(evidence = {}) {
  const gates = REQUIRED_GATES.map(id => {
    const item = evidence?.[id];
    if (!item || !STATES.has(item.status)) return { id, status: 'UNKNOWN' };
    // A success needs a named measurement and a timestamp, not a UI score.
    if (item.status === 'PASS' && (
      typeof item.measurement !== 'string' || !item.measurement.trim() ||
      typeof item.observedAt !== 'string' || !Number.isFinite(Date.parse(item.observedAt))
    )) return { id, status: 'UNKNOWN' };
    return { id, status: item.status };
  });
  return {
    status: gates.some(g => g.status === 'FAIL') ? 'FAIL' :
      gates.every(g => g.status === 'PASS') ? 'PASS' : 'INCOMPLETE',
    scope: 'Recorded measurements only; not anonymity or undetectability certification.',
    gates,
  };
}
export function compareRealms(results, fields) {
  if (!Array.isArray(results) || results.length < 2 || !fields?.length) return 'UNKNOWN';
  if (results.some(r => r?.status !== 'OK' || !r.values)) return 'UNKNOWN';
  for (const field of fields) {
    if (results.some(r => !Object.hasOwn(r.values, field) || r.values[field] == null)) return 'UNKNOWN';
    const first = JSON.stringify(results[0].values[field]);
    if (results.some(r => JSON.stringify(r.values[field]) !== first)) return 'FAIL';
  }
  return 'PASS';
}
