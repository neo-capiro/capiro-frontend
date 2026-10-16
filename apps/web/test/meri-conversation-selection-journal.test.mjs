import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { conversationSelectionOwner } from '../src/shared/meri-conversations/query-journal.ts';

const account = { tenantId: 'synthetic-tenant', actorId: 'synthetic-actor' };
const context = (conversationId, runId, clientId = 'client-a') => ({
  ...account, conversationId, runId, selectedClientId: clientId,
});

test('synthetic: explicit conversation selection never inherits the previous conversation run hint', () => {
  const cache = new QueryClient();
  try {
    const a = conversationSelectionOwner(cache, account, 'client-a', 'conversation-a');
    a.record(context('conversation-a', 'run-a'));
    const b = conversationSelectionOwner(cache, account, 'client-a', 'conversation-b');
    assert.deepEqual(b.hints, { clientId: 'client-a', conversationId: 'conversation-b' });
    assert.deepEqual(conversationSelectionOwner(cache, account, 'client-a', 'conversation-a').hints,
      { clientId: 'client-a', conversationId: 'conversation-a', runId: 'run-a' });
  } finally { cache.clear(); }
});

test('synthetic: ordinary current selection and explicit selection retain independent exact hints', () => {
  const cache = new QueryClient();
  try {
    conversationSelectionOwner(cache, account, 'client-a').record(context('current', 'run-current'));
    assert.deepEqual(conversationSelectionOwner(cache, account, 'client-a', 'selected').hints,
      { clientId: 'client-a', conversationId: 'selected' });
    assert.deepEqual(conversationSelectionOwner(cache, account, 'client-a').hints,
      { clientId: 'client-a', conversationId: 'current', runId: 'run-current' });
  } finally { cache.clear(); }
});

test('synthetic: replaced canonical cache cannot be repopulated by a former selection owner', () => {
  const cache = new QueryClient();
  try {
    const old = conversationSelectionOwner(cache, account, 'client-a', 'conversation-a');
    cache.clear();
    conversationSelectionOwner(cache, account, 'client-a', 'conversation-a');
    old.record(context('conversation-a', 'stale-run'));
    assert.deepEqual(conversationSelectionOwner(cache, account, 'client-a', 'conversation-a').hints,
      { clientId: 'client-a', conversationId: 'conversation-a' });
  } finally { cache.clear(); }
});

test('synthetic: actor, tenant and selected-client replacements never inherit a selected run', () => {
  const cache = new QueryClient();
  try {
    conversationSelectionOwner(cache, account, 'client-a', 'conversation-a').record(context('conversation-a', 'run-a'));
    for (const [nextAccount, nextClient] of [
      [{ ...account, actorId: 'another-actor' }, 'client-a'],
      [{ ...account, tenantId: 'another-tenant' }, 'client-a'],
      [account, 'client-b'],
    ]) assert.deepEqual(conversationSelectionOwner(cache, nextAccount, nextClient, 'conversation-a').hints,
      { clientId: nextClient, conversationId: 'conversation-a' });
  } finally { cache.clear(); }
});
