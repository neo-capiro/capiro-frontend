# Engagement / outreach: vnext → capiro-frontend port

Neo's instruction (2026-10-29): the preview must give the same outreach experience as
`os.capiro.ai`, vnext is being retired, and the code may be brought over rather than
reimplemented. This file records the measured scope and the adaptation rules so the port
is a sequence of reviewable slices instead of one 17k-line drop.

## Measured size (capiro v2 @ `fix/defense-budget-discovery-manifest`)

| slice | files | lines |
|---|---|---|
| `apps/web/src/vnext` (whole surface) | 1,246 | 80,545 |
| `apps/web/src/vnext/pages/engagement` | 109 | 44,875 |
| outreach builder slice (steps, models, CSS, tests) | 41 | 16,822 |
| capiro-frontend `features/modules/engagement` today | 8 | 1,564 |

The builder slice, per file:

```
outreach-step-context.tsx            1493      outreach-step-context.css        389
outreach-step-targets.tsx            1183      outreach-step-targets.css        351
outreach-step-send.tsx               1036      outreach-step-send.css           306
outreach-step-drafts.tsx              698      outreach-step-drafts.css         323
outreach-step-template.tsx            692      outreach-step-template.css       214
outreach-builder-model.ts             620      outreach-builder.css             531
outreach-step-review.tsx              502      outreach-builder-shell.css       222
outreach-step-name.tsx                428      outreach-step-format.css         422
outreach-step-format.tsx              256      outreach-step-review.css         218
outreach-step-campaign-type.tsx       210      outreach-step-name.css           142
outreach-campaign-flow.ts             384      outreach-step-campaign-type.css   61
outreach-send-record.tsx              350
outreach-generation-status.ts         209
outreach-send-record-model.ts          93
outreach-builder-progress.ts          102
outreach-format-preview.tsx           167
outreach-recipient-presentation.ts     80
+ 10 step tests / 3 model tests (~4.1k lines)
```

## What "copy and adjust" actually means here

The components are largely presentational and port cleanly; four dependencies do not exist
in capiro-frontend and must be rewritten in the destination's idiom:

1. **Data access.** vnext steps call `useApi()` (`apps/web/src/lib/use-api.js`, an axios
   wrapper) plus `@tanstack/react-query`. capiro-frontend has no axios: it uses
   `shared/portfolio/api/http` (fetch + zod) through `useCapiroQuery` and the operation
   registry in `shared/capiro/operations/engagement.ts`. Every query/mutation becomes an
   operation entry.
2. **Routing.** `react-router-dom`'s `useNavigate` → `next/navigation`. The builder's step
   state must move onto the existing `EngagementScreen` destination model rather than a
   parallel router.
3. **Styles.** vnext imports global CSS files with unscoped class names
   (`./outreach-builder.css`). capiro-frontend uses CSS modules plus the shared design
   tokens; the builder CSS has to be converted, not imported, or it will bleed across the
   app.
4. **Test harness.** vnext uses vitest + `@testing-library/react`. capiro-frontend runs
   vitest today; RTL is not a dependency yet, so either it is added for this port or the
   step tests are ported to the existing DOM-free style. Decide once, before slice 1.

Everything else (React 18/19 hooks, `@tanstack/react-query`) matches.

## Port order

1. `outreach-builder-model.ts` + `outreach-builder-progress.ts` + `outreach-campaign-flow.ts`
   — pure logic, no JSX, no data layer. Port with their tests first; these carry the actual
   builder behaviour and are the only part that can be verified without a browser.
2. Builder shell + step navigation on the existing `EngagementScreen` destination model.
3. Steps in dependency order: campaign-type → context → targets → name → template →
   drafts → format → review → send. Context and targets are 2.6k lines between them and
   are the bulk of the data wiring; they land last per slice, not first.
4. `outreach-send-record` + send wiring, which also closes the current hard-disabled
   `UnavailableAction` in `OutreachView` ("Sending needs the versioned draft review and
   send-intent workflow").
5. CSS conversion per slice, not in one pass.

## Explicitly out of scope

- The other 80k lines of vnext (bills, directory, legiwatch, dashboard, client-crm, settings,
  meri). This document covers the outreach workflow only; each of those is its own slice.
- Porting the vnext shell, navigation or design system. capiro-frontend's shell and tokens
  stay.
- Reviving vnext-only infrastructure (its queues, retrieval or agent surfaces).

## Bridge while the port runs

The preview can serve the current vnext experience immediately by pointing the preview host
at the `capiro/dev/web-vnext` image with `WEB_SURFACE=vnext`; that is a deployment, not a
code change, and it is retired as soon as slice 3 lands. This is a bridge, not the answer to
the port.
