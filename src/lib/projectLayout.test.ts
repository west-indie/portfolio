import { describe, expect, it } from 'vitest';
import { resolveProjectLayout } from './projectLayout';

describe('resolveProjectLayout', () => {
  it('honors an explicit coding v2 layout', () => {
    expect(resolveProjectLayout('codingv2', 'program')).toBe('codingv2');
  });

  it('uses coding v2 as the default for coding categories', () => {
    expect(resolveProjectLayout(undefined, 'interactive')).toBe('codingv2');
    expect(resolveProjectLayout(undefined, 'interactive-media')).toBe('codingv2');
    expect(resolveProjectLayout(undefined, 'tooling')).toBe('codingv2');
    expect(resolveProjectLayout(undefined, 'program')).toBe('codingv2');
    expect(resolveProjectLayout(undefined, 'programs')).toBe('codingv2');
  });

  it('retains coding v1 only when explicitly selected', () => {
    expect(resolveProjectLayout('codingv1', 'program')).toBe('codingv1');
  });
});
