## Change

Rebuilds the basic Workspace newsletter's template, builder, review and staging
presentation around the visible Capiro 3.4 `NL/*` layers. The sibling `Main`
layers are hidden and are not the target. Shared shell styling, save/recovery,
staging payloads, backend authorization and delivery behavior remain with their
existing owners.

| Step              | Frame         | Visible layer |
| ----------------- | ------------- | ------------- |
| Select template   | `1064:260850` | `1170:275456` |
| Builder           | `1064:260936` | `1170:275629` |
| Review            | `1064:261027` | `1170:275852` |
| Stage in Outreach | `1064:261084` | `1170:275995` |

The feature-scoped CSS owns the 1160px content column, 24px desktop gutter,
154px builder rail, 354px inspector, filters/cards, shared tab styling and narrow
layout. Existing shared Tabs retains keyboard navigation. Counts and comment
rows share one review-only read/reload owner; the existing standalone comments
surface keeps its original query. Review retains subject/preheader visibility,
and the static Modules breadcrumb introduces no unguarded draft exit.

## Scope and review

The original nine staging entries expand to eleven files: five modified source
files, the new CSS module, two browser specs and three docs. The user explicitly
approved one additional file, `scripts/architecture/reviewed-size-findings.json`,
limited to seven independently reviewed records. The final diff has twelve
files; unrelated screenshot modifications are excluded.

Independent Codex review accepted source `8fe393504` and all seven exact
responsibility fingerprints after the exit, subject/preheader, library and unused
prop corrections. The CSS module is the scoped visual contract; the existing
shared controls and immutable save/staging owners retain behavior.

## Deliberate deviations

Frame controls with no implementation behind them are not drawn; capabilities
the product already has are not deleted.

- Builder header keeps **Save draft** beside Preview / Save and exit / Stage in Outreach; the frame's `Actions` and `Comments` buttons are omitted.
- Builder rail draws ADD CONTENT + BLOCKS + the ten existing actions; Sections/Styles/Optimize tabs, Video/Apps/Footer, Columns layouts and Saved sections are omitted.
- Builder inspector remains **Newsletter settings** (Subject, Preview text, Document name, Client, Firm name, Mailing address, Change template, Convert to rich newsletter).
- Review keeps **Stage in Outreach**, subject/preheader and the existing comment composer; Invite and In-app notifications are omitted.
- Stage keeps the saved-version/session selection and explicit review checkbox required by its contract; the primary button stays **Stage saved version**.
- The shared shell's `← Modules / Workspace` breadcrumb remains above the workflow.
- Blank template remains an empty canvas (MOD-D01). Existing preset content and inert paper/editor controls are retained, rather than replacing them with the design's illustrative content.
- Drafts and Saved templates tabs link to canonical Workspace/Templates screens. They do not claim to load a complete inline library or apply a saved template here; preset filters are hidden on those tabs.

Copy changes: Create a newsletter → Select a template; Newsletter preview &
review → Newsletter review; Preview & review → Preview; Apply template / Start
blank → Apply. Existing save/staging assertions were preserved.

## Validation

Compared against integration base `6d1465cf903b7a85bc716590eacc33dc2a81c570`.
No assertion was weakened or unrelated failure repaired to make this PR green.

| Check                                          | Result                                                                                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript; touched ESLint and Prettier        | Pass                                                                                                                                                            |
| Final parity/browser correction cases          | 5/5 pass: 1160px layout, keyboard filters/tabs, guarded exit, subject/preheader, canonical library links, 390px fit, 760px stage dialog and shared count reload |
| Existing staging + atomic-save                 | 33/33 pass                                                                                                                                                      |
| Focused browser run including rich cases       | 47 pass / 5 fail; exact five also fail on untouched `b9eb11fa` (9 pass / 5 fail)                                                                                |
| Previously unrun asset/brand/provider families | 48/48 pass                                                                                                                                                      |
| Delivery/receiving                             | Same 13 failures on candidate and untouched current main; fixtures fail before their target screen                                                              |
| Full lint                                      | Same 14 errors / 93 warnings as current main; no touched-file errors                                                                                            |
| Full format                                    | Same 114 flagged paths as current main; all touched source/spec files pass                                                                                      |
| `test:capiro`                                  | Same 843 passed / 15 failed, seven failed suites as current main                                                                                                |
| Architecture                                   | Seven touched findings independently reviewed; unrelated baseline findings/errors retained                                                                      |

Four 1440×1040 captures were inspected against the existing Figma exports.
They demonstrate the scoped layout with the deviations above, not pixel-exact
identity or deployed behavior. Evidence is retained in the delivery
orchestrator's `work/newsletter-finish-20261031/`, including baseline logs,
traces, hashes and `final-captures/01-template.png` through `04-stage.png`.

Release remains the sole cloud owner. Production deployment and authenticated
acceptance are not claimed by this PR; the bounded post-deploy check does not
save, submit a stage, or send a message.
