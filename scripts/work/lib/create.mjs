import {
  buildCategoryEntryLines,
  createInputSchema,
  DEFAULT_CATEGORY,
  getCategoryDefinition,
  isHttpUrl,
  isLocationRequired,
  isKnownCategory,
  isYearValid,
  normalizeCategoryMeta,
  normalizeMonth,
  normalizeHttpUrl,
  normalizeTagList,
  normalizeYear,
  isMonthValid,
  requiredCategoryKeys,
  slugify,
} from './schema.mjs';
import { materializeMedia } from './media.mjs';
import { writeProjectEntry } from './store.mjs';
import { registerTags } from './tags.mjs';

function uniqStrings(values) {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)));
}

function normalizeLinkStack(links = {}) {
  return Array.isArray(links.stack)
    ? links.stack
      .map((item) => {
        const title = String(item?.title || '').trim();
        const url = normalizeHttpUrl(item?.url);
        if (!title || !url) return null;
        return { title, url };
      })
      .filter(Boolean)
    : [];
}

function legacyDirectToLinkStack(links = {}) {
  const out = [];
  const github = normalizeHttpUrl(links.github);
  if (github) out.push({ title: 'GitHub', url: github });
  const liveDemo = normalizeHttpUrl(links.liveDemo);
  if (liveDemo) out.push({ title: 'Live Demo', url: liveDemo });
  return out;
}

function dedupeLinkStack(values = []) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(values) ? values : []) {
    const title = String(item?.title || '').trim();
    const url = normalizeHttpUrl(item?.url);
    if (!title || !url) continue;
    const key = `${title.toLowerCase()}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, url });
  }
  return out;
}

function legacyPressToLinkStack(links = {}) {
  const press = Array.isArray(links.press) ? uniqStrings(links.press).map((value) => normalizeHttpUrl(value)) : [];
  return press.map((url, index) => ({
    title: press.length > 1 ? `Press ${index + 1}` : 'Press',
    url,
  }));
}

function normalizeLinks(links = {}) {
  const stack = normalizeLinkStack(links);
  const direct = legacyDirectToLinkStack(links);
  const press = stack.length > 0 ? [] : legacyPressToLinkStack(links);
  const mergedStack = dedupeLinkStack([...direct, ...stack, ...press]);
  const next = {};
  if (mergedStack.length > 0) next.stack = mergedStack;

  const invalid = [];
  if (Array.isArray(next.stack)) {
    next.stack.forEach((item, index) => {
      if (!String(item.title || '').trim()) invalid.push(`links.stack[${index}].title`);
      if (!isHttpUrl(item.url)) invalid.push(`links.stack[${index}].url`);
    });
  }
  if (invalid.length > 0) {
    throw new Error(`Invalid URL value(s): ${invalid.join(', ')}`);
  }
  return next;
}

export async function createWorkEntry({
  input,
  root = process.cwd(),
  dryRun = false,
  replace = false,
  categoryDefinitions = null,
}) {
  const parsed = createInputSchema.parse(input || {});
  const slug = slugify(parsed.slug || parsed.title);
  if (!slug) {
    throw new Error('Unable to derive slug from input.');
  }

  const year = normalizeYear(parsed.year);
  if (!isYearValid(year)) {
    throw new Error('year must be 4 digits between 1900 and 2100.');
  }
  const month = normalizeMonth(parsed.month ?? '01');
  if (!isMonthValid(month)) {
    throw new Error('month must be between 1 and 12.');
  }

  const category = String(parsed.category || DEFAULT_CATEGORY).trim();
  if (!isKnownCategory(category, categoryDefinitions)) {
    throw new Error(`Unknown category "${category}".`);
  }
  const location = String(parsed.location || '').trim();
  if (isLocationRequired(category) && !location) {
    throw new Error(`Location is required for ${getCategoryDefinition(category, categoryDefinitions).label}.`);
  }
  const categoryMeta = normalizeCategoryMeta(parsed.categoryMeta);
  const missingCategoryFields = requiredCategoryKeys(category, categoryDefinitions)
    .filter((key) => !String(categoryMeta[key] || '').trim());
  if (missingCategoryFields.length > 0) {
    const definition = getCategoryDefinition(category, categoryDefinitions);
    throw new Error(`Missing required ${definition.label} field(s): ${missingCategoryFields.join(', ')}`);
  }

  const tags = normalizeTagList(parsed.tags);

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
    month,
    category,
    tags,
    categoryMeta,
    entryLines: buildCategoryEntryLines(category, categoryMeta, categoryDefinitions),
    role: parsed.role.trim(),
    location,
    disciplines: uniqStrings(parsed.disciplines),
    omitTechStack: parsed.omitTechStack === true,
    omitLinkStack: parsed.omitLinkStack === true,
    hidden: parsed.hidden === true,
    hideFromWorkPage: parsed.hideFromWorkPage === true,
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

  await registerTags({
    tags,
    root,
    dryRun,
  });

  return {
    slug,
    year,
    month,
    frontmatter,
    description: parsed.description,
    filePath: writeResult.filePath,
    relativeFilePath: writeResult.relativeFilePath,
    markdown: writeResult.content,
    mediaOperations: mediaResult.operations,
    replaced: writeResult.replaced,
  };
}
