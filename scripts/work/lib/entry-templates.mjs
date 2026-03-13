import fs from 'node:fs/promises';
import path from 'node:path';
import { CATEGORY_DEFINITIONS, DEFAULT_CATEGORY, slugify } from './schema.mjs';

export const ENTRY_TEMPLATE_RELATIVE_PATH = path.join('src', 'content', 'projects', '_entry-templates.json');

function normalizeDetailField(rawField) {
  if (!rawField || typeof rawField !== 'object') return null;
  const rawLabel = String(rawField.label || '').trim();
  const label = rawLabel || String(rawField.key || '').trim();
  if (!label) return null;
  const key = slugify(rawField.key || label);
  if (!key) return null;
  return {
    key,
    label,
    required: Boolean(rawField.required),
  };
}

function normalizeCategoryTemplate(rawTemplate, fallbackId = '') {
  if (!rawTemplate || typeof rawTemplate !== 'object') return null;
  const id = slugify(rawTemplate.id || fallbackId);
  if (!id) return null;
  const label = String(rawTemplate.label || '').trim() || id;
  const detailFields = Array.isArray(rawTemplate.detailFields)
    ? rawTemplate.detailFields
      .map((field) => normalizeDetailField(field))
      .filter(Boolean)
    : [];
  return {
    id,
    label,
    detailFields,
  };
}

function withDefaults(definitions = {}) {
  const base = Object.fromEntries(
    Object.entries(CATEGORY_DEFINITIONS).map(([id, template]) => [
      id,
      {
        id: template.id,
        label: template.label,
        detailFields: Array.isArray(template.detailFields)
          ? template.detailFields.map((field) => ({
            key: String(field.key || '').trim(),
            label: String(field.label || '').trim(),
            required: Boolean(field.required),
          })).filter((field) => field.key && field.label)
          : [],
      },
    ]),
  );

  for (const [id, template] of Object.entries(definitions)) {
    base[id] = template;
  }

  if (!base[DEFAULT_CATEGORY]) {
    const defaultTemplate = CATEGORY_DEFINITIONS[DEFAULT_CATEGORY];
    base[DEFAULT_CATEGORY] = {
      id: DEFAULT_CATEGORY,
      label: String(defaultTemplate?.label || DEFAULT_CATEGORY),
      detailFields: Array.isArray(defaultTemplate?.detailFields)
        ? defaultTemplate.detailFields
        : [],
    };
  }

  return base;
}

export function normalizeCategoryDefinitions(raw) {
  const out = {};
  if (Array.isArray(raw?.categories)) {
    for (const template of raw.categories) {
      const normalized = normalizeCategoryTemplate(template);
      if (!normalized) continue;
      out[normalized.id] = normalized;
    }
    return withDefaults(out);
  }

  if (raw?.categories && typeof raw.categories === 'object') {
    for (const [id, template] of Object.entries(raw.categories)) {
      const normalized = normalizeCategoryTemplate(template, id);
      if (!normalized) continue;
      out[normalized.id] = normalized;
    }
    return withDefaults(out);
  }

  if (raw && typeof raw === 'object') {
    for (const [id, template] of Object.entries(raw)) {
      const normalized = normalizeCategoryTemplate(template, id);
      if (!normalized) continue;
      out[normalized.id] = normalized;
    }
    return withDefaults(out);
  }

  return withDefaults({});
}

function toSerializable(definitions = {}) {
  const categories = Object.values(definitions)
    .map((template) => ({
      id: String(template.id || '').trim(),
      label: String(template.label || '').trim(),
      detailFields: Array.isArray(template.detailFields)
        ? template.detailFields
          .map((field) => normalizeDetailField(field))
          .filter(Boolean)
        : [],
    }))
    .filter((template) => template.id)
    .sort((a, b) => a.id.localeCompare(b.id));

  return { categories };
}

export async function loadCategoryDefinitions({ root = process.cwd() } = {}) {
  const templatePath = path.resolve(root, ENTRY_TEMPLATE_RELATIVE_PATH);
  try {
    const raw = await fs.readFile(templatePath, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeCategoryDefinitions(parsed);
  } catch {
    return normalizeCategoryDefinitions({});
  }
}

export async function saveCategoryDefinitions({ definitions, root = process.cwd(), dryRun = false } = {}) {
  const normalized = normalizeCategoryDefinitions(definitions);
  const templatePath = path.resolve(root, ENTRY_TEMPLATE_RELATIVE_PATH);
  if (!dryRun) {
    await fs.mkdir(path.dirname(templatePath), { recursive: true });
    await fs.writeFile(templatePath, `${JSON.stringify(toSerializable(normalized), null, 2)}\n`, 'utf8');
  }
  return {
    definitions: normalized,
    templatePath,
  };
}
