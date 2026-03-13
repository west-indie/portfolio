import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, render, useApp, useInput, useStdout } from 'ink';
import {
  buildCategoryEntryLines,
  CATEGORY_DEFINITIONS,
  categoryOptionsFromDefinitions,
  DEFAULT_CATEGORY,
  getCategoryDefinition,
  MAX_DISCIPLINES,
  isKnownCategory,
  isLocationRequired,
  isYearValid,
  normalizeCategory,
  normalizeCategoryMeta,
  normalizeHttpUrl,
  normalizeTagList,
  parseCollaboratorsCsv,
  requiredCategoryKeys,
  slugify,
  splitCsv,
} from '../lib/schema.mjs';

const BASE_STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'classification', label: 'Category + Tags' },
  { id: 'basics', label: 'Role / Location / Disciplines' },
  { id: 'details', label: 'Details' },
  { id: 'media', label: 'Media Import' },
  { id: 'description', label: 'Description' },
  { id: 'summary', label: 'Review & Confirm' },
];

function currentYear() {
  return String(new Date().getFullYear());
}

function categoryOptionLabel(index, option) {
  return `${index + 1}. ${option.label} (${option.id})`;
}

function sanitizeCategoryMeta(category, categoryMeta = {}, categoryDefinitions = CATEGORY_DEFINITIONS) {
  const definition = getCategoryDefinition(category, categoryDefinitions);
  const normalized = normalizeCategoryMeta(categoryMeta);
  const allowed = new Set(definition.detailFields.map((field) => field.key));
  const next = {};
  for (const [key, value] of Object.entries(normalized)) {
    if (!allowed.has(key)) continue;
    next[key] = value;
  }
  return next;
}

function normalizeLinkStackArray(value = []) {
  return Array.isArray(value)
    ? value
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          const raw = String(item || '').trim();
          if (!raw) return null;
          if (/^https?:\/\//i.test(raw)) {
            return {
              title: `Link ${index + 1}`,
              url: raw,
            };
          }
          const splitIndex = raw.indexOf(':');
          if (splitIndex <= 0) return null;
          const title = raw.slice(0, splitIndex).trim();
          const url = raw.slice(splitIndex + 1).trim();
          if (!title || !url) return null;
          return { title, url };
        }

        const title = String(item.title || '').trim();
        const url = String(item.url || '').trim();
        if (!title || !url) return null;
        return { title, url };
      })
      .filter(Boolean)
    : [];
}

function parseLinkStackText(value) {
  return splitCsv(value)
    .map((line) => {
      const splitIndex = String(line || '').indexOf(':');
      if (splitIndex <= 0) return null;
      const title = String(line || '').slice(0, splitIndex).trim();
      const url = normalizeHttpUrl(String(line || '').slice(splitIndex + 1).trim());
      if (!title || !url) return null;
      return { title, url };
    })
    .filter(Boolean);
}

function linkStackToText(value = []) {
  return normalizeLinkStackArray(value)
    .map((item) => `${item.title}:${item.url}`)
    .join(', ');
}

