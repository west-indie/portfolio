import { z } from 'zod';

export const DISCIPLINES = [
  'automation-tools',
  'batch-processing',
  'board-operator',
  'code-programs',
  'comp',
  'composition',
  'creative-coding',
  'design-production',
  'electronic-instrument-design',
  'interactive-media',
  'lighting',
  'lighting-production',
  'live-electronics',
  'media-pipeline',
  'music-comp',
  'performance',
  'short-film',
  'sound',
  'sound-design',
  'theatre',
];
export const MAX_DISCIPLINES = 4;

export const DEFAULT_CATEGORY = 'performance';

export const CATEGORY_DEFINITIONS = {
  performance: {
    id: 'performance',
    label: 'Performance',
    detailFields: [
      { key: 'venue', label: 'Venue', required: true },
      { key: 'runDates', label: 'Run Dates', required: false },
      { key: 'productionType', label: 'Production Type', required: false },
    ],
  },
  film: {
    id: 'film',
    label: 'Film',
    detailFields: [
      { key: 'format', label: 'Format', required: true },
      { key: 'duration', label: 'Duration', required: false },
      { key: 'festivalStatus', label: 'Festival Status', required: false },
    ],
  },
  interactive: {
    id: 'interactive',
    label: 'Interactive Media',
    detailFields: [
      { key: 'platform', label: 'Platform', required: true },
      { key: 'audience', label: 'Audience', required: false },
      { key: 'buildType', label: 'Build Type', required: false },
    ],
  },
  installation: {
    id: 'installation',
    label: 'Installation',
    detailFields: [
      { key: 'site', label: 'Site', required: true },
      { key: 'runTime', label: 'Run Time', required: false },
      { key: 'hardware', label: 'Hardware', required: false },
    ],
  },
  tooling: {
    id: 'tooling',
    label: 'Tooling / Systems',
    detailFields: [
      { key: 'systemType', label: 'System Type', required: true },
      { key: 'integrations', label: 'Integrations', required: false },
      { key: 'delivery', label: 'Delivery', required: false },
    ],
  },
  program: {
    id: 'program',
    label: 'Program',
    detailFields: [],
  },
};

export const CATEGORY_OPTIONS = Object.values(CATEGORY_DEFINITIONS);

export const DEFAULT_TAG_SUGGESTIONS = [
  'sound design',
  'music composition',
  'interactive media',
  'live electronics',
  'lighting design',
  'system design',
  'direction',
];
const LOCATION_OPTIONAL_CATEGORY_IDS = new Set(['program', 'tooling', 'film', 'feature-film', 'short-film']);

export const MEDIA_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);
export const MEDIA_VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.ogv']);

export const collaboratorSchema = z.object({
  name: z.string().trim().min(1),
  role: z.string().trim().min(1).optional(),
});

export const linkStackItemSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().url(),
});

export const linksSchema = z.object({
  github: z.string().url().optional(),
  liveDemo: z.string().url().optional(),
  stack: z.array(linkStackItemSchema).optional(),
  press: z.array(z.string().url()).optional(),
}).default({});

export const galleryItemSchema = z.object({
  type: z.enum(['image', 'video', 'embed']),
  src: z.string().trim().min(1),
  caption: z.string().trim().optional(),
});

export const mediaSchema = z.object({
  heroImage: z.string().trim().optional().default(''),
  gallery: z.array(galleryItemSchema).default([]),
  featured: z.array(galleryItemSchema).optional(),
  placeholders: z.array(galleryItemSchema).optional(),
});

export const workFrontmatterSchema = z.object({
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().min(1),
  year: z.string().trim().min(1),
  month: z.string().trim().min(1),
  category: z.string().trim().min(1).default(DEFAULT_CATEGORY),
  tags: z.array(z.string().trim().min(1)).default([]),
  categoryMeta: z.record(z.string(), z.string()).default({}),
  entryLines: z.array(z.string().trim().min(1)).default([]),
  role: z.string().trim().min(1),
  location: z.string().trim().default(''),
  disciplines: z.array(z.string().trim().min(1)).min(1).max(MAX_DISCIPLINES),
  omitTechStack: z.boolean().optional().default(false),
  omitLinkStack: z.boolean().optional().default(false),
  hidden: z.boolean().optional().default(false),
  hideFromWorkPage: z.boolean().optional().default(false),
  techStack: z.array(z.string().trim().min(1)).default([]),
  collaborators: z.array(collaboratorSchema).default([]),
  links: linksSchema,
  media: mediaSchema,
});

