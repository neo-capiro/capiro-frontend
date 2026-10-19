// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { newsletterPreviewLinks } from './model.js';

describe('newsletter preview destinations', () => {
  it('includes inline rich-text links and recipient footer links', () => {
    const links = newsletterPreviewLinks(
      '<p>Read <a href="https://www.congress.gov/">the bill</a>.</p><footer><a href="*|ARCHIVE|*">Archive</a><a href="*|UNSUB|*">Unsubscribe</a></footer>',
    );
    expect(links).toEqual([
      {
        label: 'the bill',
        url: 'https://www.congress.gov/',
        status: 'Valid destination',
        openable: true,
      },
      { label: 'Archive', url: '*|ARCHIVE|*', status: 'Resolved in Outreach', openable: false },
      { label: 'Unsubscribe', url: '*|UNSUB|*', status: 'Resolved in Outreach', openable: false },
    ]);
  });
  it('flags missing anchors, unsupported merge links, and unsafe destinations', () => {
    const links = newsletterPreviewLinks(
      '<a id="bill"></a><a href="#bill">Bill</a><a href="#missing">Missing</a><a href="*|UNKNOWN|*">Unknown</a><a href="javascript:alert(1)">Unsafe</a>',
    );
    expect(links.map((link) => link.status)).toEqual([
      'Valid destination',
      'Check destination',
      'Check destination',
      'Check destination',
    ]);
    expect(links.every((link) => !link.openable)).toBe(true);
  });
});