function defaultForm(initialInput = null, categoryDefinitions = CATEGORY_DEFINITIONS) {
  const empty = {
    year: currentYear(),
    title: '',
    subtitle: '',
    slug: '',
    slugTouched: false,
    category: DEFAULT_CATEGORY,
    tags: '',
    categoryMeta: {},
    role: '',
    location: '',
    disciplines: '',
    techStack: '',
    collaborators: '',
    github: '',
    liveDemo: '',
    linkStack: '',
    heroImage: '',
    gallery: '',
    galleryMeta: [],
    description: '',
  };

  const parsed = initialInput && typeof initialInput === 'object'
    ? initialInput
    : null;
  if (!parsed) return empty;

  const category = normalizeCategory(parsed.category || DEFAULT_CATEGORY, categoryDefinitions);
  const categoryMeta = sanitizeCategoryMeta(category, parsed.categoryMeta || {}, categoryDefinitions);
  const disciplines = Array.isArray(parsed.disciplines)
    ? parsed.disciplines.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  const techStack = Array.isArray(parsed.techStack)
    ? parsed.techStack.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  const collaborators = Array.isArray(parsed.collaborators)
    ? parsed.collaborators
      .map((item) => {
        const name = String(item?.name || '').trim();
        if (!name) return '';
        const role = String(item?.role || '').trim();
        return role ? `${name}:${role}` : name;
      })
      .filter(Boolean)
    : [];

  const links = parsed.links && typeof parsed.links === 'object'
    ? parsed.links
    : {};
  const stack = normalizeLinkStackArray(links.stack);
  const fallbackStack = stack.length > 0
    ? stack
    : (Array.isArray(links.press)
      ? links.press.map((url, index) => ({
        title: links.press.length > 1 ? `Press ${index + 1}` : 'Press',
        url: String(url || '').trim(),
      })).filter((item) => item.url)
      : []);

  const media = parsed.media && typeof parsed.media === 'object'
    ? parsed.media
    : {};
  const galleryMeta = Array.isArray(media.gallery)
    ? media.gallery
      .map((item) => {
        const src = String(item?.src || '').trim();
        if (!src) return null;
        const type = String(item?.type || '').trim();
        const caption = String(item?.caption || '').trim();
        return {
          src,
          ...(type ? { type } : {}),
          ...(caption ? { caption } : {}),
        };
      })
      .filter(Boolean)
    : [];

  return {
    year: String(parsed.year ?? currentYear()).trim() || currentYear(),
    title: String(parsed.title || '').trim(),
    subtitle: String(parsed.subtitle || '').trim(),
    slug: String(parsed.slug || '').trim(),
    slugTouched: Boolean(String(parsed.slug || '').trim()),
    category,
    tags: normalizeTagList(parsed.tags || []).join(', '),
    categoryMeta,
    role: String(parsed.role || '').trim(),
    location: String(parsed.location || '').trim(),
    disciplines: disciplines.join(', '),
    techStack: techStack.join(', '),
    collaborators: collaborators.join(', '),
    github: String(links.github || '').trim(),
    liveDemo: String(links.liveDemo || '').trim(),
    linkStack: linkStackToText(fallbackStack),
    heroImage: String(media.heroImage || '').trim(),
    gallery: galleryMeta.map((item) => item.src).join('\n'),
    galleryMeta,
    description: String(parsed.description || ''),
  };
}

function stepsForForm(form, categoryDefinitions = CATEGORY_DEFINITIONS) {
  const options = categoryOptionsFromDefinitions(categoryDefinitions);
  const category = normalizeCategory(form?.category || DEFAULT_CATEGORY, categoryDefinitions);
  const definition = getCategoryDefinition(category, categoryDefinitions);
  const categoryFields = definition.detailFields.map((field) => ({
    key: `categoryMeta.${field.key}`,
    label: `${field.label}${field.required ? ' *' : ''}`,
  }));

  return BASE_STEPS.map((step) => {
    if (step.id === 'identity') {
      return {
        ...step,
        fields: [
          { key: 'year', label: 'Year' },
          { key: 'title', label: 'Title' },
          { key: 'subtitle', label: 'Subtitle' },
          { key: 'slug', label: 'Slug' },
        ],
      };
    }

    if (step.id === 'classification') {
      return {
        ...step,
        fields: [
          {
            key: 'category',
            label: `Category (${options.map((option) => option.id).join(', ')})`,
          },
          { key: 'tags', label: 'Tags (comma/newline; numbers toggle quick tags)' },
          ...categoryFields,
        ],
      };
    }

    if (step.id === 'basics') {
      return {
        ...step,
        fields: [
          { key: 'role', label: 'Role' },
          { key: 'location', label: 'Location' },
          { key: 'disciplines', label: 'Disciplines (comma-separated)' },
        ],
      };
    }

    if (step.id === 'details') {
      return {
        ...step,
        fields: [
          { key: 'techStack', label: 'Tech stack (comma-separated)' },
          { key: 'collaborators', label: 'Collaborators (Name:Role, ...)' },
          { key: 'github', label: 'GitHub URL (optional)' },
          { key: 'liveDemo', label: 'Live demo URL (optional)' },
          { key: 'linkStack', label: 'Link stack (Title:URL, ...)' },
        ],
      };
    }

    if (step.id === 'media') {
      return {
        ...step,
        fields: [
          { key: 'heroImage', label: 'Hero image path/URL' },
          { key: 'gallery', label: 'Gallery paths/URLs (comma or newline separated)' },
        ],
      };
    }

    if (step.id === 'description') {
      return {
        ...step,
        fields: [
          { key: 'description', label: 'Description (Enter = newline)', multiline: true },
        ],
      };
    }

    return {
      ...step,
      fields: [],
    };
  });
}

function readFieldValue(form, key) {
  if (!key.includes('.')) return form[key];
  return key.split('.').reduce((node, token) => {
    if (!node || typeof node !== 'object') return '';
    return node[token];
  }, form);
}

