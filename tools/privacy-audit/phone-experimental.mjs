#!/usr/bin/env node
// Runs only on explicit invocation. No harvesting, installation, or file patches.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildRuntimeData } from './runtime-boundary.mjs';
import { runRealmAudit } from './realm-audit.mjs';
import { prepareModuleOrder } from './module-order.mjs';
import { runHeaderAudit } from './header-audit.mjs';
import { prepareLegacySource, sha256, PHONE_RUNTIME_SHA256 } from './legacy-adapter.mjs';

const args = process.argv.slice(2);
const index = args.indexOf('--profile');
if (index < 0 || !/^prf_[a-zA-Z0-9]+$/.test(args[index + 1] || '')) {
  throw new Error('An exact --profile prf_... ID is required');
}
if (args.includes('--allow-direct')) throw new Error('Direct fallback is not allowed in this experiment');
// Disallow environment-based redirection to an unreviewed runtime/hub/session.
for (const name of ['DX_ROOT','RUNNER_DIR','PW_CORE','DOPPELX_HUB','SESS_ROOT']) {
  if (process.env[name]) throw new Error(`Unset ${name} before this controlled experiment`);
}
const home = os.homedir();
const runtime = path.join(home, 'DOPPEL-X/02-android/app/assets/js/spoof.js');
const launcher = path.join(home, 'dx-runner/launch_active.js');
if (sha256(fs.readFileSync(runtime)) !== PHONE_RUNTIME_SHA256) {
  throw new Error('Phone runtime hash mismatch; nothing launched');
}
// Validate transformation before any browser is launched.
prepareModuleOrder(fs.readFileSync(runtime, 'utf8'));
const auditMarker = '  const surface = await page.evaluate(async () => {';
const runtimeRead = "const spoofSrc = fs.readFileSync(spoofPath, 'utf8');";
const prepared = prepareLegacySource(fs.readFileSync(launcher, 'utf8'));
if (prepared.split(runtimeRead).length !== 2) throw new Error('Runtime read boundary mismatch');
const executable = prepared
  .replace(runtimeRead, "const spoofSrc = prepareModuleOrder(fs.readFileSync(spoofPath, 'utf8'));")
  .replace(auditMarker, `  const realmGate = await runRealmAudit(page);
  if (realmGate.parity !== 'PASS' || realmGate.credentialObjects !== 'PASS') {
    await context.close();
    throw new Error('Realm audit failed or incomplete; see REALM GATES');
  }
  if (process.argv.includes('--headers')) {
    const headerGate = await runHeaderAudit(page);
    if (headerGate.status !== 'PASS') {
      await context.close();
      throw new Error('Header measurement failed or incomplete; see SERVER HEADER AUDIT');
    }
  }
` + auditMarker);
// Never use or copy the established session directories. This separate persistent
// root starts with empty browser storage; repeated experimental runs retain theirs.
process.env.SESS_ROOT = path.join(home, 'dx-experimental-sessions');
console.log('EXPERIMENTAL: separate browser storage; original files are unchanged.');
console.log('Credential projection + module initialization order; globals and model defects remain.');
const require = createRequire(launcher);
new Function('require', 'buildRuntimeData', 'runRealmAudit', 'prepareModuleOrder', 'runHeaderAudit', executable)(
  require, buildRuntimeData, runRealmAudit, prepareModuleOrder, runHeaderAudit,
);
