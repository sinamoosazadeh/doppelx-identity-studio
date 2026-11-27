// Fix only module bootstrap order in the exact reviewed runtime, in memory.
import { sha256, PHONE_RUNTIME_SHA256 } from './legacy-adapter.mjs';
export const STATIC_MODULE_LINE = "if (isModule) return prelude + 'import ' + JSON.stringify(abs) + ';\\n';";
export const ORDERED_MODULE_LINE = "if (isModule) return prelude + 'await import(' + JSON.stringify(abs) + ');\\n';";
export function prepareModuleOrder(source) {
  if (sha256(source) !== PHONE_RUNTIME_SHA256) throw new Error('Unreviewed runtime; no module-order transformation');
  if (source.split(STATIC_MODULE_LINE).length !== 2) throw new Error('Module bootstrap boundary mismatch');
  return source.replace(STATIC_MODULE_LINE, ORDERED_MODULE_LINE);
}
