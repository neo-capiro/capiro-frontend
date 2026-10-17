# Capiro 3.4 — verified mockup and coverage handoff

Completed 16 October 2026. These are Figma design and prototype changes. No application code, API contract, backend, deployment or shared data changed. This documentation-only branch is based on the supplied source commit 3930e36593960966edaa39f8f7f25faa14f9654a; it does not merge or replace the implementation lanes.

The 17 October follow-up checks all Portfolio and Modules coverage against 3.1, adds full review directories, repairs navigation between the split files, and places Newsletter under Modules → Workspace → Workflows. See [coverage, source mappings and navigation](PARITY-AND-NAVIGATION.md).

## Full files and review directories

- [Meri 3.4 file](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri)
- [Portfolio 3.4 file](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio) · [full screen directory](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3069-54192)
- [Modules, Workspace and Settings 3.4 file](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-Modules) · [full screen directory](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3060-110154)

## Review the designs

- [Meri — delivery, recovery, partial history and meeting context](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3089-40132)
- [Portfolio — linked review index for all requested states](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3043-54839)
- [Modules — Newsletter empty start, example and first edit](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=1174-277401)
- [Modules — Template Studio loading and recovery](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=1064-254667)
- [Modules — Strategy loading and recovery](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3043-105796)

## Exact state catalogs and decisions

- [Meri D01–D04 completion](../meri-figma-34-20261016/FIGMA-GAPS-COMPLETION.md)
- [Portfolio gaps 1–5 completion](PORTFOLIO-COMPLETION.md)
- [Modules gaps 6–7 completion](MODULES-COMPLETION.md)

Meri retains the exact original message independently of the next draft. Retry same request reuses the original input and identity; Check status is a read. Accepted/Queued requires positive trusted evidence. Refresh/history 404/503/RESERVED cannot authorize a replacement request. Loaded history preserves earlier turns and the current prompt, including distinct turns with identical text. The Workspaces/Recent visual shell is superseded by Conversations/Files/Runs; Open meeting leads to the existing Portfolio meeting workspace.

Objective drafts can save incomplete or empty; review requires Outcome, Government problem, Type of ask and Minimum win, with Limits optional. Association changes remain requested until confirmed, support multiple projects/shared tasks, and distinguish direct from inherited links. Uncertain saves reconcile rather than blindly resubmit.

Location evidence includes units, reporting periods and review state. Government/Federal missing coverage is distinct from a supported zero; requested program context is distinct from client awards. The combined modal and ten-category location profile are preserved. Native location motion has enter/exit and immediate reduced-motion paths; keyboard focus return is an implementation requirement.

Newsletter empty, populated example and first local edit are distinct. Local blank/first-edit Save/Stage controls intentionally do not pretend to persist through the existing populated example. Template/Strategy loading, denied, failed and stale reads never establish Live/refreshed-just-now status.

## Validation

| Area | Indexed review frames | Checks |
| --- | ---: | --- |
| Meri | 23 | Geist, native text/clipping bounds, editable components,584 prototype edges with no missing destinations; independent semantic review passed after targeted corrections |
| Portfolio | 42 | Native visible text bounds and sibling overlaps clear, Geist,887 prototype edges / 75 destinations with no missing/self links; native enter/exit/reduced-motion keyframes read back |
| Modules | 12 | Scroll-aware native text bounds clear, existing typography/components retained,415 final prototype edges / 61 destinations resolve; no unsupported freshness claims |

Representative visual checks and targeted post-fix screenshots passed; Portfolio and Modules also exported every indexed frame. Screenshots and mutation ledgers remain local authoring evidence. The Figma URLs above are the portable reference for the implementation team.

These checks establish design/prototype quality. They do not qualify live authorization, admission, persistence, data freshness or backend integration. Mobile Meri remains deferred under the supplied desktop-only audit scope.
