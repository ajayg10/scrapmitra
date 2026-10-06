import { readFile, writeFile, readdir } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

const check = process.argv.includes('--check');
for (const name of (await readdir('data/schemas')).filter((n) => n.endsWith('.schema.json')).sort()) {
  const schema = JSON.parse(await readFile(`data/schemas/${name}`, 'utf8'));
  const result = await compile(schema, schema.title, {
    bannerComment: '/* Generated from the Pydantic JSON Schema. Do not edit by hand. */',
    additionalProperties: false,
    maxItems: -1,
  });
  const destination = `frontend/src/generated/${name.replace('.schema.json', '.ts')}`;
  if (check) {
    const current = await readFile(destination, 'utf8').catch(() => null);
    if (current !== result) throw new Error(`Stale generated contract: ${destination}`);
  } else {
    await writeFile(destination, result);
  }
}
console.log(check ? 'TypeScript contracts are current.' : 'TypeScript contracts generated.');
