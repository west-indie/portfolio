import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  loadCategoryDefinitions,
  normalizeCategoryDefinitions,
  saveCategoryDefinitions,
} from '../lib/entry-templates.mjs';

export default async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'work-templates-test-'));
  await fs.mkdir(path.join(root, 'src', 'content', 'projects'), { recursive: true });

  const normalized = normalizeCategoryDefinitions({
    categories: [
      {
        id: 'performance',
        label: 'Performance',
        detailFields: [
          { label: 'Venue', required: true },
          { label: 'Run Dates' },
        ],
      },
      {
        id: 'new-template',
        label: 'New Template',
        detailFields: [{ label: 'Custom Line' }],
      },
    ],
  });

  assert.ok(normalized.performance);
  assert.ok(normalized.film);
  assert.ok(normalized['new-template']);

  const saved = await saveCategoryDefinitions({
    definitions: normalized,
    root,
  });

  assert.ok(saved.templatePath.endsWith('_entry-templates.json'));

  const loaded = await loadCategoryDefinitions({ root });
  assert.equal(loaded['new-template'].label, 'New Template');
  assert.equal(loaded.performance.detailFields[0].required, true);
}
