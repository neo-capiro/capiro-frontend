import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestions, selectSuggestion } from '../src/features/meri/suggestions.mjs';

test('six local suggestions produce distinct editable draft text without executable authority', () => {
  assert.equal(suggestions.length, 6);
  assert.equal(new Set(suggestions.map(item => item.id)).size, 6);
  for (const item of suggestions) {
    assert.equal(selectSuggestion(item.id), item.draft);
    assert.ok(item.draft.length > 10);
    assert.deepEqual(Object.keys(item).sort(), ('description' in item ? ['description','draft','id','title'] : ['draft','id','title']).sort());
    assert.ok(Object.isFrozen(item));
  }
  assert.ok(Object.isFrozen(suggestions));
  assert.throws(() => selectSuggestion('invented-skill'), /Unknown local suggestion/);
});
