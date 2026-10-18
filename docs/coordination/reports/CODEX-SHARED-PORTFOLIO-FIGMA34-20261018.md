# Portfolio shared desktop shell follow-up

Date: 18 October 2026 UTC. Source base: frontend PR #92, `271a267d`. The feature-owned Portfolio work is [PR #95](https://github.com/neo-capiro/capiro-frontend/pull/95); this follow-up edits only the shared Portfolio shell. Its native [Capiro 3.4 Portfolio Figma file](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-%E2%80%94-Portfolio) was inspected for the Overview `1064:153351`, Prospects `1064:155957`, and client Overview `1064:158895` frames at 1440 × 1040 light theme. PR #95 owns the contents of those pages.

| Route state | Native frame | Shared-shell check |
| --- | --- | --- |
| `/portfolio` Overview | `1064:153351` | 196 px brand slot, desktop PanelLeft x180/y16, 232 px rail, first three rows |
| `/portfolio?type=PROSPECT` | `1064:155957` | Prospects row selected, same header and rail anchors |
| `/portfolio/[clientId]` Overview | `1064:158895` | Client group divider near y235 and retained profile navigation |

The Portfolio brand slot now includes a functional 32 × 32 desktop PanelLeft button at x180/y16. It controls only the Portfolio rail, exposes `aria-expanded` and `aria-controls`, and has a visible keyboard focus outline. The independent mobile menu and the shared `HeaderFrame` were left intact. The existing header actions were extracted into a small presentation component so the shell passes the architecture size gate.

The rail's eyebrow uses the Figma 1.3 line height, each of its first three links occupies 36 px with a 4 px inter-row gap, and the client-group divider has no extra global margin. The ordinary-route 1440 × 1040 browser checks measured header y0–65, button `(180,16,32×32)`, rail `(0,65,232×975)`, first row y≈107, row starts 40 px apart, and client divider y≈235. The rail remains visible when the desktop toggle is expanded, and the main content moves to x0 when collapsed. The browser screenshots are in Playwright's `portfolio-shared-shell` result directory as `portfolio-shell-1440.png` and `portfolio-client-shell-1440.png`.

The Prospects item now indicates the active state for both `/portfolio?type=PROSPECT` and the existing `/portfolio/prospects` Business Development list. Its current link still opens the latter, preserving the only always-visible path to that list on this PR #92 base. PR #95's new Prospects index tab uses the former URL; the Portfolio feature owner should decide whether the sidebar should lead to that tab and provide a separate durable entry to the Business Development list before switching the target. The active-state test checks a single current link and Back/Forward. This destination distinction is a navigation design decision, not a source failure hidden by the visual check.

The Figma PanelLeft asset bytes remain unverified because the temporary Figma asset host returned HTTP 403. The installed Lucide icon matches the measured 18 px glyph placement, but this is not a byte-identity claim. Figma has no supplied collapsed-sidebar frame; the collapsed state follows the existing accessible control pattern. These checks establish shared-shell geometry and interaction, not full PR #95 feature parity, mobile parity, or deployment readiness.

Verification: focused ordinary-route Chromium test **1/1 passed** at 1440 × 1040, including keyboard focus, collapse/reopen, selected state, history, and client divider. Changed-file lint and Prettier passed. Architecture reported `errors: []`, `blocking: 0`, and no Portfolio-shell size findings after extraction; its CLI still exits 1 for repository-wide review signals, including 18 inherited unreviewed findings. `@capiro/web` TypeScript and the root production build passed. No Portfolio feature files, Meri runtime, auth, proxy, asset manifest, lockfile, or deployment source changed.
