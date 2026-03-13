import fs from 'node:fs/promises';
import path from 'node:path';
import {
  CATEGORY_DEFINITIONS,
  DEFAULT_CATEGORY,
  DISCIPLINES,
  getCategoryDefinition,
  isHttpUrl,
  isLocationRequired,
  isMonthValid,
  isKnownCategory,
  isYearValid,
  MAX_DISCIPLINES,
  normalizeCategoryMeta,
  normalizeTag,
  normalizeTagList,
  requiredCategoryKeys,
} from './schema.mjs';
import { readAllProjects, toRepoRelative } from './store.mjs';
import { changedPathsFromPorcelain, isGitRepository, runGit } from './git.mjs';
import { loadRegisteredTags } from './tags.mjs';

const LARGE_MEDIA_WARNING_BYTES = 10 * 1024 * 1024;

function issue(severity, code, message, filePath = null, meta = {}) {
  return {
    severity,
    code,
    message,
    filePath,
    ...meta,
  };
}

function normalizePath(target) {
  return String(target || '').split(path.sep).join('/');
}

const WORK_PAGE_SETTINGS_PATH = path.join('src', 'content', 'projects', '_work-page-settings.json');

function normalizeValidationIgnorePath(value) {
  const raw = normalizePath(String(value || '').trim()).replace(/^\.\//, '');
  if (!raw) return '';
  if (raw.startsWith('src/content/projects/') && raw.endsWith('.md')) return raw;
  if (!raw.includes('/') && raw.endsWith('.md')) return 'src/content/projects/' + raw;
  return '';
}

async function getValidationIgnoredFiles(root) {
  const settingsPath = path.resolve(root, WORK_PAGE_SETTINGS_PATH);
  try {
    const raw = await fs.readFile(settingsPath, 'utf8');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.validationIgnoreFiles) ? parsed.validationIgnoreFiles : [];
    const normalized = list
      .map((item) => normalizeValidationIgnorePath(item))
      .filter(Boolean);
    return new Set(normalized);
  } catch {
    return new Set();
  }
}

async function getChangedProjectFiles(root) {
  if (!isGitRepository(root)) return [];
  const status = runGit(['status', '--porcelain', '--', 'src/content/projects'], { cwd: root, allowFailure: true });
  if (!status.ok) return [];

  const files = changedPathsFromPorcelain(status.stdout)
    .map((filePath) => normalizePath(filePath))
    .filter((filePath) => filePath.startsWith('src/content/projects/') && filePath.endsWith('.md'));

  return Array.from(new Set(files));
}

function getLocalMediaReferences(data) {
  const refs = [];
  const hero = String(data?.media?.heroImage || '').trim();
  if (hero) refs.push(hero);
  const mediaCollections = [
    Array.isArray(data?.media?.gallery) ? data.media.gallery : [],
    Array.isArray(data?.media?.featured) ? data.media.featured : [],
    Array.isArray(data?.media?.placeholders) ? data.media.placeholders : [],
  ];
  for (const collection of mediaCollections) {
    for (const item of collection) {
      const src = String(item?.src || '').trim();
      if (src) refs.push(src);
    }
  }
  return Array.from(new Set(refs));
}

function validateMediaCollection(items, fieldName, filePath, push) {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || typeof item !== 'object') {
      push(issue('error', 'invalid_media_item', `${fieldName}[${index}] must be an object.`, filePath));
      continue;
    }

    const type = String(item.type || '').trim();
    const src = String(item?.src || '').trim();

    if (!['image', 'video', 'embed'].includes(type)) {
      push(issue('error', 'invalid_media_type', `${fieldName}[${index}].type must be image|video|embed.`, filePath));
    }
    if (!src) {
      push(issue('error', 'invalid_media_src', `${fieldName}[${index}].src is required.`, filePath));
    }
  }
}

function resolveLocalMediaPath(src, root) {
  const value = String(src || '').trim();
  if (!value) return null;
  if (isHttpUrl(value)) return null;
  if (value.startsWith('/')) {
    return path.resolve(root, 'public', `.${value}`);
  }
  return path.resolve(root, value);
}

async function fileSizeIfExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return null;
  }
}

function normalizeDiscipline(value) {
  return normalizeTag(value);
}

async function resolveAllowedDisciplines(root) {
  const { tags: registeredTags } = await loadRegisteredTags({ root });
  const normalized = normalizeTagList([
    ...DISCIPLINES,
    ...(Array.isArray(registeredTags) ? registeredTags : []),
  ]);
  return new Set(normalized);
}

