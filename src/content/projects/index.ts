import matter from 'gray-matter';
import { marked } from 'marked';
import type { MediaItem, Project } from '../../types/project';
import { normalizeProjectLayout } from '../../lib/projectLayout';
import { normalizeDisciplines } from '../../lib/disciplines';

const projectFiles = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true });
const projectImageFiles = Object.keys(import.meta.glob('/public/images/projects/**/*.{jpg,jpeg,JPG,JPEG,png,PNG,gif,GIF,webp,WEBP,avif,AVIF,svg,SVG}'));

function extractFilenameNumber(src: string): number | null {
  const normalized = String(src || '').trim().split(/[?#]/)[0] || '';
  const fileName = normalized.split('/').pop() || '';
  const stem = fileName.replace(/\.[^./]+$/, '');
  const match = stem.match(/(\d+)(?!.*\d)/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortImagePathsByFilenameNumber(paths: string[]): string[] {
  return [...paths]
    .map((src, index) => ({ src, index, number: extractFilenameNumber(src) }))
    .sort((a, b) => {
      if (a.number != null && b.number != null && a.number !== b.number) {
        return a.number - b.number;
      }
      if (a.number != null && b.number == null) return -1;
      if (a.number == null && b.number != null) return 1;
      if (a.src !== b.src) return a.src.localeCompare(b.src);
      return a.index - b.index;
    })
    .map((entry) => entry.src);
}

function buildProjectImageIndex(files: string[]): Record<string, string[]> {
  const index: Record<string, string[]> = {};

  files.forEach((sourcePath) => {
    const publicPath = sourcePath.startsWith('/public/')
      ? sourcePath.slice('/public'.length)
      : sourcePath;
    const match = publicPath.match(/^\/images\/projects\/([^/]+)\/[^/]+$/);
    if (!match) return;
    const folder = match[1];
    if (!index[folder]) index[folder] = [];
    index[folder].push(publicPath);
  });

  for (const [folder, paths] of Object.entries(index)) {
    index[folder] = sortImagePathsByFilenameNumber(paths);
  }

  return index;
}

function projectFolderFromAssetPath(assetPath: string | undefined): string | null {
  const raw = String(assetPath || '').trim();
  if (!raw.startsWith('/images/projects/')) return null;
  const match = raw.match(/^\/images\/projects\/([^/]+)\//);
  return match ? match[1] : null;
}

const projectImageIndex = buildProjectImageIndex(projectImageFiles);

function normalizeStringList(values: unknown): string[] {
  return Array.isArray(values)
    ? values.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
}

function normalizeStringMap(values: unknown): Record<string, string> {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {};
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    const normalizedKey = String(key || '').trim();
    const normalizedValue = String(value || '').trim();
    if (!normalizedKey || !normalizedValue) continue;
    next[normalizedKey] = normalizedValue;
  }
  return next;
}

function normalizeMonth(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  if (!/^\d{1,2}$/.test(text)) return undefined;
  const numeric = Number(text);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 12) return undefined;
  return String(numeric).padStart(2, '0');
}

function normalizeFeaturedOrder(value: unknown): number | undefined {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return parsed;
}

function numericYear(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numericMonth(value: unknown): number {
  const normalized = normalizeMonth(value);
  if (!normalized) return 1;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 1;
}

function normalizeMedia(value: unknown): Project['media'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const media = value as Record<string, unknown>;
  const heroImage = typeof media.heroImage === 'string' ? media.heroImage : undefined;
  const omitFeaturedFromGallery = media.omitFeaturedFromGallery === true;
  const normalizeMediaItems = (items: unknown): MediaItem[] => (
    Array.isArray(items)
      ? items
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const next = item as Record<string, unknown>;
          const src = typeof next.src === 'string' ? next.src.trim() : '';
          if (!src) return null;
          const type = next.type === 'video' || next.type === 'embed' || next.type === 'image'
            ? next.type
            : 'image';
          const caption = typeof next.caption === 'string' ? next.caption.trim() : '';
          return {
            type,
            src,
            ...(caption ? { caption } : {}),
          };
        })
        .filter((item): item is MediaItem => Boolean(item))
      : []
  );
  const gallery = normalizeMediaItems(media.gallery);
  const featured = normalizeMediaItems(
    Array.isArray(media.featured) ? media.featured : media.placeholders,
  );
  const folder = projectFolderFromAssetPath(heroImage);
  const fallbackGallery: MediaItem[] = folder
    ? (projectImageIndex[folder] || []).map((src): MediaItem => ({ type: 'image', src }))
    : [];
  const resolvedGallery = gallery.length > 0 ? gallery : fallbackGallery;

  return {
    ...(heroImage ? { heroImage } : {}),
    ...(resolvedGallery.length > 0 ? { gallery: resolvedGallery } : {}),
    ...(featured.length > 0 ? { featured } : {}),
    ...(omitFeaturedFromGallery ? { omitFeaturedFromGallery } : {}),
    ...(Array.isArray(media.placeholders) ? { placeholders: normalizeMediaItems(media.placeholders) } : {}),
  };
}

function normalizeProject(raw: string): Project {
  const { data, content } = matter(raw);
  const body = marked.parse(content).toString();

  const project: Project = {
    slug: data.slug ?? '',
    title: data.title ?? 'Untitled',
    subtitle: data.subtitle ?? data.shortDescription ?? '',
    year: data.year ?? '-',
    month: normalizeMonth(data.month),
    layout: normalizeProjectLayout(data.layout),
    category: typeof data.category === 'string' ? data.category : undefined,
    entryLines: normalizeStringList(data.entryLines),
    categoryMeta: normalizeStringMap(data.categoryMeta),
    disciplines: normalizeDisciplines(data.disciplines),
    role: data.role ?? 'Artist',
    client: data.client,
    location: data.location,
    shortDescription: data.shortDescription ?? data.subtitle ?? '',
    tags: normalizeStringList(data.tags),
    moreWork: normalizeStringList(data.moreWork),
    hidden: data.hidden === true,
    hideFromWorkPage: data.hideFromWorkPage === true,
    featured: Boolean(data.featured),
    featuredOrder: normalizeFeaturedOrder(data.featuredOrder),
    omitTechStack: data.omitTechStack === true,
    omitLinkStack: data.omitLinkStack === true,
    techStack: normalizeStringList(data.techStack),
    collaborators: Array.isArray(data.collaborators) ? data.collaborators : undefined,
    cast: Array.isArray(data.cast) ? data.cast : undefined,
    links: data.links,
    media: normalizeMedia(data.media),
    body,
  };

  return project;
}

const projects: Project[] = Object.values(projectFiles)
  .map((raw) => normalizeProject(raw as string))
  .filter((p) => p.slug)
  .sort((a, b) => (
    numericYear(b.year) - numericYear(a.year)
    || numericMonth(b.month) - numericMonth(a.month)
    || a.title.localeCompare(b.title)
  ));

function isProjectHidden(project: Project): boolean {
  return project.hidden === true;
}

function isProjectHiddenFromWorkPage(project: Project): boolean {
  return project.hidden === true || project.hideFromWorkPage === true;
}

export function getAllProjects(): Project[] {
  return projects.filter((p) => !isProjectHidden(p));
}

export function getWorkProjects(): Project[] {
  return projects.filter((p) => !isProjectHiddenFromWorkPage(p));
}

export function getFeaturedProjects(): Project[] {
  return projects
    .filter((p) => p.featured && !isProjectHidden(p))
    .sort((a, b) => {
      const aOrder = normalizeFeaturedOrder(a.featuredOrder);
      const bOrder = normalizeFeaturedOrder(b.featuredOrder);
      if (aOrder != null && bOrder != null && aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      if (aOrder != null && bOrder == null) return -1;
      if (aOrder == null && bOrder != null) return 1;
      return (
        numericYear(b.year) - numericYear(a.year)
        || numericMonth(b.month) - numericMonth(a.month)
        || a.title.localeCompare(b.title)
      );
    });
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug && !isProjectHidden(p));
}

export function getDisciplines(): string[] {
  const set = new Set<string>();
  getWorkProjects().forEach((p) => p.disciplines?.forEach((d) => set.add(d)));
  return Array.from(set);
}