export const createInputSchema = z.object({
  slug: z.string().trim().optional(),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().min(1),
  year: z.union([z.string(), z.number()]),
  month: z.union([z.string(), z.number()]).optional(),
  category: z.string().trim().optional().default(DEFAULT_CATEGORY),
  tags: z.array(z.string().trim().min(1)).default([]),
  categoryMeta: z.record(z.string(), z.string()).default({}),
  role: z.string().trim().min(1),
  location: z.string().trim().optional().default(''),
  disciplines: z.array(z.string().trim().min(1)).min(1).max(MAX_DISCIPLINES),
  omitTechStack: z.boolean().optional().default(false),
  omitLinkStack: z.boolean().optional().default(false),
  hidden: z.boolean().optional().default(false),
  hideFromWorkPage: z.boolean().optional().default(false),
  techStack: z.array(z.string().trim().min(1)).default([]),
  collaborators: z.array(collaboratorSchema).default([]),
  links: z.object({
    github: z.string().trim().optional(),
    liveDemo: z.string().trim().optional(),
    stack: z.array(z.object({
      title: z.string().trim().min(1),
      url: z.string().trim().min(1),
    })).optional(),
    press: z.array(z.string().trim()).optional(),
  }).default({}),
  media: z.object({
    heroImage: z.string().trim().optional().default(''),
    gallery: z.array(z.object({
      src: z.string().trim().min(1),
      caption: z.string().trim().optional(),
      type: z.enum(['image', 'video', 'embed']).optional(),
    })).default([]),
    featured: z.array(z.object({
      src: z.string().trim().min(1),
      caption: z.string().trim().optional(),
      type: z.enum(['image', 'video', 'embed']).optional(),
    })).default([]),
  }),
  description: z.string().min(1),
});

export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveCategoryDefinitions(definitions) {
  if (!definitions || typeof definitions !== 'object' || Array.isArray(definitions)) {
    return CATEGORY_DEFINITIONS;
  }
  return definitions;
}

export function categoryOptionsFromDefinitions(definitions = CATEGORY_DEFINITIONS) {
  const resolved = resolveCategoryDefinitions(definitions);
  return Object.values(resolved);
}

export function isKnownCategory(value, definitions = CATEGORY_DEFINITIONS) {
  const resolved = resolveCategoryDefinitions(definitions);
  return Object.prototype.hasOwnProperty.call(resolved, String(value || '').trim());
}

export function normalizeCategory(value, definitions = CATEGORY_DEFINITIONS) {
  const normalized = slugify(value || DEFAULT_CATEGORY);
  if (isKnownCategory(normalized, definitions)) {
    return normalized;
  }
  return DEFAULT_CATEGORY;
}

export function isLocationOptionalCategory(value) {
  const category = slugify(value || '');
  if (!category) return false;
  if (LOCATION_OPTIONAL_CATEGORY_IDS.has(category)) return true;
  return category.endsWith('-film');
}

export function isLocationRequired(value) {
  return !isLocationOptionalCategory(value);
}

export function getCategoryDefinition(value, definitions = CATEGORY_DEFINITIONS) {
  const resolved = resolveCategoryDefinitions(definitions);
  const category = normalizeCategory(value, resolved);
  return resolved[category] || resolved[DEFAULT_CATEGORY] || CATEGORY_DEFINITIONS[DEFAULT_CATEGORY];
}

export function normalizeCategoryMeta(values = {}) {
  const next = {};
  if (!values || typeof values !== 'object') return next;
  for (const [rawKey, rawValue] of Object.entries(values)) {
    const key = String(rawKey || '').trim();
    const value = String(rawValue || '').trim();
    if (!key || !value) continue;
    next[key] = value;
  }
  return next;
}

export function buildCategoryEntryLines(category, categoryMeta = {}, definitions = CATEGORY_DEFINITIONS) {
  const definition = getCategoryDefinition(category, definitions);
  const meta = normalizeCategoryMeta(categoryMeta);
  return definition.detailFields
    .map((field) => {
      const value = String(meta[field.key] || '').trim();
      if (!value) return '';
      return `${field.label}: ${value}`;
    })
    .filter(Boolean);
}

export function requiredCategoryKeys(category, definitions = CATEGORY_DEFINITIONS) {
  const definition = getCategoryDefinition(category, definitions);
  return definition.detailFields
    .filter((field) => field.required)
    .map((field) => field.key);
}

export function splitCsv(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeTag(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function normalizeTagList(values = []) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const normalized = normalizeTag(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function parseCollaboratorsCsv(value) {
  return splitCsv(value).map((item) => {
    const [nameRaw, roleRaw] = item.split(':');
    const name = String(nameRaw || '').trim();
    const role = String(roleRaw || '').trim();
    return role ? { name, role } : { name };
  }).filter((entry) => entry.name);
}

export function normalizeYear(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text;
}

export function isYearValid(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{4}$/.test(text)) return false;
  const numeric = Number(text);
  return numeric >= 1900 && numeric <= 2100;
}

export function normalizeMonth(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{1,2}$/.test(text)) return '';
  const numeric = Number(text);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 12) return '';
  return String(numeric).padStart(2, '0');
}

export function isMonthValid(value) {
  return Boolean(normalizeMonth(value));
}

export function isHttpUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeHttpUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (isHttpUrl(raw)) return raw;
  if (/^[a-z]+:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}