function validateLinks(data, filePath, push) {
  const links = data.links || {};
  const direct = [
    ['links.github', links.github],
    ['links.liveDemo', links.liveDemo],
  ];
  for (const [field, value] of direct) {
    if (!value) continue;
    if (!isHttpUrl(value)) {
      push(issue('error', 'invalid_url', `${field} must be a valid http(s) URL.`, filePath));
    }
  }

  if (Array.isArray(links.stack)) {
    links.stack.forEach((value, index) => {
      const title = String(value?.title || '').trim();
      const url = String(value?.url || '').trim();
      if (!title) {
        push(issue('error', 'invalid_links_stack', `links.stack[${index}].title is required.`, filePath));
      }
      if (!isHttpUrl(url)) {
        push(issue('error', 'invalid_url', `links.stack[${index}].url must be a valid http(s) URL.`, filePath));
      }
    });
  } else if (links.stack != null) {
    push(issue('error', 'invalid_links_stack', 'links.stack must be an array.', filePath));
  }

  if (Array.isArray(links.press)) {
    links.press.forEach((value, index) => {
      if (!isHttpUrl(value)) {
        push(issue('error', 'invalid_url', `links.press[${index}] must be a valid http(s) URL.`, filePath));
      }
    });
  }
}

function validateMediaShape(data, filePath, push) {
  if (!data.media || typeof data.media !== 'object') {
    push(issue('error', 'missing_media', 'media object is required.', filePath));
    return;
  }

  if (data.media.gallery != null && !Array.isArray(data.media.gallery)) {
    push(issue('error', 'invalid_media_gallery', 'media.gallery must be an array.', filePath));
    return;
  }
  const gallery = Array.isArray(data.media.gallery) ? data.media.gallery : [];
  validateMediaCollection(gallery, 'media.gallery', filePath, push);

  if (data.media.featured != null && !Array.isArray(data.media.featured)) {
    push(issue('error', 'invalid_media_featured', 'media.featured must be an array.', filePath));
  }
  const featured = Array.isArray(data.media.featured) ? data.media.featured : [];
  validateMediaCollection(featured, 'media.featured', filePath, push);

  if (data.media.placeholders != null && !Array.isArray(data.media.placeholders)) {
    push(issue('error', 'invalid_media_placeholders', 'media.placeholders must be an array.', filePath));
  }
  const placeholders = Array.isArray(data.media.placeholders) ? data.media.placeholders : [];
  validateMediaCollection(placeholders, 'media.placeholders', filePath, push);
}

function validateRequiredFields(data, body, filePath, push) {
  const requiredStringFields = [
    'slug',
    'title',
    'subtitle',
    'year',
    'month',
    'role',
  ];

  requiredStringFields.forEach((field) => {
    if (!String(data?.[field] || '').trim()) {
      push(issue('error', 'missing_required_field', `${field} is required.`, filePath));
    }
  });

  const category = String(data?.category || DEFAULT_CATEGORY).trim() || DEFAULT_CATEGORY;
  if (isLocationRequired(category) && !String(data?.location || '').trim()) {
    push(issue('error', 'missing_required_field', 'location is required.', filePath));
  }

  if (!Array.isArray(data?.disciplines) || data.disciplines.length < 1) {
    push(issue('error', 'missing_required_field', 'disciplines must include at least one value.', filePath));
  } else if (data.disciplines.length > MAX_DISCIPLINES) {
    push(issue(
      'error',
      'invalid_disciplines_count',
      `disciplines may include at most ${MAX_DISCIPLINES} values.`,
      filePath,
    ));
  }

  if (!String(body || '').trim()) {
    push(issue('error', 'missing_required_field', 'description body is required.', filePath));
  }
}

