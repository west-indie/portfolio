import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { DEFAULT_CATEGORY } from './schema.mjs';

export const PROJECTS_DIR = path.join('src', 'content', 'projects');

export function resolveProjectsDir(root = process.cwd()) {
  return path.resolve(root, PROJECTS_DIR);
}

export function toRepoRelative(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join('/');
}

export async function listProjectFiles(root = process.cwd()) {
  const dir = resolveProjectsDir(root);
  let names = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  return names
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(dir, name))
    .sort((a, b) => a.localeCompare(b));
}

export async function readProjectFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = matter(raw);
  return {
    filePath,
    raw,
    data: parsed.data || {},
    body: String(parsed.content || ''),
  };
}

export async function readAllProjects(root = process.cwd()) {
  const files = await listProjectFiles(root);
  const entries = [];
  const parseErrors = [];

  for (const filePath of files) {
    try {
      const parsed = await readProjectFile(filePath);
      entries.push(parsed);
    } catch (error) {
      parseErrors.push({
        filePath,
        message: String(error?.message || error),
      });
    }
  }

  return { entries, parseErrors };
}

function normalizeFrontmatterForWrite(frontmatter) {
  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    subtitle: frontmatter.subtitle,
    year: frontmatter.year,
    month: frontmatter.month,
    category: frontmatter.category || DEFAULT_CATEGORY,
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    categoryMeta: frontmatter.categoryMeta || {},
    entryLines: Array.isArray(frontmatter.entryLines) ? frontmatter.entryLines : [],
    role: frontmatter.role,
    location: frontmatter.location,
    disciplines: Array.isArray(frontmatter.disciplines) ? frontmatter.disciplines : [],
    omitTechStack: frontmatter.omitTechStack === true,
    omitLinkStack: frontmatter.omitLinkStack === true,
    hidden: frontmatter.hidden === true,
    hideFromWorkPage: frontmatter.hideFromWorkPage === true,
    techStack: Array.isArray(frontmatter.techStack) ? frontmatter.techStack : [],
    collaborators: Array.isArray(frontmatter.collaborators) ? frontmatter.collaborators : [],
    links: frontmatter.links || {},
    media: frontmatter.media || { heroImage: '', gallery: [] },
  };
}

function sanitizeForYaml(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (typeof value === 'bigint') return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForYaml(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, nested] of Object.entries(value)) {
      const cleaned = sanitizeForYaml(nested);
      if (cleaned !== undefined) {
        next[key] = cleaned;
      }
    }
    return next;
  }

  return value;
}

export function renderProjectMarkdown(frontmatter, description) {
  const normalized = normalizeFrontmatterForWrite(frontmatter);
  const safeFrontmatter = sanitizeForYaml(normalized);
  const body = String(description || '').trim();
  return matter.stringify(`${body}\n`, safeFrontmatter, { lineWidth: 120 });
}

export function resolveProjectFileFromSlug(slug, root = process.cwd()) {
  return path.join(resolveProjectsDir(root), `${slug}.md`);
}

export async function writeProjectEntry({ frontmatter, description, root = process.cwd(), replace = false, dryRun = false }) {
  const filePath = resolveProjectFileFromSlug(frontmatter.slug, root);
  const exists = await fs.access(filePath).then(() => true).catch(() => false);
  if (exists && !replace) {
    throw new Error(`Project file already exists for slug \"${frontmatter.slug}\" at ${toRepoRelative(root, filePath)}. Use --replace to overwrite.`);
  }

  const content = renderProjectMarkdown(frontmatter, description);
  if (!dryRun) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
  }

  return {
    filePath,
    relativeFilePath: toRepoRelative(root, filePath),
    content,
    replaced: exists,
  };
}

export async function readTemplate(root = process.cwd()) {
  const templatePath = path.resolve(root, 'scripts', 'work', 'templates', 'project.md');
  try {
    return await fs.readFile(templatePath, 'utf8');
  } catch {
    return '';
  }
}
