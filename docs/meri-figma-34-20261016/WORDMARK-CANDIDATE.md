# Current Meri wordmark binding

This narrow successor to the shared-header candidate reuses the existing
`apps/web/public/design/cited-answer/meri-ink.png` in the Home, inner-page and
document-workspace masks. Its bytes match the separately retrieved current
Home and Cited Answer artwork from Figma nodes1064:144075 and1064:144239.

The PNG is1583bytes,124x40, SHA256
`880d2a37cd998583d9fec14a71ca340691ad3a3f25830c3cc72900d867219007`.
The previous Home PNG remains intact. The three CSS changes only replace the
asset URL; the62x20slot, foreground token, spacing and layout are unchanged.
No duplicate asset, package, lock, SDK, API or conversation change is included.

The three authored desktop controls cover Home, a generic inner page and the
document workspace. They check actual mask URL, rendered slot, intrinsic PNG
dimensions and absence of document mutations, then capture screenshots.
They remain **UNRUN**; downloaded-byte equality and source inspection do not
establish rendered parity or accessibility acceptance.

Exact byte provenance is in [wordmark-binding.json](evidence/wordmark-binding.json).
The source formatter completed with128MiB heap, PID8568, exit0,349.5338ms and
no timeout. No compiler, runtime test, browser, install or build ran here.

This is a separately reviewable Meri-only source candidate. The preceding
shared-header commit remains independently reviewable at
`aecec5813d51f2b3f0386130bb350edbb04e3c53`, with
**ACCEPT_SOURCE_ONLY_PRESERVATION** and browser/build/adoption still open.