function setFieldValue(current, key, value) {
  if (!key.includes('.')) {
    return { ...current, [key]: value };
  }

  const tokens = key.split('.');
  const next = { ...current };
  let cursor = next;
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const token = tokens[index];
    const source = cursor[token] && typeof cursor[token] === 'object' ? cursor[token] : {};
    cursor[token] = { ...source };
    cursor = cursor[token];
  }
  cursor[tokens[tokens.length - 1]] = value;
  return next;
}

function tagsFromText(value) {
  return normalizeTagList(splitCsv(value));
}

function toggleTagText(value, tag) {
  const target = String(tag || '').trim();
  if (!target) return value;
  const tags = tagsFromText(value);
  const index = tags.indexOf(target);
  if (index >= 0) {
    tags.splice(index, 1);
  } else {
    tags.push(target);
  }
  return tags.join(', ');
}

function buildInput(form, categoryDefinitions = CATEGORY_DEFINITIONS) {
  const category = normalizeCategory(form.category || DEFAULT_CATEGORY, categoryDefinitions);
  const categoryMeta = sanitizeCategoryMeta(category, form.categoryMeta || {}, categoryDefinitions);
  const linkStack = parseLinkStackText(form.linkStack);
  const galleryBySrc = new Map(
    (Array.isArray(form.galleryMeta) ? form.galleryMeta : [])
      .map((item) => {
        const src = String(item?.src || '').trim();
        if (!src) return null;
        const type = String(item?.type || '').trim();
        const caption = String(item?.caption || '').trim();
        return {
          src,
          type: ['image', 'video', 'embed'].includes(type) ? type : '',
          caption,
        };
      })
      .filter(Boolean)
      .map((item) => [item.src, item]),
  );
  const gallery = splitCsv(form.gallery).map((rawSrc) => {
    const src = String(rawSrc || '').trim();
    const prior = galleryBySrc.get(src);
    if (!prior) return { src };
    return {
      src,
      ...(prior.type ? { type: prior.type } : {}),
      ...(prior.caption ? { caption: prior.caption } : {}),
    };
  });

  return {
    year: form.year,
    title: form.title,
    subtitle: form.subtitle,
    slug: form.slug,
    category,
    tags: tagsFromText(form.tags),
    categoryMeta,
    role: form.role,
    location: form.location,
    disciplines: splitCsv(form.disciplines),
    techStack: splitCsv(form.techStack),
    collaborators: parseCollaboratorsCsv(form.collaborators),
    links: {
      ...(form.github ? { github: normalizeHttpUrl(form.github.trim()) } : {}),
      ...(form.liveDemo ? { liveDemo: normalizeHttpUrl(form.liveDemo.trim()) } : {}),
      ...(linkStack.length > 0 ? { stack: linkStack } : {}),
    },
    media: {
      heroImage: form.heroImage.trim(),
      gallery,
    },
    description: form.description,
  };
}

function validateStep(stepId, form, categoryDefinitions = CATEGORY_DEFINITIONS) {
  const options = categoryOptionsFromDefinitions(categoryDefinitions);
  if (stepId === 'identity') {
    if (!String(form.year || '').trim()) return 'Year is required.';
    if (!isYearValid(form.year)) return 'Year must be 4 digits between 1900 and 2100.';
    if (!String(form.title || '').trim()) return 'Title is required.';
    if (!String(form.subtitle || '').trim()) return 'Subtitle is required.';
    if (!String(form.slug || '').trim()) return 'Slug is required.';
  }

  if (stepId === 'classification') {
    const category = String(form.category || '').trim();
    if (!category) return 'Category is required.';
    if (!isKnownCategory(category, categoryDefinitions)) {
      return `Unknown category "${category}". Use one of: ${options.map((option) => option.id).join(', ')}.`;
    }
    const requiredKeys = requiredCategoryKeys(category, categoryDefinitions);
    const categoryMeta = sanitizeCategoryMeta(category, form.categoryMeta || {}, categoryDefinitions);
    for (const key of requiredKeys) {
      if (!String(categoryMeta[key] || '').trim()) {
        const definition = getCategoryDefinition(category, categoryDefinitions);
        const field = definition.detailFields.find((item) => item.key === key);
        return `${field?.label || key} is required for ${definition.label}.`;
      }
    }
  }

  if (stepId === 'basics') {
    if (!String(form.role || '').trim()) return 'Role is required.';
    const category = normalizeCategory(form.category || DEFAULT_CATEGORY, categoryDefinitions);
    if (isLocationRequired(category) && !String(form.location || '').trim()) return 'Location is required.';
    const disciplines = splitCsv(form.disciplines);
    if (disciplines.length < 1) return 'At least one discipline is required.';
    if (disciplines.length > MAX_DISCIPLINES) return `Choose at most ${MAX_DISCIPLINES} disciplines.`;
  }

  if (stepId === 'media') {
    if (!String(form.heroImage || '').trim()) return 'Hero image path is required.';
  }

  if (stepId === 'description') {
    if (!String(form.description || '').trim()) return 'Description is required.';
  }

  return null;
}

