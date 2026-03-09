import { z } from 'zod';

export const DISCIPLINES = [
  'composition',
  'performance',
  'code-programs',
  'theatre',
  'lighting-production',
  'short-film',
  'sound-design',
  'live-electronics',
  'interactive-media',
  'music-comp',
];

export const MEDIA_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);
export const MEDIA_VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.ogv']);

export const collaboratorSchema = z.object({
  name: z.string().trim().min(1),
  role: z.string().trim().min(1).optional(),
});

export const linksSchema = z.object({
  github: z.string().url().optional(),
  liveDemo: z.string().url().optional(),
  press: z.array(z.string().url()).optional(),
}).default({});

export const galleryItemSchema = z.object({
  type: z.enum(['image', 'video', 'embed']),
  src: z.string().trim().min(1),
  caption: z.string().trim().optional(),
});

export const mediaSchema = z.object({
  heroImage: z.string().trim().min(1),
  gallery: z.array(galleryItemSchema).default([]),
});

export const workFrontmatterSchema = z.object({
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().min(1),
  year: z.string().trim().min(1),
  role: z.string().trim().min(1),
  location: z.string().trim().min(1),
  disciplines: z.array(z.string().trim().min(1)).min(1),
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
  role: z.string().trim().min(1),
  location: z.string().trim().min(1),
  disciplines: z.array(z.string().trim().min(1)).min(1),
  techStack: z.array(z.string().trim().min(1)).default([]),
  collaborators: z.array(collaboratorSchema).default([]),
  links: z.object({
    github: z.string().trim().optional(),
    liveDemo: z.string().trim().optional(),
    press: z.array(z.string().trim()).optional(),
  }).default({}),
  media: z.object({
    heroImage: z.string().trim().min(1),
    gallery: z.array(z.object({
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

export function splitCsv(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
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
