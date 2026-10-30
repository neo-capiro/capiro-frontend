# Daily Stoic quote — attribution and sources

`stoic-quotes.json` is the verified editorial catalog shipped with the Meri landing view.
Anything that changes its words, metadata or order must be re-verified against the primary
texts below; the app never paraphrases, generates or fetches quotations at runtime.

Catalog: 120 quotations, 120 distinct texts, longest 163 characters, authors interleaved.

| Author               | Work                     | Translator                 | Transcription    |
| -------------------- | ------------------------ | -------------------------- | ---------------- |
| Marcus Aurelius (55) | Meditations              | George Long                | Gutenberg #15877 |
| Epictetus (25)       | Enchiridion              | Thomas Wentworth Higginson | Gutenberg #45109 |
| Seneca (17)          | Of Anger                 | Aubrey Stewart             | Gutenberg #64576 |
| Seneca (11)          | Of Peace of Mind         | Aubrey Stewart             | Gutenberg #64576 |
| Seneca (7)           | Of a Happy Life          | Aubrey Stewart             | Gutenberg #64576 |
| Seneca (5)           | Of the Shortness of Life | Aubrey Stewart             | Gutenberg #64576 |

Each entry carries `work`, `locator` (book/chapter or letter/section), `translator`,
`sourceURL` (the exact section in the public-domain transcription) and `editionURL`.
Those fields are shown through the quiet "Source" disclosure under the quote; the app does
not bundle the source books.

Selection is deterministic: the quote index is the local civil day number modulo the catalog
length, so every reader sees the same quotation for the same local date and the rotation
advances once per local calendar day.
