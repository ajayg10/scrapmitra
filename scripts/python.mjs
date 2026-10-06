import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const venv = resolve(process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
export const python = process.env.KABADIPLUS_PYTHON || (existsSync(venv) ? venv : (process.platform === 'win32' ? 'python' : 'python3'));
if (process.argv[1] === new URL(import.meta.url).pathname || process.argv[1]?.endsWith('python.mjs')) {
  const result = spawnSync(python, process.argv.slice(2), { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  process.exit(result.status ?? 1);
}
