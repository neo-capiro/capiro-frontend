import json
from pathlib import Path
r=Path('/workspace/capiro-visual-closeout')
d=json.loads(Path('/tmp/capiro-visual-closeout/architecture-final-review.json').read_text())
reasons={
'calendar.module.css':'Calendar-specific authored geometry, source filters, agenda and responsive rules remain a single presentation stylesheet. The new compact header/disclosure owns no data or routing policy; ModuleBreadcrumb remains the navigation owner. No other module geometry changes.',
'ConfiguredTracker':'Owns only Bill Tracker screen composition and local table/board/search/selection state. This delta nests the existing QueryState, BillResults and pagination in a results frame; currentBoard and the governed queries retain data/transport ownership. No request, receipt or paging algorithm moved into the view.',
'CapabilitiesPage':'Passes only its already-current capability records as optional suggestions. Query scope, invalidation and unavailable handling remain in existing hooks; no new catalog, service, DTO or cross-client state is created.',
'CapabilityEditor':'Owns the existing saved/create dialog and tabs. It forwards current-record suggestions to the create form without changing lifecycle, receipt, draft, document or focus ownership.',
'CapabilityForm':'Owns the existing native capability form and fields. It forwards optional suggestions only to creation identity fields; form parsing, mutation boundaries and arbitrary type/sector strings remain canonical. Saved Details still renders the authored variant.',
'ClientOverview':'Adds current verified client name to the existing Team dialog solely for owner-dialog context. All current-client failure gates, activity/overview composition and transport ownership are unchanged.',
'OwnerCards':'Owns the ordered-owner card list and local pointer/keyboard interaction. The canonical hook owns draft validation, source/version binding and writes; this component receives that editor and current team display roles, and contains no request or duplicate contract. It preserves empty positions and only an explicit reorder moves an owner. Its nested map is reviewed separately.',
'OwnerCards > <anonymous>':'Renders one rank card, current person/unavailable identity, native member selection, rank badge and clear/reorder controls. All edits delegate to the canonical editor; no authorization or persistence lives in this rendering callback. Keeping the related card controls together avoids obscuring keyboard/drag parity across fragments.',
'ProfileTeamEditor':'Retains team membership lifecycle; adds a dedicated Owners entry and passes only verified current team roles and client display name. Its existing source/pending/unknown fences still block owner changes. The owner dialog/hook remain distinct cohesive owners.',
'useOrderedOwners':'Remains the single ordered-owner read/draft/versioned-write/read-back lifecycle owner. The added explicit local reorder preserves the captured base/source and pending/stale/uncertainty fences, clears no persisted data and sends no request. Existing save validation still rejects holes/duplicates; clearing a rank never promotes another owner.',
'PortfolioIndex':'Composes the canonical index queries, URL filters, profile catalog, attention and dialogs. Secondary tabs/filter disclosure are extracted to IndexNavigation, owner choices to IndexOwnerFilter. Customize only controls visibility of existing local layout editing; full catalog, current-read concealment, actor/session and objective focus ownership remain unchanged.',
'EditorSession':'Owns one organization layout draft and its explicit save/conflict/reconciliation UI. An editing flag hides controls outside Customize; it does not duplicate layout state or bypass any availability/current catalog/write fence. Guidance now reflects explicit Save and is hidden when blocked; Done stays disabled while a changed or unresolved write exists.',
'portfolio.module.css':'Retains Portfolio index/card/chooser presentation and responsive rules. The added header owner filter and compact navigation/disclosure styling are scoped to the same index. No global shell tokens, mode navigation, backend state or unrelated domain rules are added.'
}
p=r/'scripts/architecture/reviewed-size-findings.json';reviews=json.loads(p.read_text())
findings=[f for f in d['sizeFindings'] if f['blocking']]
assert len(findings)==13,len(findings)
report=[]
for f in findings:
 name=Path(f['file']).name if f['kind']=='file' else f['symbol'];reason=reasons[name]
 key=lambda x:(x['file'],x['kind'],x['symbol'])
 record={k:f[k] for k in ['file','kind','symbol','fingerprint']}
 record.update(reason=reason+' See docs/visual-closeout-20261012/STRUCTURE-REVIEW.md.',reviewedBy='Codex shared frontend implementation review',reviewedOn='2026-10-12')
 reviews=[x for x in reviews if key(x)!=key(record)];reviews.append(record)
 report.append({**f,'reason':reason})
p.write_text(json.dumps(reviews,indent=2)+'\n')
out=r/'docs/visual-closeout-20261012';out.mkdir(exist_ok=True)
(out/'SIZE-REVIEW.json').write_text(json.dumps(report,indent=2)+'\n')
(out/'STRUCTURE-REVIEW.md').write_text('''# Seven-finding presentation delta: responsibility review

Implementation review, 12 October 2026. This is not the coordinator independent acceptance review. Exact body/file fingerprints and individual rationales are in SIZE-REVIEW.json and the canonical guard review records. The scanner, dependency rules, tests and transfer baseline are unchanged; the 25 inherited unreviewed signals remain unaccepted.

The bounded plan was recorded before editing in the external work record and is preserved in this directory. This change adds a dedicated owner-card dialog through the current Team flow, a compact index toolbar, native capability suggestions, the Bill Tracker results frame, Calendar-specific composition, and a sharp modal scrim. Shared HeaderFrame, auth/session/client boundary, governed transports and contracts remain untouched.

OwnerCards owns list rendering and keyboard/pointer parity. OrderedOwnerFields owns the nested dialog and canonical useOrderedOwners owns reads, local drafts, explicit versioned writes and read-back fences. Clearing keeps later ranks in place; a reorder is an explicit action. Closing the new dialog aborts its browser request while preserving the ambiguity record in the existing actor/client query scope. The current Team source/pending/unknown gate is preserved.

IndexNavigation owns profile tabs and the secondary filter disclosure; IndexOwnerFilter owns current authorized owner choices. PortfolioIndex retains queries and URL state. Filters remain mounted through unavailable catalog states so retained selections and recovery remain inspectable. PortfolioProfiles still supplies the complete canonical catalog to the one layout hook. Customize does not grant write availability. Existing filter/list/sort behavior cannot persist a subset, and local changes still require Save.

Capability suggestions derive from the already-current client records plus the existing default type; they never establish an enum. Both native arbitrary strings and all original payload checks remain. Saved Details retains its separate authored layout. Bill Tracker reuses currentBoard, BillResults and unchanged paging/query functions. Calendar reuses ModuleBreadcrumb inside its compact header; other modules retain their shell. All exact existing assets and public packages remain unchanged.

The reviewed larger functions are cohesive existing screen/editor composition or one domain lifecycle; their exact individual reasons are recorded, not blanket path exemptions. No endpoint, authorization, billing, source connection, provider action, infrastructure, credential or database behavior changes. New transport responsibilities, additional domains or a changed fingerprint require another review.

Original meaningful browser assertions survive. Four existing test files change only the new owner entry/save label/list semantics or opening the filter/customization entry; the roster-removal assertion is kept in its visible Team context. Actor replacement additionally asserts that the previous owner dialog closed before opening the replacement. No original cases are skipped or removed.
''')
(out/'IMPLEMENTATION-PLAN.md').write_text(Path('/tmp/capiro-visual-closeout/PLAN.md').read_text())
print('Reviewed',len(findings),'exact size findings; boundary errors',d['errors'])
