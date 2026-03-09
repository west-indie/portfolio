import fs from 'node:fs/promises';
import path from 'node:path';
import { DISCIPLINES, isHttpUrl, isYearValid } from './schema.mjs';
import { readAllProjects, toRepoRelative } from './store.mjs';
import { changedPathsFromPorcelain, isGitRepository, runGit } from './git.mjs';

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
  const gallery = Array.isArray(data?.media?.gallery) ? data.media.gallery : [];
  for (const item of gallery) {
    const src = String(item?.src || '').trim();
    if (src) refs.push(src);
  }
  return refs;
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

  const heroImage = String(data.media.heroImage || '').trim();
  if (!heroImage) {
    push(issue('error', 'missing_media_hero', 'media.heroImage is required.', filePath));
  }

  if (data.media.gallery != null && !Array.isArray(data.media.gallery)) {
    push(issue('error', 'invalid_media_gallery', 'media.gallery must be an array.', filePath));
    return;
  }

  const gallery = Array.isArray(data.media.gallery) ? data.media.gallery : [];
  for (let index = 0; index < gallery.length; index += 1) {
    const item = gallery[index];
    if (!item || typeof item !== 'object') {
      push(issue('error', 'invalid_media_item', `media.gallery[${index}] must be an object.`, filePath));
      continue;
    }

    const type = String(item.type || '').trim();
    const src = String(item.src || '').trim();

    if (!['image', 'video', 'embed'].includes(type)) {
      push(issue('error', 'invalid_media_type', `media.gallery[${index}].type must be image|video|embed.`, filePath));
    }
    if (!src) {
      push(issue('error', 'invalid_media_src', `media.gallery[${index}].src is required.`, filePath));
    }
  }
}

function validateRequiredFields(data, body, filePath, push) {
  const requiredStringFields = [
    'slug',
    'title',
    'subtitle',
    'year',
    'role',
    'location',
  ];

  requiredStringFields.forEach((field) => {
    if (!String(data?.[field] || '').trim()) {
      push(issue('error', 'missing_required_field', `${field} is required.`, filePath));
    }
  });

  if (!Array.isArray(data?.disciplines) || data.disciplines.length < 1) {
    push(issue('error', 'missing_required_field', 'disciplines must include at least one value.', filePath));
  }

  if (!String(body || '').trim()) {
    push(issue('error', 'missing_required_field', 'description body is required.', filePath));
  }
}

function validateDomainRules(data, filePath, push) {
  const year = String(data?.year || '').trim();
  if (year && !isYearValid(year)) {
    push(issue('error', 'invalid_year', 'year must be 4 digits between 1900 and 2100.', filePath));
  }

  const disciplines = Array.isArray(data?.disciplines) ? data.disciplines : [];
  for (const discipline of disciplines) {
    if (!DISCIPLINES.includes(String(discipline))) {
      push(issue('error', 'invalid_discipline', `Unknown discipline: ${discipline}`, filePath));
    }
  }

  validateLinks(data, filePath, push);
  validateMediaShape(data, filePath, push);
}

function collectWarnings(data, filePath, push) {
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

export async function validateWorkEntries({ mode = 'changed', root = process.cwd() } = {}) {
  const normalizedMode = mode === 'all' ? 'all' : 'changed';
  const { entries, parseErrors } = await readAllProjects(root);
  const changedRelativePaths = normalizedMode === 'changed'
    ? await getChangedProjectFiles(root)
    : entries.map((entry) => toRepoRelative(root, entry.filePath));

  const changedSet = new Set(changedRelativePaths);

  const targetEntries = normalizedMode === 'all'
    ? entries
    : entries.filter((entry) => changedSet.has(toRepoRelative(root, entry.filePath)));

  const issues = [];
  const pushIssue = (next) => issues.push(next);

  for (const parseError of parseErrors) {
    const rel = toRepoRelative(root, parseError.filePath);
    if (normalizedMode === 'all' || changedSet.has(rel)) {
      pushIssue(issue('error', 'parse_error', `Markdown/frontmatter parse failed: ${parseError.message}`, parseError.filePath));
    }
  }

  for (const entry of targetEntries) {
    validateRequiredFields(entry.data, entry.body, entry.filePath, pushIssue);
    validateDomainRules(entry.data, entry.filePath, pushIssue);
    collectWarnings(entry.data, entry.filePath, pushIssue);
  }

  const slugMap = new Map();
  const titleYearMap = new Map();
  for (const entry of entries) {
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
