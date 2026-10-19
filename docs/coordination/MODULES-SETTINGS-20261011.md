# Modules and Settings implementation

User authorization on 11 October 2026: implement every Modules and Settings screen in `capiro-frontend` using the approved Capiro 3.1 Figma file and connect these features to existing `capirov2` services. This supersedes the earlier unallocated Modules/Settings and source-connection restrictions for this bounded work. Meri remains owned by `meri-greenfield`; Portfolio development and deployment are separate.

## Ownership and direction

- `apps/web/src/features/modules`: module catalog and cohesive domain screens, local selection/filter/form state and verified response presentation.
- `apps/web/src/features/settings`: settings navigation, profile/team/billing/integration forms and interaction.
- `apps/web/src/shared/capiro`: canonical configured service origins, Clerk session boundary, validated fixed-operation registry, bounded authenticated gateway and browser request lifecycle.
- `apps/web/src/shared/shell`: shared product navigation, layout and existing design assets. Preserve Meri rendering and active Portfolio application.
- Thin Next routes compose feature entrypoints. Features use shared transport and public UI primitives; no private cross-feature or cross-application imports.

Backend owns tenant resolution, actor permissions, filtering, persistence and all mutation authorization. Browser supplies only request parameters allowed by the verified operation definition. No broad URL proxy, browser credential store or invented endpoint. Errors, expiry, cancellation, unavailable capabilities and missing configuration are explicit. Greenfield Meri settings require a verified greenfield contract and cannot silently use legacy Clio endpoints.

## Evidence and scope

Backend reference: `capirov2` main `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`; actual controllers and response contracts govern integration. Attached workbook `Capiro-3.1-Portfolio-Audit (1).xlsx` is pinned to `fd8765ec` and contains Portfolio and Master Calendar only. It does not supply Modules or Settings mappings. Build the missing mapping from current controller evidence and Figma frames; retain unsupported action gaps explicitly.

Figma file `Zc2dEN5aLU47dVdsewDmiJ`, page `411:40601` is the Capiro 3.1 prototype page. Individual frame contexts, screenshots, local asset manifests and completed screen inventory will be recorded with the implementation report.

## Reuse and verification

Reuse adopted `packages/ui` primitives, existing shell/tokens/assets and installed Clerk/Next APIs. Keep API contracts at the external boundary and domain presentation in feature folders. Registries are grouped by coherent backend domain with one canonical aggregator.

Required: validated contract/security tests, meaningful feature interaction tests, TypeScript, package pins, architecture checks, production build, desktop/mobile keyboard and accessibility inspection and direct visual comparison to requested frames. Local mocks qualify boundary behavior only. Live integration and deployment need configured Clerk and backend service origins and must be reported separately.

File owners: parent owns shell, architecture guards, package manifests/lock and overall integration. Transport agent owns `shared/capiro` core and `app/api/capiro`. Backend audit agent contributes grouped operation definitions. UI screen agents receive explicit feature-family ownership. Independent review covers final security boundaries and UI behavior.

## Final handoff

Implementation, backend gaps and configuration are recorded in [the implementation report](../modules-settings/IMPLEMENTATION.md). The final continuation and structure review were completed by the primary Codex agent. Earlier file-owner assignments above are historical; no background agent is required to use this branch. See [verification](../modules-settings/VERIFICATION.md) for the executed checks and unrun live gates.
