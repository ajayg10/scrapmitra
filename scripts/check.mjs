import { spawnSync } from 'node:child_process';
import { python } from './python.mjs';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const checks = [
  [python, ['scripts/generate_taxonomy.py', '--check']],
  [python, ['scripts/export_schemas.py', '--check']],
  ['node', ['scripts/generate-types.mjs', '--check']],
  [python, ['-m', 'ruff', 'check', 'backend', 'scripts']],
  [python, ['-m', 'pytest']],
  [python, ['scripts/lint_infra.py', 'infra/template.yaml']],
  [npm, ['run', 'build']],
];
for (const [command, args] of checks) {
  const run = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' && command === npm });
  if (run.error) console.error(run.error.message);
  if (run.status !== 0) process.exit(run.status ?? 1);
}
console.log('Phase 1 foundation checks passed. This does not certify the later-phase golden path.');
