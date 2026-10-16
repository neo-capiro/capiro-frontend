import test from 'node:test';
import assert from 'node:assert/strict';
import { logicalPromptKey, shouldShowPrompt } from '../src/features/meri/conversation/prompt-identity.ts';

test('synthetic: resumed run segments share one logical prompt while distinct submissions remain distinct', () => {
  const first = { promptKey: logicalPromptKey('conversation-a', 'request-1') };
  const resumed = { promptKey: logicalPromptKey('conversation-a', 'request-1') };
  const newSubmission = { promptKey: logicalPromptKey('conversation-a', 'request-2') };
  assert.equal(shouldShowPrompt(first, []), true);
  assert.equal(shouldShowPrompt(resumed, [first]), false);
  assert.equal(shouldShowPrompt(newSubmission, [first, resumed]), true);
});

test('synthetic: fork identity is conversation-local even if logical request identifiers coincide', () => {
  const source = { promptKey: logicalPromptKey('conversation-a', 'request-1') };
  const fork = { promptKey: logicalPromptKey('conversation-b', 'request-1') };
  assert.equal(shouldShowPrompt(fork, [source]), true);
});

test('synthetic: absent lineage never hides a prompt based on earlier missing lineage', () => {
  assert.equal(shouldShowPrompt({}, [{}, {}]), true);
  assert.notEqual(logicalPromptKey('a,b', 'c'), logicalPromptKey('a', 'b,c'));
});
