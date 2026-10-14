# Existing API feedback and native acceptance follow-up

Base: frozen PR25 `257cf5b5db673b31c98264f9da33759c68066ba4`, with qualified runtime `5ca42049325881782bc9d2ac557450d642eccee8`. Work is isolated on `repair/capiro-existing-api-feedback-20261014`; shipping inputs and PR23/24/25 remain unchanged.

Read backend PR3 finding at `3509438f7f0c39c6da4db8a94b74c816211491b4`, which binds its current-main inspection to `capirov2@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`. Ordinary client APIs exist; the newer client-objective, ordered-owner, newsletter-staging and effective-date contracts are absent there. This is source evidence, not proof of the deployed image.

Confirmed feedback defect: the fixed gateway describes every upstream 404 as a missing record, although an unavailable endpoint produces the same status. The Portfolio proxy exposes framework route errors such as `Cannot GET ...` without explaining action availability. Both canonical server adapters should retain HTTP 404 and report that the requested action or record is unavailable from the current service. Do not infer deletion, success, an empty collection, a deployed candidate contract, or an authorization result from that status. Keep other errors, authentication, scope, cancellation, schemas and source boundaries unchanged.

Use existing transport and mounted-feature tests to reproduce and close the feedback defect, then verify missing objective/owner/revision/effective-date sources cannot publish success or enable dependent writes. Preserve candidate feature implementations, recovery journals and original tests. The dependency map and short live sequence are documentation; the 337-row native ledger remains unchanged and does not gate basic preview access.

Mounted baseline also confirms that a failed initial owner read still renders a blank ordered-owner assignment. Render the owner cards only after a current successful owner read or while displaying an explicitly retained draft. Keep the existing loading/error/retry controls, disabled save, retained version/order and no-automatic-replay behavior. This changes presentation of unavailable data, not authorization or ownership contracts.
