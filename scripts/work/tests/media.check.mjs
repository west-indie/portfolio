import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { materializeMedia } from '../lib/media.mjs';

export default async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'work-media-test-'));
  await fs.mkdir(path.join(root, 'public', 'images', 'projects'), { recursive: true });
  await fs.mkdir(path.join(root, 'public', 'video', 'projects'), { recursive: true });

  const heroSrc = path.join(root, 'hero.jpg');
  const videoSrc = path.join(root, 'clip.mp4');
  await fs.writeFile(heroSrc, 'hero', 'utf8');
  await fs.writeFile(videoSrc, 'video', 'utf8');

  const result = await materializeMedia({
    slug: 'signal-weaver',
    media: {
      heroImage: heroSrc,
      gallery: [{ src: videoSrc }],
    },
    root,
    dryRun: false,
  });

  assert.equal(result.media.heroImage, '/images/projects/signal-weaver-hero.jpg');
  assert.equal(result.media.gallery[0].src, '/video/projects/signal-weaver-1.mp4');

  const heroOut = path.join(root, 'public', 'images', 'projects', 'signal-weaver-hero.jpg');
  const videoOut = path.join(root, 'public', 'video', 'projects', 'signal-weaver-1.mp4');
  await fs.access(heroOut);
  await fs.access(videoOut);
}
