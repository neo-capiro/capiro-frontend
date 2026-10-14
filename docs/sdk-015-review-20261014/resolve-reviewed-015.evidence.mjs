import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
const root = '/tmp/capiro-meri-sdk-compare/0.1.5/package/';
const exports = {".": {"types": "./dist/index.d.ts", "default": "./dist/browser.mjs"}, "./browser": {"types": "./dist/browser.d.ts", "default": "./dist/browser.mjs"}, "./node": "./validate.mjs", "./metadata": {"types": "./dist/metadata.d.ts", "default": "./dist/metadata.mjs"}, "./schema": "./meri.schema.json", "./action-application": {"types": "./dist/action-application.d.ts", "default": "./dist/action-application.mjs"}, "./action-application/schema": "./dist/action-application.schema.json", "./document-application": {"types": "./dist/document-application.d.ts", "default": "./dist/document-application.mjs"}, "./document-application/schema": "./dist/document-application.schema.json", "./conversation-application": {"types": "./dist/conversation-application.d.ts", "default": "./dist/conversation-application.mjs"}, "./conversation-application/schema": "./dist/conversation-application.schema.json", "./conversation-lifecycle": {"types": "./dist/conversation-lifecycle.d.ts", "default": "./dist/conversation-lifecycle.mjs"}, "./conversation-lifecycle/schema": "./dist/conversation-lifecycle.schema.json"};
registerHooks({ resolve(specifier, context, nextResolve) {
  const name = '@capiro/meri-contracts';
  if (specifier === name || specifier.startsWith(name + '/')) {
    const key = specifier === name ? '.' : '.' + specifier.slice(name.length);
    const target = exports[key];
    if (!target) throw Error('Unknown reviewed public contract export');
    return { url: pathToFileURL(root + (typeof target === 'string' ? target : target.default)).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}});
