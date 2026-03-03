import fs from 'node:fs/promises';
import path from 'node:path';
import { MEDIA_IMAGE_EXTENSIONS, MEDIA_VIDEO_EXTENSIONS, isHttpUrl } from './schema.mjs';

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

  if (raw.startsWith('/images/') || raw.startsWith('/video/')) {
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
    : `${slug}-${index}${ext}`;

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
  const heroResult = await materializeSingleMediaPath({
    src: media.heroImage,
    slug,
    slot: 'hero',
    index: 0,
    root,
    dryRun,
    forcedType: 'image',
  });
  operations.push(heroResult.operation);

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

  return {
    media: {
      heroImage: heroResult.src,
      gallery,
    },
    operations,
  };
}
