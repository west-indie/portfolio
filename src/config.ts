import type { ProjectLayout } from './types/project';

export const SITE_TITLE = 'Leo Nunez';
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xpqjkrde';

type DisciplineDefinition = {
  token: string;
  label: string;
};

type CategoryDetailField = {
  key: string;
  label: string;
  required: boolean;
};

type CategoryTemplate = {
  id: string;
  label: string;
  detailFields: CategoryDetailField[];
};

type WorkPageSettings = {
  hiddenDisciplineTokens: string[];
  hiddenProjectGroupTokens: string[];
  chipOrder: string[];
  showDisciplineFilter?: boolean;
  showProjectGroupChips?: boolean;
};

export type CategoryDetailEntry = {
  label: string;
  value: string;
};

type LayoutDetailField = {
  key: string;
  label: string;
};

const DEFAULT_WORK_PAGE_SETTINGS: WorkPageSettings = {
  hiddenDisciplineTokens: [],
  hiddenProjectGroupTokens: [],
  chipOrder: [],
  showProjectGroupChips: true,
};

const FALLBACK_DISCIPLINE_DEFINITIONS: DisciplineDefinition[] = [
  { token: 'composition', label: 'Composition' },
  { token: 'performance', label: 'Performance' },
  { token: 'music-comp', label: 'Music Composition' },
  { token: 'sound-design', label: 'Sound Design' },
  { token: 'live-electronics', label: 'Live Electronics' },
  { token: 'short-film', label: 'Short Film' },
  { token: 'lighting-production', label: 'Lighting & Production' },
  { token: 'interactive-media', label: 'Interactive Media' },
  { token: 'theatre', label: 'Theatre' },
  { token: 'code-programs', label: 'Code Programs' },
];

function normalizeDisciplineToken(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeDisciplineTokenList(values: unknown) {
  if (!Array.isArray(values)) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  values.forEach((value) => {
    const token = normalizeDisciplineToken(value);
    if (!token || seen.has(token)) return;
    seen.add(token);
    out.push(token);
  });

  return out;
}

export const projectGroupDefinitions = Object.freeze([
  { token: 'codingv1', label: 'Programs and Coding' },
  { token: 'theatre_v2', label: 'Performance' },
  { token: 'film_v1', label: 'Film' },
]);

const projectGroupTokenSet = new Set(projectGroupDefinitions.map((item) => item.token));
const WORK_CHIP_DISCIPLINE_PREFIX = 'discipline:';
const WORK_CHIP_GROUP_PREFIX = 'group:';

function normalizeProjectGroupToken(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'codingv1' || raw === 'coding_v1' || raw === 'coding-v1') {
    return 'codingv1';
  }

  const normalized = raw.replace(/[\s-]+/g, '_');
  if (normalized === 'theatre_v1' || normalized === 'theatre_v2') {
    return 'theatre_v2';
  }
  if (normalized === 'film_v1') {
    return 'film_v1';
  }

  return '';
}

function normalizeProjectGroupTokenList(values: unknown) {
  if (!Array.isArray(values)) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  values.forEach((value) => {
    const token = normalizeProjectGroupToken(value);
    if (!token || seen.has(token)) return;
    seen.add(token);
    out.push(token);
  });

  return out;
}

function normalizeWorkChipId(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  if (raw.startsWith(WORK_CHIP_DISCIPLINE_PREFIX)) {
    const token = normalizeDisciplineToken(raw.slice(WORK_CHIP_DISCIPLINE_PREFIX.length));
    return token ? `${WORK_CHIP_DISCIPLINE_PREFIX}${token}` : '';
  }

  if (raw.startsWith(WORK_CHIP_GROUP_PREFIX)) {
    const token = normalizeProjectGroupToken(raw.slice(WORK_CHIP_GROUP_PREFIX.length));
    return token ? `${WORK_CHIP_GROUP_PREFIX}${token}` : '';
  }

  const groupToken = normalizeProjectGroupToken(raw);
  if (groupToken) {
    return `${WORK_CHIP_GROUP_PREFIX}${groupToken}`;
  }

  const disciplineToken = normalizeDisciplineToken(raw);
  if (disciplineToken) {
    return `${WORK_CHIP_DISCIPLINE_PREFIX}${disciplineToken}`;
  }

  return '';
}

function normalizeWorkChipIdList(values: unknown) {
  if (!Array.isArray(values)) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  values.forEach((value) => {
    const chipId = normalizeWorkChipId(value);
    if (!chipId || seen.has(chipId)) return;
    seen.add(chipId);
    out.push(chipId);
  });

  return out;
}

