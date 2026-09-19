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
      layout: 'theatre_v2',
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
        heroFit: 'height',
        gallery: [{ src: gallerySrc }],
        omitFeaturedFromGallery: true,
      },
      description: 'A markdown body.',
    },
  });

  assert.equal(report.slug, 'signal-weaver');
  assert.equal(report.relativeFilePath, 'src/content/projects/signal-weaver.md');
  assert.match(report.markdown, /subtitle:\s+Realtime cueing for performance\./);

  const written = await fs.readFile(path.join(root, report.relativeFilePath), 'utf8');
  assert.match(written, /title:\s+Signal Weaver/);
  assert.match(written, /stack:/);
  assert.match(written, /title:\s+GitHub/);
  assert.match(written, /url:\s+'?https:\/\/github.com\/example\/repo'?/);
  assert.match(written, /title:\s+Live Demo/);
  assert.match(written, /url:\s+'?https:\/\/example.com\/demo'?/);
  assert.match(written, /title:\s+Review/);
  assert.match(written, /url:\s+'?https:\/\/news.example.com\/story'?/);
  assert.match(written, /category:\s+performance/);
  assert.match(written, /layout:\s+theatre_v2/);
  assert.match(written, /heroFit:\s+height/);
  assert.match(written, /omitFeaturedFromGallery:\s+true/);
  assert.match(written, /tags:/);
  assert.match(written, /entryLines:/);
  assert.match(written, /gallery:/);
  assert.match(written, /heroFit:\s+height/);
  assert.doesNotMatch(written, /caption:\s+undefined/);

  const coding = await createWorkEntry({
    root,
    input: {
      slug: 'numbered-workflow',
      title: 'Numbered Workflow',
      subtitle: 'A coding v2 example.',
      year: '2026',
      category: 'program',
      layout: 'coding_v2',
      role: 'Developer',
      disciplines: ['code-programs'],
      omitWorkflow: true,
      media: { heroImage: '', gallery: [] },
      description: '## Workflow\n\n1. Paste\n2. Export',
    },
  });
  const codingMarkdown = await fs.readFile(path.join(root, coding.relativeFilePath), 'utf8');
  assert.match(codingMarkdown, /layout:\s+coding_v2/);
  assert.match(codingMarkdown, /omitWorkflow:\s+true/);
  assert.match(codingMarkdown, /1\. Paste[\s\S]*2\. Export/);
  assert.doesNotMatch(codingMarkdown, /^composition:/m);

  const excerptSrc = path.join(root, 'excerpt.mp3');
  const fullSrc = path.join(root, 'full.wav');
  await fs.writeFile(excerptSrc, 'excerpt', 'utf8');
  await fs.writeFile(fullSrc, 'full', 'utf8');
  const composition = await createWorkEntry({
    root,
    input: {
      slug: 'night-study',
      title: 'Night Study',
      subtitle: 'A short electronic composition.',
      year: '2026',
      category: 'composition',
      layout: 'composition_v1',
      role: 'Composer',
      disciplines: ['comp'],
      media: { heroImage: heroSrc, gallery: [] },
      composition: {
        length: '3:42',
        about: 'A study in suspended harmony.',
        arrangementNotes: 'Layered synthesizers and processed percussion.',
        featuredExcerpt: excerptSrc,
        fullAudio: fullSrc,
        selected: true,
        selectedOrder: 1,
        imageCredit: 'Leo Nunez',
        imageSubject: 'Night architecture.',
        imageNote: 'The lighting mirrors the harmonic pacing.',
        instrumentation: ['Synthesizer', 'Percussion'],
        credits: [{ label: 'Composer', value: 'Leo Nunez' }],
      },
      description: '',
    },
  });
  const compositionMarkdown = await fs.readFile(path.join(root, composition.relativeFilePath), 'utf8');
  assert.match(compositionMarkdown, /category:\s+composition/);
  assert.match(compositionMarkdown, /layout:\s+composition_v1/);
  assert.match(compositionMarkdown, /featuredExcerpt:\s+\/audio\/projects\/night-study\/night-study-excerpt\.mp3/);
  assert.match(compositionMarkdown, /fullAudio:\s+\/audio\/projects\/night-study\/night-study-full\.wav/);
  assert.match(compositionMarkdown, /selectedOrder:\s+1/);
  await fs.access(path.join(root, 'public', 'audio', 'projects', 'night-study', 'night-study-excerpt.mp3'));
  await fs.access(path.join(root, 'public', 'audio', 'projects', 'night-study', 'night-study-full.wav'));
}
