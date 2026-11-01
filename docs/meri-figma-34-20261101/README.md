# Meri 3.4 — current UI and state coverage

Updated 1 November 2026 against frontend commit [580f4478eaa732c084858b4e764443e79b9782c9](https://github.com/neo-capiro/capiro-frontend/commit/580f4478eaa732c084858b4e764443e79b9782c9) and the two user-supplied November 1 inventories. Current main matched that source at the initial inspection. A final comparison through `e05d950a6a50cd3f2b344ac84ef3b9233c3448ca` checked the subsequent Meri change: readable memory-title fallback. Existing readable titles remain valid; machine identifiers must not become visible headings. This is a Figma and documentation handoff; no application code or deployment changed.

## Start here

- [Meri 3.4 review index](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3244-78203)
- [Current home](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-144075)
- [Current conversation](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-144239)
- [Coverage summary](COVERAGE-REGISTER.md), [machine-readable coverage](COVERAGE-REGISTER.json), [frame IDs and links](FRAME-REGISTER.json)
- [Source reconciliation](source/SOURCE-RECONCILIATION.md), [validation and limits](VALIDATION.md)

## Agent implementation scope

Use the current Figma review index and [FRAME-REGISTER.json](FRAME-REGISTER.json) as the primary references. [SCREEN-INVENTORY.json](SCREEN-INVENTORY.json) lists retained supporting views, overlays and design aids; those do not imply additional application routes. Follow the source gates and qualifications in the coverage register.

Do not implement anything in [REMOVED-SCREENS.json](REMOVED-SCREENS.json). Older QA snapshots may mention retired node IDs as historical evidence; [cleanup validation](qa/CLEANUP-QA.json) and the current registers take precedence. Do not recreate the old Plate comments/draft UI, global approval inbox or standalone Runs navigation.

## Result

All 24 inventory groups and 41 acceptance areas are mapped to 318 retained Figma coverage references. These include current states and rebuilt views; the count is not a count of newly created screens. The cleanup removed 91 obsolete or duplicate screens and seven empty sections.

The active experience uses the current quiet chat shell: recent chats, Library, an on-demand Tools drawer, a persistent draft and contained transcript scrolling. Standalone Runs, superseded workflow launch dashboards and old comparison screens have been deleted from the file. Two remaining Tools Runs launchers were hidden and eight history/background links now open their conversation. Inline questions, governed review, useful background-work status and recovery remain available in context.

Geist is used for interface text and answers, Newsreader for the daily quote, and Geist Mono for technical content. Answers use 15 px / 25.5 px leading. The existing Capiro components, neutral palette, charcoal buttons and source-established AI Elements, shadcn/Radix, ReUI and Motion conventions are retained. No new runtime dependency was installed.

The pass includes message delivery/history recovery; source and usage detail; selection and tool availability; attachments, browser and search recovery; Office private editing/save/release/publish; personal and scoped memory; action review; routines; Updates; MCP/Connected services; preferences; and contextual results for owner modules. Newsletter remains a Modules → Workspace workflow.

Desktop collapse, the tablet rail and phone Workspace navigation are represented. The identified Governance responsive paths received matching-size destinations. After cleanup, 16 repaired source controls remain; one exact duplicate source screen was removed in favor of its current counterpart. The custom MCP phone Workspace control is also wired to the current mobile navigation.

## Implementation boundaries

Use source contracts, canonical authentication and existing API clients. Drawn state examples do not qualify real providers or promise model availability, tool capabilities, billing totals, native Office/export fidelity or backend behavior.

Preserve the distinctions between pending message and new draft; uncertain outcome and definite failure; SDK question and governed approval; private save, editor release and publish; connected account and discovered usable tools; unavailable and zero; and Meri handoff versus the owner module's full workflow.

The [removal register](REMOVED-SCREENS.json) identifies all 91 deleted roots. These IDs are tombstones, not implementation targets. The optional capability-launcher recommendation in the attachments does not override the user's removal of noisy Run views.

See the coverage register's remaining evidence requirements before enabling source-conditional lifecycle controls or real provider flows.
