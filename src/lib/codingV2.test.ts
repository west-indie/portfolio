import { describe, expect, it } from 'vitest';
import { codingV2Body } from './codingV2';

describe('codingV2Body', () => {
  const markdown = '## Built around the task\n\nIntro.\n\n## Workflow\n\n1. Paste\n2. Export\n\n## Design and build notes\n\nNotes.';

  it('keeps workflow steps when shown', () => {
    expect(codingV2Body(markdown, false)).toBe(markdown);
  });

  it('hides only the workflow section when omitted', () => {
    const visible = codingV2Body(markdown, true);
    expect(visible).not.toContain('Paste');
    expect(visible).not.toContain('## Workflow');
    expect(visible).toContain('Intro.');
    expect(visible).toContain('Notes.');
  });

  it('keeps workflow-like headings inside code fences', () => {
    const source = '```md\n## Workflow\n```\n\n## Design and build notes\n\nNotes.';
    expect(codingV2Body(source, true)).toContain('## Workflow');
  });

  it('hides a custom-titled process section by its workflow markup', () => {
    const source = '## Groove first\n\nIntro.\n\n## Signal flow\n\n<div class="codingv2-workflow">Steps</div>\n\n## Designed for movement\n\nNotes.';
    const visible = codingV2Body(source, true);
    expect(visible).not.toContain('Signal flow');
    expect(visible).not.toContain('Steps');
    expect(visible).toContain('Groove first');
    expect(visible).toContain('Designed for movement');
  });
});
