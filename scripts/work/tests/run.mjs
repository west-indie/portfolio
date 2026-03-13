import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TEST_FILES = [
  'schema.check.mjs',
  'templates.check.mjs',
  'media.check.mjs',
  'create-from.check.mjs',
  'validate.check.mjs',
  'deploy.check.mjs',
  'cli.check.mjs',
];

let failures = 0;
for (const file of TEST_FILES) {
  const absolute = path.resolve(path.dirname(fileURLToPath(import.meta.url)), file);
  try {
    const module = await import(pathToFileURL(absolute).href);
    const run = module.default;
    if (typeof run !== 'function') {
      throw new Error('Missing default async test function');
    }
    await run();
    console.log(`ok - ${file}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${file}`);
    console.error(String(error?.stack || error));
  }
}

if (failures > 0) {
  process.exit(1);
}
