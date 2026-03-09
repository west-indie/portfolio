import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runDeployWorkflow } from '../lib/deploy.mjs';

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
}

const ENTRY = `---\nslug: \"signal-weaver\"\ntitle: \"Signal Weaver\"\nsubtitle: \"sub\"\nyear: \"2026\"\nrole: \"Role\"\nlocation: \"Place\"\ndisciplines:\n  - theatre\ntechStack:\n  - Ink\ncollaborators:\n  - name: \"A\"\nlinks: {}\nmedia:\n  heroImage: \"/images/projects/signal-weaver-hero.jpg\"\n  gallery: []\n---\nBody\n`;

export default async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'work-deploy-test-'));
  await fs.mkdir(path.join(root, 'src', 'content', 'projects'), { recursive: true });
  await fs.mkdir(path.join(root, 'public', 'images', 'projects'), { recursive: true });
  await fs.writeFile(path.join(root, 'src', 'content', 'projects', 'signal-weaver.md'), ENTRY, 'utf8');
  await fs.writeFile(path.join(root, 'public', 'images', 'projects', 'signal-weaver-hero.jpg'), 'x', 'utf8');

  git(['init'], root);
  git(['config', 'user.email', 'test@example.com'], root);
  git(['config', 'user.name', 'Test User'], root);
  await fs.writeFile(path.join(root, '.gitignore'), 'node_modules\n', 'utf8');
  git(['add', '.'], root);
  git(['commit', '-m', 'init'], root);

  await fs.writeFile(path.join(root, 'src', 'content', 'projects', 'signal-weaver.md'), ENTRY.replace('Body', 'Body updated'), 'utf8');

  const result = await runDeployWorkflow({
    cwd: root,
    dryRun: true,
    noPreflight: true,
  });

  assert.equal(result.ok, true);
  assert.ok(result.logs.some((line) => line.startsWith('git add -A --')));
  assert.ok(result.logs.some((line) => line.startsWith('git commit -m')));
  assert.ok(result.logs.some((line) => line.startsWith('git push')));
}
