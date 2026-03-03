import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateWorkEntries } from '../lib/validate.mjs';

const DUP_A = `---\nslug: \"dup\"\ntitle: \"A\"\nsubtitle: \"sub\"\nyear: \"2026\"\nrole: \"Role\"\nlocation: \"Place\"\ndisciplines:\n  - theatre\ntechStack: []\ncollaborators: []\nlinks: {}\nmedia:\n  heroImage: \"/images/projects/a.jpg\"\n  gallery: []\n---\nBody\n`;
const DUP_B = `---\nslug: \"dup\"\ntitle: \"B\"\nsubtitle: \"sub\"\nyear: \"2026\"\nrole: \"Role\"\nlocation: \"Place\"\ndisciplines:\n  - theatre\ntechStack: []\ncollaborators: []\nlinks: {}\nmedia:\n  heroImage: \"/images/projects/b.jpg\"\n  gallery: []\n---\nBody\n`;

export default async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'work-validate-test-'));
  await fs.mkdir(path.join(root, 'src', 'content', 'projects'), { recursive: true });
  await fs.writeFile(path.join(root, 'src', 'content', 'projects', 'a.md'), DUP_A, 'utf8');
  await fs.writeFile(path.join(root, 'src', 'content', 'projects', 'b.md'), DUP_B, 'utf8');

  const report = await validateWorkEntries({ mode: 'all', root });
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((entry) => entry.code === 'duplicate_slug'));
}
