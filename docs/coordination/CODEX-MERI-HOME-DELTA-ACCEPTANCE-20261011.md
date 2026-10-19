# Meri Home source acceptance — 11 October 2026

**ACCEPT offline Home source; no deployment or live integration acceptance.**
Reviewed implementation: `0ba1feb68d847be9b140463badca214b4e52e8bb`, tree
`777e9ac7b5b9656f34191ca73187e70dc18e37d5`, based on frontend main
`02c02d95bdf3949662b9123f425271c6491ffdab`. The following author report
commit `5b3b635f4529e1e9154c3c7f625407c0d479c2cd` changes documentation only.

The six bounded presentation corrections adopt the existing Figma Home:
Meri wordmark, Routines label, suggestion Start placement, exact Routines
icon, lower suggestion spacing and white New conversation plus. No Figma
component creation or write was necessary. The three product modes remain
in the shared header; this delta adds no Portfolio or Modules content.

Canonical owners remain Meri Home/suggestions and their CSS, shared Sidebar
and its CSS, the existing DesignIcon and public Button primitive. Nine
source paths change. No route, dependency, lock, wire contract, backend
owner or agent loop changes. Disabled actions and synthetic scope hints
retain their prior authority and local draft semantics.

Independent source review found no blocking ownership, boundary or behavior
issue. The root inspected frozen Git blobs: all nineteen original asset
bytes and historical manifest fields remain unchanged; both new asset
hashes match the recorded native Figma outputs. The PNG retains 1024×340
dimensions and the SVG has no script, external href or foreignObject.
Root also compared final desktop and 320px captures with the fresh Figma
reference. Responsive adaptations are not mobile design parity or pixel
equality evidence; the Figma reads have no immutable revision identifier.

The author's final package/type/test/architecture checks passed, with 17
root and 21 transport tests; clean production build completed all three
routes. Its six local browser groups passed. A separate reviewer then
verified four behavior groups against the frozen source: literal editable
markup, Enter/Shift+Enter, all six exact drafts and focus, reset/reload,
unavailable actions without URL/draft mutation, narrow bounds, and no
observed external requests or page errors. Counts overlap and must not be
summed into unique acceptance scenarios. All 816 non-document source files
matched frozen Git before that independent run and afterward.

Both browser runs positively observed owned app/browser exits, closed
contexts/connections and successful app-port rebinding. The local preview
uses Chromium 153.0.8010.0 with no sandbox and is not G1 browser, OS network
isolation or host-cleanup qualification. No live backend, authentication,
source access, recovery, provider, AWS or production action ran.

Evidence delivered separately with the Git bundle includes final check/build
outputs, both browser adapters/results, Figma/final renders and retained
failed acquisition/build/harness captures. The author's report records those
failures. Independent preflight first exceeded Node's default raw-Git read
buffer before resource startup; a bounded 32 MiB reader preserved all source
hash assertions. Root's first asset inspection mistakenly used the retained
195-byte failed URL HTML as a native PNG capture; corrected inspection used
the successful native hash and frozen source bytes. Neither repair changed
production code or weakened assertions.

No remote publication, merge or deployment occurred. Git publication remains
blocked by the available credentials/connector permission. Integrate only
into `neo-capiro/capiro-frontend` after fresh path coordination and review.
The Meri backend remains separately owned by `neo-capiro/meri-greenfield`;
G1 remains open and the old worker image remains unadmitted.
