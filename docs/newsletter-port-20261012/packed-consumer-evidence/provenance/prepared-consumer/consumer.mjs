import assert from 'node:assert/strict';
import { defaultNewsletterConfig, NEWSLETTER_TEMPLATE_ID } from '@capiro/shared/newsletter';
import { newsletterSafeUrl, renderNewsletterDesign } from '@capiro/shared/newsletter-render';
assert.equal(NEWSLETTER_TEMPLATE_ID,'bp_weekly_newsletter');
assert.equal(defaultNewsletterConfig().schedule.mode,'now');
assert.equal(newsletterSafeUrl('javascript:bad'),'');
assert.equal(typeof renderNewsletterDesign,'function');
console.log('Actual Node ESM named imports resolved both packed public subpaths.');
