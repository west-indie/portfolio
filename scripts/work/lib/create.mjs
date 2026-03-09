import { createInputSchema, isHttpUrl, isYearValid, normalizeHttpUrl, normalizeYear, slugify } from './schema.mjs';
import { materializeMedia } from './media.mjs';
import { writeProjectEntry } from './store.mjs';

function uniqStrings(values) {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)));
}

function normalizeLinks(links = {}) {
  const next = {};
  if (links.github) next.github = normalizeHttpUrl(links.github);
  if (links.liveDemo) next.liveDemo = normalizeHttpUrl(links.liveDemo);
  if (Array.isArray(links.press) && links.press.length > 0) {
    next.press = uniqStrings(links.press).map((value) => normalizeHttpUrl(value));
  }

  const invalid = [];
  if (next.github && !isHttpUrl(next.github)) invalid.push('links.github');
  if (next.liveDemo && !isHttpUrl(next.liveDemo)) invalid.push('links.liveDemo');
  if (Array.isArray(next.press)) {
    next.press.forEach((value, index) => {
      if (!isHttpUrl(value)) invalid.push(`links.press[${index}]`);
    });
  }
  if (invalid.length > 0) {
    throw new Error(`Invalid URL value(s): ${invalid.join(', ')}`);
  }
  return next;
}

export async function createWorkEntry({ input, root = process.cwd(), dryRun = false, replace = false }) {
  const parsed = createInputSchema.parse(input || {});
  const slug = slugify(parsed.slug || parsed.title);
  if (!slug) {
    throw new Error('Unable to derive slug from input.');
  }

  const year = normalizeYear(parsed.year);
  if (!isYearValid(year)) {
    throw new Error('year must be 4 digits between 1900 and 2100.');
  }

  const mediaResult = await materializeMedia({
    slug,
    media: parsed.media,
    root,
    dryRun,
  });

  const frontmatter = {
    slug,
    title: parsed.title.trim(),
    subtitle: parsed.subtitle.trim(),
    year,
    role: parsed.role.trim(),
    location: parsed.location.trim(),
    disciplines: uniqStrings(parsed.disciplines),
    techStack: uniqStrings(parsed.techStack),
    collaborators: (Array.isArray(parsed.collaborators) ? parsed.collaborators : [])
      .map((item) => ({
        name: String(item.name || '').trim(),
        ...(item.role ? { role: String(item.role).trim() } : {}),
      }))
      .filter((item) => item.name),
    links: normalizeLinks(parsed.links),
    media: mediaResult.media,
  };

  const writeResult = await writeProjectEntry({
    frontmatter,
    description: parsed.description,
    root,
    dryRun,
    replace,
  });

  return {
    slug,
    year,
    frontmatter,
    description: parsed.description,
    filePath: writeResult.filePath,
    relativeFilePath: writeResult.relativeFilePath,
    markdown: writeResult.content,
    mediaOperations: mediaResult.operations,
    replaced: writeResult.replaced,
  };
}
