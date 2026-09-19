import assert from 'node:assert/strict';
import {
  buildCategoryEntryLines,
  isHttpUrl,
  isKnownCategory,
  isYearValid,
  normalizeHttpUrl,
  normalizeTagList,
  parseCollaboratorsCsv,
  projectLayoutSchema,
  slugify,
  splitCsv,
  workFrontmatterSchema,
} from '../lib/schema.mjs';

export default async function run() {
  assert.equal(slugify('Signal Weaver 2026!'), 'signal-weaver-2026');
  assert.deepEqual(splitCsv('a, b\n c'), ['a', 'b', 'c']);
  assert.deepEqual(parseCollaboratorsCsv('A:Director,B:Producer,C'), [
    { name: 'A', role: 'Director' },
    { name: 'B', role: 'Producer' },
    { name: 'C' },
  ]);
  assert.equal(normalizeHttpUrl('github.com/example/repo'), 'https://github.com/example/repo');
  assert.equal(normalizeHttpUrl('https://example.com'), 'https://example.com');
  assert.equal(isHttpUrl(normalizeHttpUrl('example.com')), true);
  assert.equal(isYearValid('2026'), true);
  assert.equal(isYearValid('1899'), false);
  assert.equal(isKnownCategory('performance'), true);
  assert.equal(isKnownCategory('unknown'), false);
  for (const layout of ['general_v1', 'composition_v1', 'film_v1', 'theatre_v2', 'coding_v2', 'scoring_v1']) {
    assert.equal(projectLayoutSchema.safeParse(layout).success, true);
  }
  assert.equal(projectLayoutSchema.safeParse('codingv2').success, false);
  const missingLayout = workFrontmatterSchema.safeParse({});
  assert.equal(missingLayout.success, false);
  assert.ok(missingLayout.error.issues.some((issue) => issue.path.join('.') === 'layout'));
  assert.deepEqual(normalizeTagList([' Sound Design ', 'sound-design', 'Music Composition']), [
    'sound design',
    'music composition',
  ]);
  assert.deepEqual(buildCategoryEntryLines('performance', { venue: 'Old Globe', runDates: 'Apr 2026' }), [
    'Venue: Old Globe',
    'Run Dates: Apr 2026',
  ]);
}