function labelFromToken(token: string) {
  return String(token || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeDisciplineDefinition(value: unknown): DisciplineDefinition | null {
  if (typeof value === 'string') {
    const token = normalizeDisciplineToken(value);
    if (!token) return null;
    const fallback = FALLBACK_DISCIPLINE_DEFINITIONS.find((item) => item.token === token);
    const label = fallback?.label || labelFromToken(token);
    return {
      token,
      label,
    };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const token = normalizeDisciplineToken(source.token || source.key || source.id || source.value || '');
  if (!token) return null;

  const fallback = FALLBACK_DISCIPLINE_DEFINITIONS.find((item) => item.token === token);
  const labelRaw = String(source.label || source.displayLabel || source.name || '').trim();
  const label = labelRaw || fallback?.label || labelFromToken(token);

  return {
    token,
    label,
  };
}

function normalizeDisciplineDefinitionList(values: unknown): DisciplineDefinition[] {
  if (!Array.isArray(values)) return [];

  const out: DisciplineDefinition[] = [];
  const indexByToken = new Map<string, number>();

  values.forEach((value) => {
    const normalized = normalizeDisciplineDefinition(value);
    if (!normalized) return;

    const existingIndex = indexByToken.get(normalized.token);
    if (existingIndex == null) {
      indexByToken.set(normalized.token, out.length);
      out.push(normalized);
      return;
    }

    out[existingIndex] = normalized;
  });

  return out;
}

function normalizeCategoryDetailField(value: unknown): CategoryDetailField | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const key = normalizeCategoryToken(source.key || source.id || source.name || source.label || '');
  if (!key) return null;
  const label = String(source.label || source.name || '').trim() || labelFromToken(key);
  return {
    key,
    label,
    required: source.required === true,
  };
}

function normalizeCategoryTemplate(value: unknown): CategoryTemplate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const id = normalizeCategoryToken(source.id || source.category || source.key || source.label || '');
  if (!id) return null;
  const label = String(source.label || source.name || '').trim() || labelFromToken(id);
  const detailFields = Array.isArray(source.detailFields)
    ? source.detailFields
      .map((field) => normalizeCategoryDetailField(field))
      .filter((field): field is CategoryDetailField => Boolean(field))
    : [];
  return {
    id,
    label,
    detailFields,
  };
}

function normalizeWorkPageSettings(value: unknown): WorkPageSettings {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  const hiddenDisciplineTokens = normalizeDisciplineTokenList(source.hiddenDisciplineTokens);
  let hiddenProjectGroupTokens = normalizeProjectGroupTokenList(source.hiddenProjectGroupTokens);
  const chipOrder = normalizeWorkChipIdList(source.chipOrder);
  const legacyHideAll = source.showDisciplineFilter === false;
  const showProjectGroupChips = source.showProjectGroupChips !== false;
  if (!showProjectGroupChips && hiddenProjectGroupTokens.length < 1) {
    hiddenProjectGroupTokens = [...projectGroupTokenSet];
  }

  return {
    hiddenDisciplineTokens,
    hiddenProjectGroupTokens,
    chipOrder,
    showProjectGroupChips,
    ...(legacyHideAll ? { showDisciplineFilter: false } : {}),
  };
}

function loadCategoryTemplatesFromRegistry(): CategoryTemplate[] {
  const modules = import.meta.glob('./content/projects/_entry-templates.json', { eager: true, import: 'default' });
  const rawRegistry = Object.values(modules)[0] as unknown;
  if (!rawRegistry || typeof rawRegistry !== 'object') return [];

  const source = rawRegistry as Record<string, unknown>;
  if (!Array.isArray(source.categories)) return [];

  return source.categories
    .map((template) => normalizeCategoryTemplate(template))
    .filter((template): template is CategoryTemplate => Boolean(template));
}

const categoryDetailFieldsByCategory = new Map<string, CategoryDetailField[]>(
  loadCategoryTemplatesFromRegistry().map((template) => [template.id, template.detailFields] as const),
);

function loadWorkPageSettingsFromRegistry(): WorkPageSettings {
  const modules = import.meta.glob('./content/projects/_work-page-settings.json', { eager: true, import: 'default' });
  const rawRegistry = Object.values(modules)[0] as unknown;
  if (!rawRegistry || typeof rawRegistry !== 'object') return { ...DEFAULT_WORK_PAGE_SETTINGS };

  return normalizeWorkPageSettings(rawRegistry);
}

function loadDisciplineDefinitionsFromRegistry(): DisciplineDefinition[] {
  const modules = import.meta.glob('./content/projects/_disciplines.json', { eager: true, import: 'default' });
  const rawRegistry = Object.values(modules)[0] as unknown;
  if (!rawRegistry || typeof rawRegistry !== 'object') return [];

  const source = rawRegistry as Record<string, unknown>;
  return normalizeDisciplineDefinitionList(source.disciplines);
}

function resolveDisciplineDefinitions(): DisciplineDefinition[] {
  const fromRegistry = loadDisciplineDefinitionsFromRegistry();
  if (fromRegistry.length < 1) return FALLBACK_DISCIPLINE_DEFINITIONS;

  const fallbackByToken = new Map(FALLBACK_DISCIPLINE_DEFINITIONS.map((item) => [item.token, item] as const));
  return fromRegistry.map((item) => {
    const fallback = fallbackByToken.get(item.token);
    return {
      token: item.token,
      label: item.label || fallback?.label || labelFromToken(item.token),
    };
  });
}

export const workPageSettings: WorkPageSettings = loadWorkPageSettingsFromRegistry();

export const disciplineDefinitions: DisciplineDefinition[] = resolveDisciplineDefinitions();

export const disciplineLabels: Record<string, string> = {
  all: 'All',
  ...Object.fromEntries(disciplineDefinitions.map((item) => [item.token, item.label])),
};

export const projectGroupLabels: Record<string, string> = Object.fromEntries(
  projectGroupDefinitions.map((item) => [item.token, item.label]),
);

export function formatProjectGroupLabel(layout: unknown) {
  const normalized = normalizeProjectGroupToken(layout);
  if (!normalized) return '';
  return projectGroupLabels[normalized] ?? labelFromToken(normalized);
}

export function formatDisciplineLabel(token: string) {
  const normalized = normalizeDisciplineToken(token);
  if (!normalized) return '';
  return disciplineLabels[normalized] ?? labelFromToken(normalized);
}

export const categoryLabels: Record<string, string> = {
  performance: 'Performance',
  theatre: 'Theatre',
  film: 'Film',
  'short-film': 'Short Film',
  'feature-film': 'Feature Film',
  interactive: 'Interactive',
  installation: 'Installation',
  tooling: 'Tooling',
  program: 'Program',
};

function normalizeCategoryToken(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatCategoryLabel(category: unknown) {
  const normalized = normalizeCategoryToken(category);
  if (!normalized) return '';
  return categoryLabels[normalized] ?? labelFromToken(normalized);
}

function normalizeStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, rawValue]) => {
    const normalizedKey = normalizeCategoryToken(key);
    if (!normalizedKey) return acc;
    const normalizedValue = String(rawValue || '').trim();
    if (!normalizedValue) return acc;
    acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});
}

