# Meri 3.4 coverage register

[Open Meri 3.4](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea).

All 24 groups and all 41 matrix areas are mapped to actual Figma frame IDs in COVERAGE-REGISTER.json. The register references 320 unique frames, including new states, updated existing views and explicitly qualified legacy references.

The exact final desktop recovery gaps identified during this pass are drawn. The 17 previously unwired phone/tablet controls are now closed with 32 matching-size detail states. Eight responsive chat views and the shared mobile header also have final QA receipts. This does not certify backend integrations, provider activation, live acceptance or native artifact fidelity. Existing lifecycle/browser references remain source-conditional. Groups 17–24 cover Meri results, review and handoff; complete owner-module applications are outside this file's audit.

## Updated screen families

- Settings/MCP: 41 views, including seven settings views rebuilt in place and 34 new views. [Connected services](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3213-47223).
- Office/files: 40 new views and six existing A7 states corrected. See [FRAME-REGISTER.json](FRAME-REGISTER.json) and [validation](VALIDATION.md).
- Chat: first-message recovery, history, Tools, question selection/submission, Stop recovery and illustrative usage states. See [FRAME-REGISTER.json](FRAME-REGISTER.json) and the final SDK-question checks in [validation](VALIDATION.md).
- Governance: memory, contextual action review, routines, Updates panels and module result/handoff states. The final Governance pass covers 104 screens/panels, including 32 added responsive details. See [validation](VALIDATION.md).
- Final recovery: 13 native chat views for selected-tab verification, attachment outcomes and search clarification/retry. [Open recovery section](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-76659).

## Group coverage

| Group | Area | Matrix areas | Frame references |
|---|---|---|---|
| 01 | Chat home, scope and history | M01, M41 | 24 |
| 02 | Answer detail, sources, usage and feedback | M02, M41 | 12 |
| 03 | Model selection and preferences | M03, M41 | 18 |
| 04 | Questions, approvals and action receipts | M04, M37 | 27 |
| 05 | Runs, background work, delegation and routines | M09, M38 | 26 |
| 06 | Skills, procedures and website-workflow selection | M10, M14 | 15 |
| 07 | Connected services / MCP directory | M11, M12 | 25 |
| 08 | Managed browser and selected-tab sharing | M13, M15 | 16 |
| 09 | Attachments and source extraction | M16, M17 | 16 |
| 10 | Files, notebooks and computation | M06, M07, M08 | 8 |
| 11 | Document generation, revision and Workspace filing | M23, M25, M26 | 10 |
| 12 | Embedded Office editor and publication | M27, M28 | 24 |
| 13 | Office fidelity, charts and PDF | M24, M29 | 13 |
| 14 | Personal/client/firm memory and learning | M18, M19, M20, M21 | 47 |
| 15 | Updates and notifications | M22 | 7 |
| 16 | Search, SQL answers and source readers | M05, M25, M30, M32 | 10 |
| 17 | Research portfolio and Classic | M31 | 3 |
| 18 | Graph, buyers, procurement and Money Flow | M33 | 5 |
| 19 | Legislative workbench and bill/hearing readers | M34, M32 | 7 |
| 20 | Meetings, calendar, hearing media and debrief | M35, M32 | 7 |
| 21 | Outreach, BizDev, Tracker and alerts | M36 | 3 |
| 22 | Objectives, Strategy, Planner and automation | M39 | 4 |
| 23 | Forecasts, Hub and Portfolio | M40, M33, M32 | 3 |
| 24 | Newsletter, CRM and remaining connected-data families | M32, M36, M41 | 2 |

M32 and M37 include explicit cross-cutting mappings. A common receipt or reader pattern does not certify every action or data family.

## Final recovery frames

| State | Figma |
|---|---|
| 23.01 · The selected tab could not be verified | [3234:76660](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-76660) |
| 23.02 · Capture a fresh copy of this page | [3234:76872](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-76872) |
| 23.03 · Tab sharing is paused | [3234:77084](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-77084) |
| 23.04 · This file is too large to attach | [3234:77296](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-77296) |
| 23.05 · This file cannot be used as a source | [3234:77508](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-77508) |
| 23.06 · Some extracted text needs review | [3234:77723](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-77723) |
| 23.07 · Upload canceled before it started | [3234:77941](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-77941) |
| 23.08 · This attachment is no longer accessible | [3234:78156](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-78156) |
| 23.09 · Which period should I use? | [3234:78371](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-78371) |
| 23.10 · No matching meetings were found | [3234:78586](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-78586) |
| 23.11 · This search could not complete | [3234:78807](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-78807) |
| 23.12 · Your revised request is ready | [3234:79022](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-79022) |
| 23.13 · Searching recorded meetings… | [3234:79231](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3234-79231) |

The 13 recovery views pass Geist, 1440×1040 geometry, one contained transcript and no horizontal detail overflow checks. Three representative screenshots were inspected. Twenty-four click transitions and one illustrative delayed result transition are saved. Prototype transitions illustrate expected states; they do not send real requests.

Cancellation is deliberately qualified: a proven pre-dispatch cancel is distinct from an uncertain dispatched upload. Selected-tab rejection uses current aggregate changed/unverifiable semantics. Low-confidence or blocked extraction reflects returned service evidence, not a fabricated scanner result.

## Remaining qualification

- Populate model/effort choices only from actual qualified catalogs; no fabricated model prices or capabilities.
- Re-certify source-conditional legacy lifecycle and browser controls before implementation.
- Complete owner-module workflows and cross-file destinations remain their owners' responsibility.
- Validate real providers, scan/extraction, native Office editing/export, notebook execution, browser lifecycle and per-family authorization with live acceptance checks.

This handoff changes documentation only. It does not change the application or deployment.

The existing [dark-home frame](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-148697) now matches the current quiet home with its existing orb and shared composer, using the charcoal gradient and Newsreader quote. It is explicitly a local appearance preview; no global theme implementation is implied.