import type { ProjectLayout } from '../types/project';

export const DEFAULT_PROJECT_LAYOUT: ProjectLayout = 'general_v1';

const CATEGORY_LAYOUT_MAP: Record<string, ProjectLayout> = {
  performance: 'theatre_v2',
  theatre: 'theatre_v2',
  film: 'film_v1',
  'feature-film': 'film_v1',
  'short-film': 'film_v1',
  general: 'general_v1',
  interactive: 'codingv1',
  'interactive-media': 'codingv1',
  installation: 'general_v1',
  tooling: 'codingv1',
  program: 'codingv1',
  programs: 'codingv1',
  'theatre-v1': 'theatre_v1',
  'theatre-v2': 'theatre_v2',
  'film-v1': 'film_v1',
  'general-v1': 'general_v1',
  codingv1: 'codingv1',
  'coding-v1': 'codingv1',
};

function normalizeCategoryToken(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeLayoutId(value: unknown): ProjectLayout | undefined {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === 'codingv1' || raw === 'coding_v1' || raw === 'coding-v1') {
    return 'codingv1';
  }

  const normalized = raw.replace(/[\s-]+/g, '_');
  if (
    normalized === 'theatre_v1'
    || normalized === 'theatre_v2'
    || normalized === 'film_v1'
    || normalized === 'general_v1'
  ) {
    return normalized;
  }

  return undefined;
}

export function normalizeProjectLayout(value: unknown): ProjectLayout | undefined {
  return normalizeLayoutId(value);
}

export function resolveProjectLayout(_layout?: unknown, category?: unknown): ProjectLayout {
  const normalizedCategory = normalizeCategoryToken(category);
  return CATEGORY_LAYOUT_MAP[normalizedCategory] ?? DEFAULT_PROJECT_LAYOUT;
}
