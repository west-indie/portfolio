import type { ProjectLayout } from '../types/project';

export const DEFAULT_PROJECT_LAYOUT: ProjectLayout = 'general_v1';

const PROJECT_LAYOUTS = new Set<ProjectLayout>([
  'general_v1',
  'composition_v1',
  'film_v1',
  'theatre_v2',
  'coding_v2',
  'scoring_v1',
]);

export function normalizeProjectLayout(value: unknown): ProjectLayout | undefined {
  const normalized = String(value || '').trim().toLowerCase();
  return PROJECT_LAYOUTS.has(normalized as ProjectLayout)
    ? normalized as ProjectLayout
    : undefined;
}

export function resolveProjectLayout(layout?: unknown): ProjectLayout {
  return normalizeProjectLayout(layout) ?? DEFAULT_PROJECT_LAYOUT;
}
