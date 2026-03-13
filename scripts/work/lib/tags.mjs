import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_TAG_SUGGESTIONS, normalizeTagList } from './schema.mjs';
import { readAllProjects } from './store.mjs';

export const TAG_REGISTRY_RELATIVE_PATH = path.join('src', 'content', 'projects', '_tags.json');

function normalizeStoredTags(raw) {
  if (Array.isArray(raw)) return normalizeTagList(raw);
  if (raw && typeof raw === 'object' && Array.isArray(raw.tags)) return normalizeTagList(raw.tags);
  return [];
}

async function readRegistryFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeStoredTags(parsed);
  } catch {
    return [];
  }
}

function collectTagsFromEntries(entries) {
  return normalizeTagList(
    entries.flatMap((entry) => (Array.isArray(entry?.data?.tags) ? entry.data.tags : [])),
  );
}

export async function loadRegisteredTags({ root = process.cwd() } = {}) {
  const registryPath = path.resolve(root, TAG_REGISTRY_RELATIVE_PATH);
  const [storedTags, projects] = await Promise.all([
    readRegistryFile(registryPath),
    readAllProjects(root),
  ]);

  const tags = normalizeTagList([
    ...DEFAULT_TAG_SUGGESTIONS,
    ...storedTags,
    ...collectTagsFromEntries(projects.entries || []),
  ]).sort((a, b) => a.localeCompare(b));

  return {
    tags,
    registryPath,
  };
}

export async function registerTags({ tags = [], root = process.cwd(), dryRun = false } = {}) {
  const incoming = normalizeTagList(tags);
  const { tags: current, registryPath } = await loadRegisteredTags({ root });
  const merged = normalizeTagList([...current, ...incoming]).sort((a, b) => a.localeCompare(b));
  const changed = merged.length !== current.length || merged.some((tag, index) => tag !== current[index]);

  if (changed && !dryRun) {
    await fs.mkdir(path.dirname(registryPath), { recursive: true });
    await fs.writeFile(
      registryPath,
      `${JSON.stringify({ tags: merged }, null, 2)}\n`,
      'utf8',
    );
  }

  return {
    changed,
    tags: merged,
    registryPath,
  };
}
