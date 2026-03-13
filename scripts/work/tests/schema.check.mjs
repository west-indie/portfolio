import assert from 'node:assert/strict';
import {
  buildCategoryEntryLines,
  isHttpUrl,
  isKnownCategory,
  isYearValid,
  normalizeHttpUrl,
  normalizeTagList,
  parseCollaboratorsCsv,
  slugify,
  splitCsv,
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
  assert.deepEqual(normalizeTagList([' Sound Design ', 'sound-design', 'Music Composition']), [
    'sound design',
    'music composition',
  ]);
  assert.deepEqual(buildCategoryEntryLines('performance', { venue: 'Old Globe', runDates: 'Apr 2026' }), [
    'Venue: Old Globe',
    'Run Dates: Apr 2026',
  ]);
}
