import { describe, expect, it } from 'vitest';
import { normalizeProjectLayout, resolveProjectLayout } from './projectLayout';

describe('project layouts', () => {
  it.each([
    'general_v1',
    'composition_v1',
    'film_v1',
    'theatre_v2',
    'coding_v2',
    'scoring_v1',
  ])('accepts canonical layout %s', (layout) => {
    expect(normalizeProjectLayout(layout)).toBe(layout);
  });

  it('uses Default for a missing or invalid layout without consulting category', () => {
    expect(resolveProjectLayout(undefined)).toBe('general_v1');
    expect(resolveProjectLayout('')).toBe('general_v1');
    expect(resolveProjectLayout('codingv2')).toBe('general_v1');
    expect(resolveProjectLayout('coding-v2')).toBe('general_v1');
  });

  it('uses only the explicit layout value', () => {
    expect(resolveProjectLayout('film_v1')).toBe('film_v1');
    expect(resolveProjectLayout('scoring_v1')).toBe('scoring_v1');
  });
});
