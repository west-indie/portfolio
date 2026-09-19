import fs from 'node:fs/promises';
import path from 'node:path';
import { MEDIA_IMAGE_EXTENSIONS, MEDIA_VIDEO_EXTENSIONS, isHttpUrl } from './schema.mjs';

const MEDIA_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']);

function extensionFor(filePath) {
  return path.extname(String(filePath || '')).toLowerCase();
}

function classifyMediaByExtension(filePath) {
  const ext = extensionFor(filePath);
  if (MEDIA_VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (MEDIA_IMAGE_EXTENSIONS.has(ext)) return 'image';
  return 'unknown';
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function normalizeRepoPath(targetPath) {
  return targetPath.split(path.sep).join('/');
}

function toPublicUrl(absolutePath, root) {
  const publicRoot = path.resolve(root, 'public');
  const rel = path.relative(publicRoot, absolutePath);
  return `/${normalizeRepoPath(rel)}`;
}

async function resolveSourceInput(src, root) {
  const raw = String(src || '').trim();
  if (!raw) throw new Error('Media source path is required.');

  if (isHttpUrl(raw)) {
    return { kind: 'remote-url', sourcePath: raw };
  }

  if (raw.startsWith('/images/') || raw.startsWith('/video/') || raw.startsWith('/audio/')) {
    const absolute = path.resolve(root, 'public', `.${raw}`);
    return { kind: 'public-path', sourcePath: raw, absolutePath: absolute };
  }

  const asAbsolute = path.isAbsolute(raw) ? raw : path.resolve(root, raw);
  if (await pathExists(asAbsolute)) {
    return { kind: 'filesystem', sourcePath: raw, absolutePath: asAbsolute };
  }

  if (raw.startsWith('/')) {
    const guessedPublic = path.resolve(root, 'public', `.${raw}`);
    if (await pathExists(guessedPublic)) {
      return { kind: 'public-path', sourcePath: raw, absolutePath: guessedPublic };
    }
  }

  throw new Error(`Media source does not exist: ${raw}`);
}

async function materializeAudioPath({ src, slug, slot, root, dryRun }) {
  const raw = String(src || '').trim();
  if (!raw) return { src: '', operation: null };
  const source = await resolveSourceInput(raw, root);
  if (source.kind === 'remote-url') {
    return { src: source.sourcePath, operation: { kind: 'remote', source: source.sourcePath, destination: source.sourcePath } };
  }
  const sourcePath = source.kind === 'public-path' ? source.sourcePath : source.absolutePath;
  const extension = extensionFor(sourcePath);
  if (!MEDIA_AUDIO_EXTENSIONS.has(extension)) throw new Error(`Unsupported audio extension for ${raw}`);
  if (source.kind === 'public-path') {
    return { src: source.sourcePath, operation: { kind: 'reuse-public', source: source.sourcePath, destination: source.sourcePath } };
  }
  const destinationAbsolutePath = path.resolve(root, 'public', 'audio', 'projects', slug, `${slug}-${slot}${extension}`);
  await copyLocalAsset({ sourceAbsolutePath: source.absolutePath, destinationAbsolutePath, dryRun });
  return {
    src: toPublicUrl(destinationAbsolutePath, root),
    operation: { kind: 'copy', source: source.absolutePath, destination: destinationAbsolutePath },
  };
}

export async function materializeComposition({ slug, composition, root = process.cwd(), dryRun = false }) {
  if (!composition || typeof composition !== 'object') return { composition: undefined, operations: [] };
  const hasContent = [
    composition.length,
    composition.about,
    composition.arrangementNotes,
    composition.featuredExcerpt,
    composition.fullAudio,
    composition.imageCredit,
    composition.imageSubject,
    composition.imageNote,
  ].some((value) => String(value || '').trim())
    || composition.selected === true
    || (Array.isArray(composition.instrumentation) && composition.instrumentation.length > 0)
    || (Array.isArray(composition.credits) && composition.credits.length > 0);
  if (!hasContent) return { composition: undefined, operations: [] };
  const excerpt = await materializeAudioPath({ src: composition.featuredExcerpt, slug, slot: 'excerpt', root, dryRun });
  const full = await materializeAudioPath({ src: composition.fullAudio, slug, slot: 'full', root, dryRun });
  const operations = [excerpt.operation, full.operation].filter(Boolean);
  const normalized = {
    length: String(composition.length || '').trim(),
    about: String(composition.about || '').trim(),
    arrangementNotes: String(composition.arrangementNotes || '').trim(),
    ...(excerpt.src ? { featuredExcerpt: excerpt.src } : {}),
    ...(full.src ? { fullAudio: full.src } : {}),
    selected: composition.selected === true,
    ...(Number.isInteger(composition.selectedOrder) && composition.selectedOrder > 0 ? { selectedOrder: composition.selectedOrder } : {}),
    imageCredit: String(composition.imageCredit || '').trim(),
    imageSubject: String(composition.imageSubject || '').trim(),
    imageNote: String(composition.imageNote || '').trim(),
    instrumentation: Array.isArray(composition.instrumentation) ? composition.instrumentation.map((item) => String(item || '').trim()).filter(Boolean) : [],
    credits: Array.isArray(composition.credits) ? composition.credits.map((item) => ({ label: String(item.label || '').trim(), value: String(item.value || '').trim() })).filter((item) => item.label && item.value) : [],
  };
  return { composition: normalized, operations };
}

async function copyLocalAsset({ sourceAbsolutePath, destinationAbsolutePath, dryRun }) {
  if (!dryRun) {
    await fs.mkdir(path.dirname(destinationAbsolutePath), { recursive: true });
    await fs.copyFile(sourceAbsolutePath, destinationAbsolutePath);
  }
}

async function materializeSingleMediaPath({
  src,
  slug,
  slot,
  index,
  forcedType,
  root,
  dryRun,
}) {
  const source = await resolveSourceInput(src, root);

  if (source.kind === 'remote-url') {
    const remoteType = forcedType || 'embed';
    return {
      type: remoteType,
      src: source.sourcePath,
      operation: {
        kind: 'remote',
        source: source.sourcePath,
        destination: source.sourcePath,
      },
    };
  }

  if (source.kind === 'public-path') {
    const guessedType = forcedType || classifyMediaByExtension(source.sourcePath);
    if (guessedType === 'unknown') {
      throw new Error(`Unsupported media extension for ${source.sourcePath}`);
    }
    return {
      type: guessedType,
      src: source.sourcePath,
      operation: {
        kind: 'reuse-public',
        source: source.sourcePath,
        destination: source.sourcePath,
      },
    };
  }

  const detectedType = forcedType || classifyMediaByExtension(source.absolutePath);
  if (detectedType === 'unknown') {
    throw new Error(`Unsupported media extension for ${source.sourcePath}`);
  }

  const ext = extensionFor(source.absolutePath);
  const fileName = slot === 'hero'
    ? `${slug}-hero${ext}`
    : (slot === 'featured' ? `${slug}-featured-${index}${ext}` : `${slug}-${index}${ext}`);

  const destinationDir = detectedType === 'video'
    ? path.resolve(root, 'public', 'video', 'projects')
    : path.resolve(root, 'public', 'images', 'projects');
  const destinationAbsolutePath = path.join(destinationDir, fileName);

  await copyLocalAsset({
    sourceAbsolutePath: source.absolutePath,
    destinationAbsolutePath,
    dryRun,
  });

  const publicUrl = toPublicUrl(destinationAbsolutePath, root);

  return {
    type: detectedType,
    src: publicUrl,
    operation: {
      kind: 'copy',
      source: source.absolutePath,
      destination: destinationAbsolutePath,
    },
  };
}

export async function materializeMedia({ slug, media, root = process.cwd(), dryRun = false }) {
  const operations = [];
  const heroSource = String(media?.heroImage || '').trim();
  const heroResult = heroSource
    ? await materializeSingleMediaPath({
      src: heroSource,
      slug,
      slot: 'hero',
      index: 0,
      root,
      dryRun,
      forcedType: 'image',
    })
    : null;
  if (heroResult?.operation) {
    operations.push(heroResult.operation);
  }

  const gallery = [];
  const galleryItems = Array.isArray(media.gallery) ? media.gallery : [];
  for (let index = 0; index < galleryItems.length; index += 1) {
    const item = galleryItems[index];
    const result = await materializeSingleMediaPath({
      src: item.src,
      slug,
      slot: 'gallery',
      index: index + 1,
      root,
      dryRun,
      forcedType: item.type,
    });
    operations.push(result.operation);
    const caption = String(item.caption || '').trim();
    gallery.push({
      type: result.type,
      src: result.src,
      ...(caption ? { caption } : {}),
    });
  }

  const featured = [];
  const featuredItems = Array.isArray(media.featured)
    ? media.featured
    : (Array.isArray(media.placeholders) ? media.placeholders : []);
  for (let index = 0; index < featuredItems.length; index += 1) {
    const item = featuredItems[index];
    const result = await materializeSingleMediaPath({
      src: item.src,
      slug,
      slot: 'featured',
      index: index + 1,
      root,
      dryRun,
      forcedType: item.type,
    });
    operations.push(result.operation);
    const caption = String(item.caption || '').trim();
    featured.push({
      type: result.type,
      src: result.src,
      ...(caption ? { caption } : {}),
    });
  }

  return {
    media: {
      gallery,
      ...(heroResult?.src ? { heroImage: heroResult.src } : {}),
      heroFit: media?.heroFit === 'height' ? 'height' : 'width',
      ...(featured.length > 0 ? { featured } : {}),
      omitFeaturedFromGallery: media.omitFeaturedFromGallery === true,
    },
    operations,
  };
}
