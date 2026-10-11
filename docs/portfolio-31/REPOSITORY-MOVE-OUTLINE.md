# Portfolio frontend repository move — implementation outline

2026-10-11. The owner confirmed the destination map: **Meri, Portfolio and Modules frontend code in `neo-capiro/capiro-frontend`; Meri backend services in `neo-capiro/meri-greenfield`; Portfolio and Modules backend services in `neo-capiro/capirov2`**. The owner requested copying Portfolio here and deleting it from Meri. This is a source-ownership correction, not final Portfolio acceptance or approval to change existing production routing.

## Starting state and overlap

- `capiro-frontend@28c300093c0886018c49df8764a8e6fac44819eb` owns `apps/web`, a shared Meri shell and `packages/ui`; its Portfolio mode is disabled and it has no Portfolio feature screens.
- `meri-greenfield@97d0e7ffa8626ac38b3fa88371fc395acfd2975d` contains the runnable Portfolio app under `apps/portfolio-web` (683 tracked files, about 450 source files) and continuation docs under `docs/portfolio-31`. Its backend/runtime apps and contracts are unrelated and must remain.
- The duplicate responsibility is the separate Next app, header/mode switcher, shell, style tokens, dialog primitive and dependency lock. Portfolio business features have no counterpart in the target repository yet. The existing AWS preview image was built from the old repository and remains immutable while source moves.

## Bounded move

1. Copy the Portfolio application and its current documentation into this frontend repository on an isolated branch; preserve source bytes and test history. Keep its separate app entry during this transfer so behavior and the isolated preview build can be verified against the moved tree. Do not invent a fake merged Meri/Portfolio shell or silently weaken auth to force it into the current disconnected `apps/web` fixture.
2. Verify the copied app with its own static checks, tests, production build and exact file inventory. The root workspace lock includes the transferred app; its original nested lock remains temporarily active for the standalone preview Docker build. Review deployment paths before a new image build. The repository's existing `apps/web` and `packages/*` remain untouched unless required for the transfer.
3. Publish the frontend move first. Only after the source and verification are safely available in GitHub, remove `apps/portfolio-web` and its `docs/portfolio-31` source from `meri-greenfield` on a separate reviewed change. Keep backend contracts/runtime and unrelated branches untouched.
4. Follow-on consolidation: integrate Portfolio routes/features into the canonical `apps/web` shell, reuse `packages/ui`, unify the active lock and session boundary, then qualify and replace the preview image from the frontend repository. The temporary second app preserves the running preview while avoiding an unreviewed 450-file architecture rewrite during this source transfer. Its shell/primitive overlap is explicitly **not** treated as resolved by the copy.

## Authority and failure ownership

The frontend owns presentation and local interaction. `meri-greenfield` owns only its Meri runtime/contracts; existing Capiro services continue in `capirov2`. Trusted backend services and Clerk own tenant/session authority. A copied browser proxy or fixture does not grant permission. No deployment, DNS, Clerk, customer data or production test occurs as part of this source move. If target build/tests fail, preserve both source copies and report the exact gate before deleting either GitHub source.

## Verification and publication gates

- Compare the copied `apps/portfolio-web` file tree to the old repository at `97d0e7f`, excluding only documented generated/ignored material.
- Run the app's typecheck, lint, architecture, unit/browser checks and production build, plus the frontend repository's existing checks; distinguish environmental setup failures from code failures.
- Inspect changes for secrets, local machine paths and duplicate active code. Publish source to `capiro-frontend` before source deletion from `meri-greenfield`. Verify both remote read-backs.
- The 345-row ledger remains open; this move does not change audit acceptance counts or authorize a new preview rollout.
