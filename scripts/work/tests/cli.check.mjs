import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function runNode(args, cwd) {
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
  });
}

function runGit(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
}

export default async function run() {
  const scriptPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'work.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'work-cli-test-'));
  await fs.mkdir(path.join(root, 'src', 'content', 'projects'), { recursive: true });
  await fs.mkdir(path.join(root, 'public', 'images', 'projects'), { recursive: true });
  await fs.mkdir(path.join(root, 'public', 'video', 'projects'), { recursive: true });

  const heroPath = path.join(root, 'hero.jpg');
  const payloadPath = path.join(root, 'entry.json');
  await fs.writeFile(heroPath, 'hero', 'utf8');
  await fs.writeFile(payloadPath, JSON.stringify({
    title: 'CLI Entry',
    subtitle: 'From CLI test',
    year: '2026',
    category: 'performance',
    categoryMeta: {
      venue: 'CLI Test Venue',
    },
    role: 'Role',
    location: 'Place',
    disciplines: ['theatre'],
    techStack: ['Ink'],
    collaborators: [{ name: 'Test User' }],
    links: {},
    media: {
      heroImage: heroPath,
      gallery: [],
    },
    description: 'Body',
  }, null, 2), 'utf8');

  const createDry = runNode([scriptPath, 'create', '--from', payloadPath, '--dry-run'], root);
  assert.equal(createDry.status, 0);
  assert.match(createDry.stdout, /created:\s+src\/content\/projects\/cli-entry\.md/);

  const createReal = runNode([scriptPath, 'create', '--from', payloadPath], root);
  assert.equal(createReal.status, 0);

  runGit(['init'], root);
  runGit(['config', 'user.email', 'test@example.com'], root);
  runGit(['config', 'user.name', 'Test User'], root);
  runGit(['add', '.'], root);
  runGit(['commit', '-m', 'init'], root);

  const entryFile = path.join(root, 'src', 'content', 'projects', 'cli-entry.md');
  const currentEntry = await fs.readFile(entryFile, 'utf8');
  await fs.writeFile(entryFile, `${currentEntry.trim()}\n\nUpdated line.\n`, 'utf8');

  const validateChanged = runNode([scriptPath, 'validate', '--changed'], root);
  assert.equal(validateChanged.status, 0);

  const deployDry = runNode([scriptPath, 'deploy', '--dry-run', '--no-preflight'], root);
  assert.equal(deployDry.status, 0);
  assert.match(deployDry.stdout, /git add -A --/);
}