function validateDomainRules(
  data,
  filePath,
  push,
  categoryDefinitions = null,
  allowedDisciplines = new Set(),
) {
  const year = String(data?.year || '').trim();
  if (year && !isYearValid(year)) {
    push(issue('error', 'invalid_year', 'year must be 4 digits between 1900 and 2100.', filePath));
  }
  const month = String(data?.month || '').trim();
  if (month && !isMonthValid(month)) {
    push(issue('error', 'invalid_month', 'month must be between 1 and 12.', filePath));
  }

  const category = String(data?.category || '').trim();
  if (category) {
    if (!isKnownCategory(category, categoryDefinitions || CATEGORY_DEFINITIONS)) {
      push(issue('error', 'invalid_category', `Unknown category: ${category}`, filePath));
    } else {
      const categoryMeta = normalizeCategoryMeta(data?.categoryMeta || {});
      if (data?.categoryMeta != null && (typeof data.categoryMeta !== 'object' || Array.isArray(data.categoryMeta))) {
        push(issue('error', 'invalid_category_meta', 'categoryMeta must be an object.', filePath));
      }
      const missingRequired = requiredCategoryKeys(category, categoryDefinitions || CATEGORY_DEFINITIONS)
        .filter((key) => !String(categoryMeta[key] || '').trim());
      if (missingRequired.length > 0) {
        const definition = getCategoryDefinition(category, categoryDefinitions || CATEGORY_DEFINITIONS);
        push(issue(
          'error',
          'missing_category_meta',
          `Missing required categoryMeta field(s) for ${definition.label}: ${missingRequired.join(', ')}`,
          filePath,
        ));
      }
    }
  }

  if (data?.entryLines != null) {
    if (!Array.isArray(data.entryLines)) {
      push(issue('error', 'invalid_entry_lines', 'entryLines must be an array of strings.', filePath));
    } else {
      data.entryLines.forEach((line, index) => {
        if (!String(line || '').trim()) {
          push(issue('error', 'invalid_entry_lines', `entryLines[${index}] must be a non-empty string.`, filePath));
        }
      });
    }
  }

  const disciplines = Array.isArray(data?.disciplines) ? data.disciplines : [];
  for (const discipline of disciplines) {
    const normalized = normalizeDiscipline(discipline);
    if (allowedDisciplines.size > 0 && normalized && !allowedDisciplines.has(normalized)) {
      push(issue('error', 'invalid_discipline', `Unknown discipline: ${discipline}`, filePath));
    }
  }

  if (data?.omitTechStack != null && typeof data.omitTechStack !== 'boolean') {
    push(issue('error', 'invalid_omit_tech_stack', 'omitTechStack must be a boolean when provided.', filePath));
  }

  if (data?.omitLinkStack != null && typeof data.omitLinkStack !== 'boolean') {
    push(issue('error', 'invalid_omit_link_stack', 'omitLinkStack must be a boolean when provided.', filePath));
  }

  if (data?.hidden != null && typeof data.hidden !== 'boolean') {
    push(issue('error', 'invalid_hidden_flag', 'hidden must be a boolean when provided.', filePath));
  }

  if (data?.hideFromWorkPage != null && typeof data.hideFromWorkPage !== 'boolean') {
    push(issue('error', 'invalid_hide_from_work_page_flag', 'hideFromWorkPage must be a boolean when provided.', filePath));
  }

  validateLinks(data, filePath, push);
  validateMediaShape(data, filePath, push);
}

function collectWarnings(data, filePath, push) {
  const category = String(data?.category || '').trim();
  if (!category) {
    push(issue('warning', 'missing_category', `category is missing. Defaulting to "${DEFAULT_CATEGORY}" is recommended.`, filePath));
  }

  const tags = Array.isArray(data?.tags) ? data.tags : [];
  if (data?.tags != null && !Array.isArray(data.tags)) {
    push(issue('warning', 'invalid_tags_shape', 'tags should be an array of strings.', filePath));
  } else if (tags.length === 0) {
    push(issue('warning', 'missing_tags', 'tags is empty. Add searchable tags such as "sound design".', filePath));
  } else {
    const normalized = normalizeTagList(tags);
    if (normalized.length !== tags.length) {
      push(issue('warning', 'duplicate_tags', 'tags contain duplicates or unnormalized values.', filePath));
    }
  }

  if (!Array.isArray(data?.techStack) || data.techStack.length === 0) {
    push(issue('warning', 'missing_tech_stack', 'techStack is empty.', filePath));
  }

  if (!Array.isArray(data?.collaborators) || data.collaborators.length === 0) {
    push(issue('warning', 'missing_collaborators', 'collaborators is empty.', filePath));
  }

  const gallery = Array.isArray(data?.media?.gallery) ? data.media.gallery : [];
  gallery.forEach((item, index) => {
    if (!String(item?.caption || '').trim()) {
      push(issue('warning', 'missing_gallery_caption', `media.gallery[${index}] has no caption.`, filePath));
    }
  });
}

