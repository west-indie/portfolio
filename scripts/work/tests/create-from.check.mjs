import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWorkEntry } from '../lib/create.mjs';

export default async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'work-create-test-'));
  await fs.mkdir(path.join(root, 'src', 'content', 'projects'), { recursive: true });
  await fs.mkdir(path.join(root, 'public', 'images', 'projects'), { recursive: true });
  await fs.mkdir(path.join(root, 'public', 'video', 'projects'), { recursive: true });

  const heroSrc = path.join(root, 'hero.jpg');
  await fs.writeFile(heroSrc, 'hero', 'utf8');
  const gallerySrc = path.join(root, 'gallery-1.png');
  await fs.writeFile(gallerySrc, 'gallery', 'utf8');

  const report = await createWorkEntry({
    root,
    dryRun: false,
    input: {
      year: '2026',
      title: 'Signal Weaver',
      subtitle: 'Realtime cueing for performance.',
      category: 'performance',
      tags: ['sound design', 'music composition'],
      categoryMeta: {
        venue: 'Mainstage',
      },
      role: 'Creative Technologist',
      location: 'San Diego',
      disciplines: ['interactive-media'],
      techStack: ['TypeScript'],
      collaborators: [{ name: 'Jane Doe', role: 'Director' }],
      links: {
        github: 'github.com/example/repo',
        liveDemo: 'example.com/demo',
        stack: [{ title: 'Review', url: 'news.example.com/story' }],
      },
      media: {
        heroImage: heroSrc,
        gallery: [{ src: gallerySrc }],
      },
      description: 'A markdown body.',
    },
  });

  assert.equal(report.slug, 'signal-weaver');
  assert.equal(report.relativeFilePath, 'src/content/projects/signal-weaver.md');
  assert.match(report.markdown, /subtitle:\s+Realtime cueing for performance\./);

  const written = await fs.readFile(path.join(root, report.relativeFilePath), 'utf8');
  assert.match(written, /title:\s+Signal Weaver/);
  assert.match(written, /github:\s+'?https:\/\/github.com\/example\/repo'?/);
  assert.match(written, /liveDemo:\s+'?https:\/\/example.com\/demo'?/);
  assert.match(written, /stack:/);
  assert.match(written, /title:\s+Review/);
  assert.match(written, /url:\s+'?https:\/\/news.example.com\/story'?/);
  assert.match(written, /category:\s+performance/);
  assert.match(written, /tags:/);
  assert.match(written, /entryLines:/);
  assert.match(written, /gallery:/);
  assert.doesNotMatch(written, /caption:\s+undefined/);
}