function normalizeCategoryEntryLines(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

export function resolveCategoryDetailEntries(
  category: unknown,
  categoryMeta: unknown,
  entryLines: unknown,
): CategoryDetailEntry[] {
  const normalizedCategory = normalizeCategoryToken(category);
  const detailFields = normalizedCategory
    ? categoryDetailFieldsByCategory.get(normalizedCategory) ?? []
    : [];
  const normalizedMeta = normalizeStringMap(categoryMeta);
  const normalizedLines = normalizeCategoryEntryLines(entryLines);

  if (detailFields.length < 1) return [];

  return detailFields
    .map((field, index) => {
      const value = normalizedMeta[field.key] || normalizedLines[index] || '';
      if (!value) return null;
      return {
        label: field.label || labelFromToken(field.key),
        value,
      };
    })
    .filter((entry): entry is CategoryDetailEntry => Boolean(entry));
}

const LAYOUT_DETAIL_FIELDS: Record<ProjectLayout, LayoutDetailField[]> = {
  theatre_v1: [
    { key: 'venue', label: 'Venue' },
    { key: 'rundates', label: 'Run Dates' },
    { key: 'productiontype', label: 'Production Type' },
  ],
  theatre_v2: [
    { key: 'venue', label: 'Venue' },
    { key: 'rundates', label: 'Run Dates' },
    { key: 'productiontype', label: 'Production Type' },
  ],
  film_v1: [
    { key: 'duration', label: 'Duration' },
    { key: 'festivalstatus', label: 'Festival Status' },
  ],
  general_v1: [],
  codingv1: [],
};

export function resolveLayoutDetailEntries(
  layout: unknown,
  categoryMeta: unknown,
  entryLines: unknown,
): CategoryDetailEntry[] {
  const normalizedLayout = String(layout || '').trim().toLowerCase() as ProjectLayout;
  const detailFields = LAYOUT_DETAIL_FIELDS[normalizedLayout] ?? [];
  const normalizedMeta = normalizeStringMap(categoryMeta);
  const normalizedLines = normalizeCategoryEntryLines(entryLines);

  if (detailFields.length < 1) return [];

  return detailFields
    .map((field, index) => {
      const value = normalizedMeta[field.key] || normalizedLines[index] || '';
      if (!value) return null;
      return {
        label: field.label,
        value,
      };
    })
    .filter((entry): entry is CategoryDetailEntry => Boolean(entry));
}

export const disciplinesOrdered = [
  'all',
  ...disciplineDefinitions.map((item) => item.token),
];
