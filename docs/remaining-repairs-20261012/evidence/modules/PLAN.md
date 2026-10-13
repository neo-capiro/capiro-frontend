# MS07–09 bounded implementation

Base: PR14 evidence 7aca86e7d64cfdb85d09d424a07e6186339fc24c. Source owner: Modules Workspace and Planner only. Borrowed node_modules -> /workspace/capiro-followup/node_modules; do not mutate.

- MS08: PlannerScreen owns current verified scope navigation and client catalog read. TaskWorkspace owns the All tasks Group by control. Pure task-client-groups owns presentation grouping, using canonical project/task types. TaskViews retains one task-row implementation and renders bounded client sections. Keep taskMatchesClient unchanged (direct client OR current project membership); backend remains authority. Scope navigation disposes current drafts through existing ApplicationBoundary. Direct task client wins grouping; unique project fallback, ambiguous/unknown relationships labeled honestly. Counts are current displayed page, never native totals.
- MS07: Workspace-owned CSS targets actual Radix combobox buttons; retain filtering/query behavior.
- MS09: PublicForm-owned card/style structure matches frame411:108618 while preserving request/submit/abort/receipt/input logic and canonical FormAnswers.
- Reuse existing Capiro fixed operations, SelectInput, TaskViews, selected client lifetime, Link/router, StatusPanel and fixture transport; no shared CSS/registry/transport/private Portfolio imports.
- Figma skill read before initial context+screens for411:95475,411:112533,411:108618. Raw context and actual PNGs saved here. No new design assets required for these owned changes.
- Verification: meaningful unchanged browser regression spec on7aca86e before candidate; pure grouping units including conflicting/ambiguous links; focused browser grouping/scope/failure/back-forward/session replacement, Workspace desktop/mobile geometry+filters, public-form geometry/error retention/receipt/token controls. Typecheck/lint and architecture evidence. Root owns shared architecture review records/full gates.
- No browser/server before root lease. No native/provider/AWS writes or assumptions. These supplementary findings do not accept any of337 native rows wholesale.