function formatSubmitError(error) {
  if (!error) return 'Unknown error.';
  if (Array.isArray(error.issues) && error.issues.length > 0) {
    return error.issues
      .map((issue) => {
        const path = Array.isArray(issue.path) && issue.path.length > 0 ? issue.path.join('.') : 'input';
        return `${path}: ${issue.message}`;
      })
      .join(' | ');
  }
  return String(error.message || error);
}

function applyTextEdit(value, input, key, { multiline = false } = {}) {
  const current = String(value || '');
  if (key.leftArrow || key.rightArrow || input === '\u001B[D' || input === '\u001B[C') {
    return current;
  }
  if (key.backspace || input === '\u007F' || key.delete) {
    return current.slice(0, -1);
  }
  if (multiline && key.return) {
    return `${current}\n`;
  }
  if (input && !key.ctrl && !key.meta && input !== '\r' && input !== '\n' && input !== '\t') {
    return `${current}${input}`;
  }
  return current;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pad(value, width) {
  const text = String(value || '');
  if (text.length >= width) return text.slice(0, width);
  return `${text}${' '.repeat(width - text.length)}`;
}

function summarizeText(value, limit = 72) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '(none)';
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3)).trim()}...`;
}

function summarizeList(values, { maxItems = 3, empty = '(none)' } = {}) {
  const items = Array.isArray(values)
    ? values.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  if (items.length < 1) return empty;
  const head = items.slice(0, maxItems);
  const suffix = items.length > head.length ? ` +${items.length - head.length} more` : '';
  return summarizeText(`${head.join(', ')}${suffix}`);
}

function resolveAffectedArea(fieldKey) {
  const key = String(fieldKey || '').trim();
  if (!key) return 'Entry card + detail page (overall)';
  if (['year', 'title', 'subtitle', 'slug'].includes(key)) return 'Work card header + detail header';
  if (key === 'category' || key === 'tags' || key.startsWith('categoryMeta.')) {
    return 'Category/tags chips + detail header entry lines';
  }
  if (['role', 'location', 'disciplines'].includes(key)) return 'Detail header + sidebar chips';
  if (['techStack', 'collaborators', 'github', 'liveDemo', 'linkStack'].includes(key)) return 'Detail sidebar blocks';
  if (['heroImage', 'gallery'].includes(key)) return 'Card image + detail hero/media gallery';
  if (key === 'description') return 'Detail page body content';
  return 'Detail page';
}

function buildLiveSnapshotLines({
  input,
  fieldKey = '',
  fieldLabel = 'Summary',
  categoryDefinitions = CATEGORY_DEFINITIONS,
}) {
  const data = input && typeof input === 'object' ? input : {};
  const category = String(data.category || DEFAULT_CATEGORY).trim() || DEFAULT_CATEGORY;
  const entryLines = buildCategoryEntryLines(category, data.categoryMeta || {}, categoryDefinitions);
  const disciplines = Array.isArray(data.disciplines) ? data.disciplines : [];
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const techStack = Array.isArray(data.techStack) ? data.techStack : [];
  const collaborators = Array.isArray(data.collaborators)
    ? data.collaborators.map((item) => {
      const name = String(item?.name || '').trim();
      if (!name) return '';
      const role = String(item?.role || '').trim();
      return role ? `${name}:${role}` : name;
    }).filter(Boolean)
    : [];
  const links = data.links && typeof data.links === 'object' ? data.links : {};
  const stackLinks = Array.isArray(links.stack)
    ? links.stack
    : (Array.isArray(links.press)
      ? links.press.map((url, index) => ({
        title: links.press.length > 1 ? `Press ${index + 1}` : 'Press',
        url,
      }))
      : []);
  const gallery = Array.isArray(data?.media?.gallery) ? data.media.gallery : [];
  const description = String(data.description || '');
  const firstBodyLine = description
    .split(/\r?\n/)
    .map((line) => String(line || '').trim())
    .find(Boolean) || '';

  const lines = [
    `Field: ${summarizeText(fieldLabel, 64)}`,
    `Affects: ${resolveAffectedArea(fieldKey)}`,
    '',
  ];

  if (['year', 'title', 'subtitle', 'slug'].includes(fieldKey)) {
    lines.push(`Card header: ${summarizeText(data.title)} (${summarizeText(data.year, 8)})`);
    lines.push(`Card subtitle: ${summarizeText(data.subtitle)}`);
    lines.push(`Detail heading: ${summarizeText(data.title)}`);
    lines.push(`Route: /work/${summarizeText(data.slug, 48)}`);
    return lines;
  }

  if (fieldKey === 'category' || fieldKey === 'tags' || fieldKey.startsWith('categoryMeta.')) {
    lines.push(`Category chip: ${summarizeText(category, 32)}`);
    lines.push(`Header entry lines: ${summarizeList(entryLines, { maxItems: 2 })}`);
    lines.push(`Card tags (first 3): ${summarizeList(tags.slice(0, 3), { maxItems: 3 })}`);
    lines.push(`Sidebar tags total: ${tags.length}`);
    return lines;
  }

  if (['role', 'location', 'disciplines'].includes(fieldKey)) {
    lines.push(`Header role line: ${summarizeText(data.role)} | ${summarizeList(disciplines, { maxItems: 3 })}`);
    lines.push(`Header location: ${summarizeText(data.location)}`);
    lines.push(`Sidebar disciplines: ${summarizeList(disciplines, { maxItems: 4 })}`);
    return lines;
  }

  if (['techStack', 'collaborators', 'github', 'liveDemo', 'linkStack'].includes(fieldKey)) {
    lines.push(`Sidebar tech: ${summarizeList(techStack, { maxItems: 4 })}`);
    lines.push(`Sidebar collaborators: ${summarizeList(collaborators, { maxItems: 3 })}`);
    lines.push(`Links: github=${links.github ? 'yes' : 'no'}, live=${links.liveDemo ? 'yes' : 'no'}, stack=${stackLinks.length}`);
    return lines;
  }

  if (['heroImage', 'gallery'].includes(fieldKey)) {
    lines.push(`Card/hero image: ${summarizeText(data?.media?.heroImage)}`);
    lines.push(`Gallery count: ${gallery.length}`);
    if (gallery.length > 0) {
      lines.push(`First gallery item: ${summarizeText(gallery[0]?.src)}`);
    }
    return lines;
  }

  if (fieldKey === 'description') {
    lines.push(`Body first line: ${summarizeText(firstBodyLine)}`);
    lines.push(`Body size: ${description.length} chars`);
    lines.push('Renders in detail page prose block.');
    return lines;
  }

  lines.push(`Card: ${summarizeText(data.title)} (${summarizeText(data.year, 8)})`);
  lines.push(`Header entry lines: ${summarizeList(entryLines, { maxItems: 2 })}`);
  lines.push(`Sidebar tags: ${tags.length}, tech items: ${techStack.length}, collaborators: ${collaborators.length}`);
  lines.push(`Media: hero=${data?.media?.heroImage ? 'set' : 'missing'}, gallery=${gallery.length}`);
  lines.push(`Body size: ${description.length} chars`);
  return lines;
}

function CreateWizardApp({
  onCancel,
  onSubmit,
  mode = 'create',
  initialInput = null,
  availableTags = [],
  categoryDefinitions = CATEGORY_DEFINITIONS,
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const isEditMode = mode === 'edit';

  const [dimensions, setDimensions] = useState({
    cols: stdout?.columns || 120,
    rows: stdout?.rows || 36,
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [form, setForm] = useState(() => defaultForm(initialInput, categoryDefinitions));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const onResize = () => {
      setDimensions({
        cols: stdout?.columns || 120,
        rows: stdout?.rows || 36,
      });
    };
    stdout?.on('resize', onResize);
    return () => stdout?.off('resize', onResize);
  }, [stdout]);

  const steps = useMemo(() => stepsForForm(form, categoryDefinitions), [form, categoryDefinitions]);
  const step = steps[clamp(stepIndex, 0, Math.max(0, steps.length - 1))];
  const fields = Array.isArray(step?.fields) ? step.fields : [];
  const field = fields[clamp(fieldIndex, 0, Math.max(0, fields.length - 1))];

  useEffect(() => {
    const maxStep = Math.max(0, steps.length - 1);
    if (stepIndex > maxStep) {
      setStepIndex(maxStep);
    }
  }, [stepIndex, steps.length]);

  useEffect(() => {
    const maxField = Math.max(0, fields.length - 1);
    if (fieldIndex > maxField) {
      setFieldIndex(maxField);
    }
  }, [fieldIndex, fields.length]);

  const categoryOptions = useMemo(
    () => categoryOptionsFromDefinitions(categoryDefinitions),
    [categoryDefinitions],
  );
  const category = normalizeCategory(form.category || DEFAULT_CATEGORY, categoryDefinitions);
  const categoryDefinition = getCategoryDefinition(category, categoryDefinitions);
  const categoryQuickOptions = categoryOptions.slice(0, 9);
  const quickTags = useMemo(
    () => normalizeTagList([...(Array.isArray(availableTags) ? availableTags : []), ...tagsFromText(form.tags)]).slice(0, 9),
    [availableTags, form.tags],
  );

  const normalizedInput = useMemo(
    () => buildInput(form, categoryDefinitions),
    [form, categoryDefinitions],
  );
  const activeFieldKey = step.id === 'summary' ? '' : String(field?.key || '');
  const activeFieldLabel = step.id === 'summary'
    ? 'Summary'
    : String(field?.label || step.label || 'Current Field');
  const snapshotLines = useMemo(
    () => buildLiveSnapshotLines({
      input: normalizedInput,
      fieldKey: activeFieldKey,
      fieldLabel: activeFieldLabel,
      categoryDefinitions,
    }),
    [normalizedInput, activeFieldKey, activeFieldLabel, categoryDefinitions],
  );
  const previewLines = useMemo(
    () => JSON.stringify(normalizedInput, null, 2).split('\n'),
    [normalizedInput],
  );
  const shell = useMemo(() => {
    const cols = Math.max(90, dimensions.cols || 120);
    const rows = Math.max(24, dimensions.rows || 36);
    const headerHeight = 5;
    const footerHeight = 3;
    const bodyHeight = Math.max(10, rows - headerHeight - footerHeight);
    const sidebarWidth = Math.min(34, Math.max(26, Math.floor(cols * 0.25)));
    const rightWidth = Math.min(58, Math.max(34, Math.floor(cols * 0.4)));
    return {
      cols,
      rows,
      headerHeight,
      footerHeight,
      bodyHeight,
      sidebarWidth,
      rightWidth,
    };
  }, [dimensions]);
  const sidebarTextWidth = Math.max(18, shell.sidebarWidth - 4);

  const nextStep = () => {
    const validationError = validateStep(step.id, form, categoryDefinitions);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStepIndex((value) => Math.min(steps.length - 1, value + 1));
    setFieldIndex(0);
  };

  const prevStep = () => {
    setError('');
    setStepIndex((value) => Math.max(0, value - 1));
    setFieldIndex(0);
  };

  useInput(async (input, key) => {
    if (busy) return;

    if (result) {
      if (key.escape || input.toLowerCase() === 'q') {
        exit();
      }
      if (input.toLowerCase() === 'n') {
        setForm(defaultForm(isEditMode ? initialInput : null, categoryDefinitions));
        setStepIndex(0);
        setFieldIndex(0);
        setError('');
        setResult(null);
      }
      return;
    }

    if (key.escape) {
      if (stepIndex === 0) {
        onCancel?.();
        exit();
        return;
      }
      prevStep();
      return;
    }

    if (key.leftArrow) {
      prevStep();
      return;
    }

    if (key.rightArrow) {
      if (step.id !== 'summary') nextStep();
      return;
    }

    if (step.id === 'summary') {
      if (key.return) {
        setBusy(true);
        setError('');
        try {
          const output = await onSubmit(buildInput(form, categoryDefinitions));
          setResult(output);
        } catch (submitError) {
          setError(formatSubmitError(submitError));
        } finally {
          setBusy(false);
        }
      }
      if (key.tab) {
        prevStep();
      }
      return;
    }

    if (key.upArrow) {
      setFieldIndex((value) => clamp(value - 1, 0, Math.max(0, fields.length - 1)));
      return;
    }

    if (key.downArrow) {
      setFieldIndex((value) => clamp(value + 1, 0, Math.max(0, fields.length - 1)));
      return;
    }

    if (field?.key === 'category' && /^[1-9]$/.test(input)) {
      const option = categoryQuickOptions[Number(input) - 1];
      if (option) {
        setForm((current) => ({
          ...current,
          category: option.id,
          categoryMeta: sanitizeCategoryMeta(option.id, current.categoryMeta || {}, categoryDefinitions),
        }));
      }
      return;
    }

    if (field?.key === 'tags' && /^[1-9]$/.test(input)) {
      const tag = quickTags[Number(input) - 1];
      if (tag) {
        setForm((current) => ({
          ...current,
          tags: toggleTagText(current.tags, tag),
        }));
      }
      return;
    }

    if (key.tab || (key.return && !field?.multiline)) {
      if (fieldIndex < fields.length - 1) {
        setFieldIndex((value) => value + 1);
        return;
      }
      nextStep();
      return;
    }

    if (!field) return;

    const currentValue = readFieldValue(form, field.key);
    const nextValue = applyTextEdit(currentValue, input, key, { multiline: Boolean(field.multiline) });
    if (String(nextValue) === String(currentValue)) return;

    setForm((current) => {
      let next = setFieldValue(current, field.key, nextValue);

      if (field.key === 'title' && !current.slugTouched) {
        next = { ...next, slug: slugify(nextValue) };
      }

      if (field.key === 'slug') {
        next = { ...next, slugTouched: true };
      }

      if (field.key === 'category') {
        const candidate = String(nextValue || '').trim().toLowerCase().replace(/\s+/g, '-');
        next = { ...next, category: candidate };
        if (isKnownCategory(candidate, categoryDefinitions)) {
          next = {
            ...next,
            categoryMeta: sanitizeCategoryMeta(candidate, next.categoryMeta || {}, categoryDefinitions),
          };
        }
      }

      if (field.key === 'tags') {
        next = {
          ...next,
          tags: tagsFromText(nextValue).join(', '),
        };
      }

      if (field.key === 'gallery') {
        const sources = splitCsv(nextValue);
        const previous = Array.isArray(current.galleryMeta) ? current.galleryMeta : [];
        const bySrc = new Map(
          previous
            .map((item) => {
              const src = String(item?.src || '').trim();
              if (!src) return null;
              return [src, item];
            })
            .filter(Boolean),
        );
        next = {
          ...next,
          galleryMeta: sources.map((src) => bySrc.get(src) || { src }),
        };
      }

      return next;
    });
  });

  const snapshotMaxLines = Math.max(6, Math.floor((shell.bodyHeight - 8) * 0.48));
  const shownSnapshot = snapshotLines.slice(0, snapshotMaxLines);
  const previewMaxLines = Math.max(5, shell.bodyHeight - shownSnapshot.length - 8);
  const shownPreview = previewLines.slice(0, previewMaxLines);

  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      width: shell.cols,
      height: shell.rows,
    },
    React.createElement(
      Box,
      {
        borderStyle: 'double',
        borderColor: 'green',
        height: shell.headerHeight,
        flexDirection: 'column',
        paddingX: 1,
      },
      React.createElement(Text, { color: 'green', bold: true }, isEditMode ? 'LEO NUNEZ // WORK ENTRY EDITOR' : 'LEO NUNEZ // WORK ENTRY WIZARD'),
      React.createElement(Text, { color: 'gray' }, `Step ${stepIndex + 1}/${steps.length}: ${step.label}`),
      React.createElement(Text, { color: 'gray' }, 'Up/Down fields, Left/Right steps, Tab advance, Esc back/cancel'),
    ),
    React.createElement(
      Box,
      { height: shell.bodyHeight, width: shell.cols },
      React.createElement(
        Box,
        {
          width: shell.sidebarWidth,
          borderStyle: 'single',
          borderColor: 'green',
          flexDirection: 'column',
          paddingX: 1,
          marginRight: 1,
        },
        React.createElement(Text, { color: 'gray' }, 'STEPS'),
        ...steps.map((item, index) =>
          React.createElement(
            Text,
            index === stepIndex
              ? { key: item.id, inverse: true }
              : { key: item.id, color: index < stepIndex ? 'green' : 'white' },
            pad(`${index + 1}. ${item.label}`, sidebarTextWidth),
          )),
        React.createElement(Text, { color: 'gray' }, ''),
        React.createElement(Text, { color: 'gray' }, pad(`Category: ${categoryDefinition.label}`, sidebarTextWidth)),
        step.id === 'classification'
          ? React.createElement(
            Box,
            { flexDirection: 'column' },
            React.createElement(Text, { color: 'gray' }, 'CATEGORY QUICK PICK'),
            ...categoryQuickOptions.map((option, index) =>
              React.createElement(
                Text,
                {
                  key: option.id,
                  color: option.id === category ? 'green' : 'white',
                },
                pad(categoryOptionLabel(index, option), sidebarTextWidth),
              )),
            React.createElement(Text, { color: 'gray' }, ''),
            React.createElement(Text, { color: 'gray' }, 'TAG QUICK PICK'),
            ...quickTags.map((tag, index) => {
              const selectedTags = tagsFromText(form.tags);
              const selected = selectedTags.includes(tag);
              return React.createElement(
                Text,
                {
                  key: `quick-tag-${tag}`,
                  color: selected ? 'green' : 'white',
                },
                pad(`${index + 1}. ${selected ? '[x]' : '[ ]'} ${tag}`, sidebarTextWidth),
              );
            }),
          )
          : null,
        error ? React.createElement(Text, { color: 'red' }, `Error: ${error}`) : null,
        busy ? React.createElement(Text, { color: 'yellow' }, 'Submitting...') : null,
      ),
      React.createElement(
        Box,
        {
          flexGrow: 1,
          borderStyle: 'single',
          borderColor: 'blue',
          flexDirection: 'column',
          paddingX: 1,
          marginRight: 1,
        },
        step.id !== 'summary'
          ? React.createElement(
            Box,
            { flexDirection: 'column' },
            React.createElement(Text, { color: 'blue', bold: true }, step.label),
            React.createElement(Text, { color: 'gray' }, 'Current step fields'),
            ...fields.map((item, index) => {
              const rawValue = readFieldValue(form, item.key);
              const visible = String(rawValue || '').replace(/\n/g, ' <NL> ');
              return React.createElement(
                Text,
                index === fieldIndex
                  ? { key: item.key, inverse: true }
                  : { key: item.key, color: 'white' },
                `${item.label}: ${visible}`,
              );
            }),
          )
          : React.createElement(
            Box,
            { flexDirection: 'column' },
            React.createElement(Text, { color: 'green', bold: true }, 'Review & Confirm'),
            React.createElement(Text, { color: 'gray' }, isEditMode ? 'Press Enter to save entry.' : 'Press Enter to create entry.'),
            result
              ? React.createElement(
                Box,
                { flexDirection: 'column', marginTop: 1 },
                React.createElement(Text, { color: 'green' }, `${isEditMode ? 'Saved' : 'Created'}: ${result.relativeFilePath}`),
                ...result.mediaOperations.map((operation, index) =>
                  React.createElement(
                    Text,
                    { key: `op-${index}`, color: 'white' },
                    `${operation.kind}: ${operation.source} -> ${operation.destination}`,
                  )),
                React.createElement(Text, { color: 'gray' }, 'Press n for another entry, or Esc/q to exit.'),
              )
              : null,
          ),
      ),
      React.createElement(
        Box,
        {
          width: shell.rightWidth,
          borderStyle: 'single',
          borderColor: 'yellow',
          flexDirection: 'column',
          paddingX: 1,
        },
        React.createElement(Text, { color: 'yellow', bold: true }, 'AFFECTED PAGE SNAPSHOT'),
        ...shownSnapshot.map((line, index) =>
          React.createElement(Text, { key: `snapshot-${index}`, color: 'white' }, line)),
        snapshotLines.length > shownSnapshot.length
          ? React.createElement(Text, { color: 'gray' }, '...')
          : null,
        React.createElement(Text, { color: 'gray' }, ''),
        React.createElement(Text, { color: 'yellow', bold: true }, 'LIVE JSON PREVIEW'),
        ...shownPreview.map((line, index) =>
          React.createElement(Text, { key: `preview-${index}`, color: 'white' }, line)),
        previewLines.length > shownPreview.length
          ? React.createElement(Text, { color: 'gray' }, '...')
          : null,
      ),
    ),
    React.createElement(
      Box,
      {
        borderStyle: 'single',
        borderColor: 'green',
        height: shell.footerHeight,
        paddingX: 1,
      },
      React.createElement(
        Text,
        { color: 'gray' },
        result
          ? 'n reset form   Esc/q exit'
          : 'Enter confirm   Tab next   Left/Right step nav   Esc back/cancel',
      ),
    ),
  );
}

export async function runCreateWizard({
  onSubmit,
  onCancel,
  availableTags = [],
  categoryDefinitions = CATEGORY_DEFINITIONS,
} = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive create wizard requires a TTY.');
  }

  const app = render(
    React.createElement(CreateWizardApp, {
      onSubmit,
      onCancel,
      mode: 'create',
      initialInput: null,
      availableTags,
      categoryDefinitions,
    }),
    {
      exitOnCtrlC: true,
    },
  );
  await app.waitUntilExit();
}

export async function runEditWizard({
  onSubmit,
  onCancel,
  initialInput,
  availableTags = [],
  categoryDefinitions = CATEGORY_DEFINITIONS,
} = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive edit wizard requires a TTY.');
  }

  const app = render(
    React.createElement(CreateWizardApp, {
      onSubmit,
      onCancel,
      mode: 'edit',
      initialInput,
      availableTags,
      categoryDefinitions,
    }),
    {
      exitOnCtrlC: true,
    },
  );
  await app.waitUntilExit();
}
