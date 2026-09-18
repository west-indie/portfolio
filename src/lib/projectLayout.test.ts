import { describe, expect, it } from 'vitest';
import { resolveProjectLayout } from './projectLayout';

describe('resolveProjectLayout', () => {
  it('honors an explicit coding v2 layout', () => {
    expect(resolveProjectLayout('codingv2', 'program')).toBe('codingv2');
  });

  it('keeps coding v1 as the default for program entries', () => {
    expect(resolveProjectLayout(undefined, 'program')).toBe('codingv1');
  });
});
