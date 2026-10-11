# CORE-099 ordered client owners: current contract review

Checked 2026-10-11 against `neo-capiro/capirov2` `origin/main` at `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace` and `neo-capiro/meri-greenfield` main at `97d0e7ffa8626ac38b3fa88371fc395acfd2975d`. This is a read-only contract review, **not** implementation or acceptance. The dirty primary backend checkout was not modified.

## Current behavior

- Core `GET/PUT /client-account-owners/:clientId` stores one nullable `clients.account_owner_user_id`; the PUT is restricted to `user_admin` and validates active membership in the same tenant. The batch GET feeds the Portfolio owner filter. Its response has one `accountOwnerUserId` and person, with no rank or additional owner identifiers.
- Core `GET/POST/DELETE /clients/:clientId/team` returns that owner plus `client_team_members`. Non-owner members have a free-text `role`; the read orders the owner first, then other members alphabetically. The team membership table does not encode Primary, Secondary, Tertiary or Quaternary order. Writes are `user_admin` gated and check tenant membership.
- Portfolio's Account team dialog exposes add/remove member, free-text role and a separate single Account owner selector. Its mutation calls the two endpoints separately. It has no atomic four-rank save or read-back. A free-text label cannot establish ordered ownership, uniqueness or conflict behavior.

## Contract to settle before UI implementation

1. Define a canonical ordered list of zero to four **distinct active tenant members**, with positions Primary through Quaternary. Decide whether an empty Primary is allowed; the existing single-owner field permits unassigned clients. Define what happens when an assigned member becomes inactive.
2. Preserve the existing account-owner GET/PUT and Portfolio filter semantics. A safe migration would backfill the current single owner as Primary and make rank 1 and `clients.account_owner_user_id` agree in the same transaction. The backend owner must choose the authoritative representation and how legacy single-owner writes reconcile with ranked writes.
3. Expose an atomic rank read and replace operation scoped to one tenant/client, with a version or conditional-write check so two administrators cannot silently overwrite each other's order. Validate duplicate IDs, rank gaps, non-members, inactive members and unauthorized callers; return the persisted ordered list and new version.
4. Keep general account-team membership and its free-text role separate from ownership rank. Reconcile whether ranked owners must also appear as team members, and ensure the existing team read displays each person once with their rank.

## Acceptance cases after owner agreement

- Backfill a client with one existing owner and verify Primary, index filter and team read remain consistent.
- Save four distinct owners, reload and verify exact order in the API and UI; reorder, remove a middle rank and clear all allowed ranks without changing unrelated team roles.
- Reject a duplicate person, inactive or cross-tenant member, wrong-client ID, non-admin write and stale version. A failed or uncertain write must retain the user's draft and reconcile by read-back before retry.
- Verify concurrent administrators cannot produce inconsistent rank 1 versus `account_owner_user_id`, and that legacy single-owner mutations cannot silently erase Secondary through Quaternary assignments.

**Disposition: OPEN.** The current backend and frontend do not satisfy `CORE-099`; an approved backend owner/schema contract and coordinated migration are required before implementation and signed-in acceptance. No production data or API write was performed for this review.
