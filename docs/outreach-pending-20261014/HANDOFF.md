# Ordinary Outreach pending-save follow-up

Qualified source: **`4a0966ed376d12dbf3d609f8939e92fc8eb1d6e3`**. Dedicated branch `repair/capiro-outreach-pending-20261014` is based on exact PR29 **`247de58f00a1fea50c25a3400463103885014f4f`** and preserves PR26–29 history. This is a bounded ordinary draft interaction fix; no new backend contract or endpoint is required.

## Behavior and boundaries

Two mounted baselines on unchanged PR29 reproduced create/update forms retaining editable fields during a held save. Typing after submission could produce local text never included in the request and then be discarded when the response closed the editor. Cancel and ordinary modal dismissal also remained available.

The form now freezes title, subject, body, creation type and Cancel for its existing pending write, keeps the Save button disabled with a Saving draft label, and sets aria-busy. A local parent flag mirrors that pending state solely to veto controlled Escape/close/outside dismissal. A rejected response restores editing with submitted fields retained; a successful response uses the existing reload and close flow. Create/update payloads, direct-link/list scope admission, all-clients behavior, rich destinations and read/query lifetimes remain unchanged. No shared primitive, DTO, API, package, authority, persistence or send behavior was added.

The existing form remains the submission owner; the view remains its composition/dismissal owner. Three exact size signals were independently reviewed without changing guard policy; previous reviews remain in the evidence archive. See [structure review](STRUCTURE-REVIEW.md). This fix does not resolve or newly qualify the ordinary legacy form's ambiguous-response replay or route-unmount semantics. It does not add a journal or claim native idempotency.

## Verification and visuals

Final source passes **40 mounted browser cases** (four new, 36 existing), **2,255 web unit cases**, **442 Capiro feature cases**, **111 root controls**, workspace types, public-package verification, full web lint (zero errors/81 existing warnings), full web formatting, architecture, production build and credential-free standalone server/browser checks. The final browser run has zero retries, skips or flakes. Architecture has 489 signals: 468 reviewed, 21 inherited unreviewed, zero blocking and zero boundary errors.

New tests hold create/update requests, assert the exact original submitted payload and one write, reject Escape/close intent while pending, then verify retained inputs/type and re-enabled controls after a known 400 rejection. Desktop/mobile success cases hold the write, inspect the pending form, settle it, and reopen the editor with the exact submitted body and enabled controls. Full-default axe reports zero violations in both pending forms; no rule is disabled. The existing PR29 scoped-list, Activity link/authority replacement, rich newsletter and Planner/Engagement cases survive. These fixture outcomes are synthetic interaction evidence, not native persistence or backend acceptance.

Reviewed [desktop](outreach-pending-1440.png) and [mobile](outreach-pending-390.png) captures keep the existing adopted modal and input/button components, styles and local assets. The submitted text and pending label are legible; the dialog remains contained at 390px. The Figma 3.1 baseline and high-fidelity Engagement context were inspected during PR29 and remain preserved at `docs/outreach-list-scope-20261014`; no visual redesign, fresh whole-frame comparison, authored-dark or comprehensive assistive-technology acceptance is claimed. No static asset or CSS changed.

Dependencies were freshly extracted with `npm ci --ignore-scripts` using the unchanged lock and task cache. Build/server checks do not qualify a container/image or signed-in native service. [Qualification](QUALIFICATION.json), [manifest](EVIDENCE-MANIFEST.json) and [evidence](evidence.tar.gz) preserve the two original failing logs/results/test source, first candidate and final results, current receipts and prior architecture records.

## Integration and live access

This branch is the consolidated candidate containing PR26→27→28→29 plus this follow-up. Later history-preserving merge order is **PR25 → PR26 → PR27 → PR28 → PR29 → this draft**, with each predecessor integrated and successor diff/base/head checked before proceeding. Preserve the [existing detailed sequence](../outreach-list-scope-20261014/MERGE-SEQUENCE.md); do not replay or rewrite the stacked fixes. No merge or deployment is authorized or performed here.

The coordinator reports that frozen PR25 source **`5ca42049325881782bc9d2ac557450d642eccee8`** is now deployed with the correct digest and healthy ALB. This owner has not independently verified the live host/image; browser access awaits **Neo's specific IP-ingress approval**. No access or security change was attempted. [The five-minute read-only live smoke checklist](LIVE-SMOKE.md) is ready for shipping-approved access and records actual route/status/scope evidence. PR29 and this fix are later candidates, not claimed to be present in the frozen deployment.

The exact backend routing/dependency reconciliation and minimum saved-layout requirements remain in PR29's [API dependencies](../outreach-list-scope-20261014/API-DEPENDENCIES.md), now routed by the coordinator to the private backend owner. Four API families exist in receiving source; actual runtime routing/data/admission and native qualification remain owner work. Saved layout is a separate missing receiving contract. No competing implementation or guessed config was added. Meri contracts remain 0.1.3; 0.1.5 is not adopted.

Both native ledgers remain byte-identical to PR29; **all 337 native rows stay open**. No mocked backend or local check accepts a native row. No local source/test blocker remains for this bounded fix. Draft review/integration, approved live access and native qualifications remain. No AWS, credentials/security, data-changing live request, provider/paid call, database/resource action, merge or deployment occurred.
