import { defineConfig } from '/workspace/capiro-onboard-port-20261013/node_modules/vitest/dist/config.js';
export default defineConfig({
 root: '/workspace/capiro-onboard-port-20261013/apps/web',
 resolve: { alias: { '@': '/workspace/capiro-onboard-port-20261013/apps/web/src' } },
 test: {
  include: ['tests/onboard-funnel-current-read.test.ts','tests/onboard-setup-eligibility.test.ts','tests/onboard-legal-review.test.ts','tests/onboard-it-current-invite.test.ts'],
  environment: 'node', maxWorkers: 1, minWorkers: 1, fileParallelism: false,
 },
});
