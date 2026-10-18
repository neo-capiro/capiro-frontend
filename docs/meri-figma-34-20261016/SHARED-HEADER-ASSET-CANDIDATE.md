# Current Meri header asset candidate — 16 October 2026

Current Figma Home [1064:144075](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-144075)
and Cited answer [1064:144239](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-144239)
return the same exact four header action assets. Their SVG roots are18×18; the
previous local Home assets have16×16 roots. All five compared Home/Cited common
assets, including the Meri wordmark, are byte-identical across those two current
design-context responses. The existing40×40 action slots already match the
current design; no token, radius, shared header geometry or action changes are
part of this candidate.

The shared frontend owner acknowledged no competing header/DesignIcon/asset
claim and requested this separate per-entry candidate for preservation review.

| Entry | New exact asset | SHA-256 |
| --- | --- | --- |
| Quick log | `apps/web/public/design/header-34-20261016/quick-log.svg` | `66c540f398751bbe854389f8c6004aa7a8a1298dbe4914d1d16654969f5e06e3` |
| Master calendar | `apps/web/public/design/header-34-20261016/calendar.svg` | `91f932f234af981e569c892fc53563a4a1aa03e599c6402103af4bc098f30af9` |
| Search | `apps/web/public/design/header-34-20261016/search.svg` | `7d3879394557c019b4bd6698f52decbf4779333a2b4cae5758300c0e3c1564fe` |
| Updates | `apps/web/public/design/header-34-20261016/updates.svg` | `3e4784382d80efb9b45b8d081a9348287b1ebbe03a15d45239765bf02ad68572` |

`DesignIcon.tsx` admits the additional exact asset set. `Header.tsx` uses it
only for these action entries; modes and profile retain their existing
bindings. `FixtureHeaderActions.tsx` uses its Updates entry. Original files and
manifests remain preserved. `HeaderFrame`, Portfolio/Modules headers, routes,
selected-client links, Settings, operation registry and package files are
unchanged. The source contains no downloaded SVG path rewriting or intrinsic
size overrides.

The two authored synthetic desktop browser controls bind the actual1440×1040
Home/Cited rendering to nonempty loaded18px assets,40px controls, keyboard focus
and unchanged navigation. They are **UNRUN**. Playwright parity has not started;
no browser/build lease is present. Source asset binding is not rendered visual,
accessibility, runtime or release acceptance.

Sandbox asset download failed with `curl(6): Could not resolve host:
www.figma.com`. Authorized network escalation then completed the exact
downloads with exit0; no substitute asset or alternate provider was used.
The complete23-entry comparison is retained in the current audit evidence.