export async function validateWorkEntries({ mode = 'changed', root = process.cwd(), categoryDefinitions = null } = {}) {
  const normalizedMode = mode === 'all' ? 'all' : 'changed';
  const allowedDisciplines = await resolveAllowedDisciplines(root);
  const { entries, parseErrors } = await readAllProjects(root);
  const validationIgnoredFiles = await getValidationIgnoredFiles(root);
  const isValidationIgnored = (filePath) => {
    const rel = normalizePath(toRepoRelative(root, filePath));
    return validationIgnoredFiles.has(rel);
  };

  const eligibleEntries = entries.filter((entry) => !isValidationIgnored(entry.filePath));
  const eligibleParseErrors = parseErrors.filter((entry) => !isValidationIgnored(entry.filePath));

  const changedRelativePaths = normalizedMode === 'changed'
    ? (await getChangedProjectFiles(root)).filter((filePath) => !validationIgnoredFiles.has(filePath))
    : eligibleEntries.map((entry) => normalizePath(toRepoRelative(root, entry.filePath)));

  const changedSet = new Set(changedRelativePaths);

  const targetEntries = normalizedMode === 'all'
    ? eligibleEntries
    : eligibleEntries.filter((entry) => changedSet.has(normalizePath(toRepoRelative(root, entry.filePath))));

  const issues = [];
  const pushIssue = (next) => issues.push(next);

  for (const parseError of eligibleParseErrors) {
    const rel = normalizePath(toRepoRelative(root, parseError.filePath));
    if (normalizedMode === 'all' || changedSet.has(rel)) {
      pushIssue(issue('error', 'parse_error', `Markdown/frontmatter parse failed: ${parseError.message}`, parseError.filePath));
    }
  }

  for (const entry of targetEntries) {
    validateRequiredFields(entry.data, entry.body, entry.filePath, pushIssue);
    validateDomainRules(
      entry.data,
      entry.filePath,
      pushIssue,
      categoryDefinitions,
      allowedDisciplines,
    );
    collectWarnings(entry.data, entry.filePath, pushIssue);
  }

  const slugMap = new Map();
  const titleYearMap = new Map();
  for (const entry of eligibleEntries) {
    const slug = String(entry.data?.slug || '').trim();
    if (slug) {
      const list = slugMap.get(slug) || [];
      list.push(entry.filePath);
      slugMap.set(slug, list);
    }

    const title = String(entry.data?.title || '').trim();
    const year = String(entry.data?.year || '').trim();
    if (title && year) {
      const key = `${title.toLowerCase()}::${year}`;
      const list = titleYearMap.get(key) || [];
      list.push(entry.filePath);
      titleYearMap.set(key, list);
    }
  }

  for (const [slug, files] of slugMap.entries()) {
    if (files.length < 2) continue;
    const touchesTarget = normalizedMode === 'all'
      || files.some((filePath) => changedSet.has(toRepoRelative(root, filePath)));
    if (!touchesTarget) continue;
    const message = `Duplicate slug \"${slug}\" found in ${files.length} files.`;
    files.forEach((filePath) => pushIssue(issue('error', 'duplicate_slug', message, filePath)));
  }

  for (const [key, files] of titleYearMap.entries()) {
    if (files.length < 2) continue;
    const touchesTarget = normalizedMode === 'all'
      || files.some((filePath) => changedSet.has(toRepoRelative(root, filePath)));
    if (!touchesTarget) continue;
    const [title, year] = key.split('::');
    const message = `Duplicate title/year combination detected: ${title} (${year}).`;
    files.forEach((filePath) => pushIssue(issue('warning', 'duplicate_title_year', message, filePath)));
  }

  for (const entry of targetEntries) {
    const refs = getLocalMediaReferences(entry.data);
    for (const ref of refs) {
      const localPath = resolveLocalMediaPath(ref, root);
      if (!localPath) continue;
      const size = await fileSizeIfExists(localPath);
      if (normalizedMode === 'changed' && size == null) {
        pushIssue(issue('error', 'missing_media_file', `Referenced media file not found: ${ref}`, entry.filePath));
        continue;
      }
      if (size != null && size >= LARGE_MEDIA_WARNING_BYTES) {
        pushIssue(issue('warning', 'large_media_file', `Large media file (${Math.round(size / (1024 * 1024))}MB): ${ref}`, entry.filePath));
      }
    }
  }

  const errors = issues.filter((entry) => entry.severity === 'error');
  const warnings = issues.filter((entry) => entry.severity === 'warning');

  return {
    mode: normalizedMode,
    checkedFiles: targetEntries.map((entry) => toRepoRelative(root, entry.filePath)),
    changedFiles: changedRelativePaths,
    errors,
    warnings,
    ok: errors.length === 0,
  };
}

export function formatValidationReport(report, root = process.cwd()) {
  const lines = [];
  lines.push(`work validate (${report.mode})`);
  lines.push(`checked=${report.checkedFiles.length} errors=${report.errors.length} warnings=${report.warnings.length}`);

  const ordered = [...report.errors, ...report.warnings];
  if (ordered.length === 0) {
    lines.push('No issues found.');
    return lines.join('\n');
  }

  for (const item of ordered) {
    const level = item.severity.toUpperCase();
    const target = item.filePath ? toRepoRelative(root, item.filePath) : '(global)';
    lines.push(`[${level}] ${target} :: ${item.message}`);
  }

  return lines.join('\n');
}
