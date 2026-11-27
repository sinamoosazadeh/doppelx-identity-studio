#!/usr/bin/env node
// Runs only on explicit invocation. No harvesting, installation, or file patches.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildRuntimeData } from './runtime-boundary.mjs';
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
const executable = prepareLegacySource(fs.readFileSync(launcher, 'utf8'));
// Never use or copy the established session directories. This separate persistent
// root starts with empty browser storage; repeated experimental runs retain theirs.
process.env.SESS_ROOT = path.join(home, 'dx-experimental-sessions');
console.log('EXPERIMENTAL: separate browser storage; original files are unchanged.');
console.log('Credential projection only; global markers and model defects remain.');
const require = createRequire(launcher);
new Function('require', 'buildRuntimeData', executable)(require, buildRuntimeData);
