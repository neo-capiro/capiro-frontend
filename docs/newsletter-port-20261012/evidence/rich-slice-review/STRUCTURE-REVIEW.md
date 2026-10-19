# Rich newsletter slice structure review

Independent source-only review by Codex modules_settings_review, 13 October 2026. Records bind exact function fingerprints in READY-SIZE-RECORDS.json; containing-file SHA-256 and nonblank counts are in EXACT-SIZE-EVIDENCE.json. Root owns registry integration. Proposed publication path: `docs/newsletter-port-20261012/evidence/rich-slice-review/STRUCTURE-REVIEW.md`. Acceptance is limited to responsibility/structure and does not accept the original 43 runtime facets, native operations or full design.

## OrdinaryEngagementScreen

apps/web/src/features/modules/engagement/EngagementScreen.tsx:45; 130 nonblank body lines; fingerprint `72b4d083f4c0d90ce2ac0660d518fc63cc8f20037f995dcef98d8751b30d27d0`.

Owns the ordinary Engagement screen: tab/scope selection, existing client/meeting reads and composition of separately owned child workflows. The new outer EngagementScreen separates rich route discrimination before these queries mount; this function contains no rich document retrieval, persistence, renderer or dispatch implementation. The keyed Outreach child disposes selection on destination replacement. The 130-line body is predominantly existing tab composition; splitting it solely for size would obscure the single screen lifetime.

## OutreachView

apps/web/src/features/modules/engagement/OutreachView.tsx:21; 125 nonblank body lines; fingerprint `b86cd8cb940cc4e119e7723a8b55f82a82f6d175b26b428fe9324175f2223756`.

Owns one Outreach browse/selection lifetime, including linked record loading/error and ID checks, campaign-session selection, and selection of the existing ordinary form. Rich candidates are classified before the form mounts and leave through a local selection reset or canonical deep-link return. It delegates record IO to useCapiroQuery, campaign editing to CampaignSession, generic saving to OutreachForm and rich unavailable presentation to NewsletterDestination. The guards and view choices constrain the same selected record; they introduce no rich read or send transaction.

## OutreachForm

apps/web/src/features/modules/engagement/OutreachView.tsx:158; 88 nonblank body lines; fingerprint `d7e8f202c52c16b8bdf793e1e563d1e4ace0c1d63a6cd48b5338b21f5310a8aa`.

Owns the existing single ordinary outreach create/update form: local title/subject/body inputs, pending/error presentation and one explicit submit callback. This function is byte-identical to HEAD; only its containing file acquired rich route classification. The response projection remains in the operation registry and rich candidates cannot reach this form. Its 88-line body is cohesive form rendering plus its existing submit handler. This structural review does not retrospectively qualify legacy mutation cancellation, read authority or provider delivery.

## WorkspaceScreen

apps/web/src/features/modules/workspace/WorkspaceScreen.tsx:35; 207 nonblank body lines; fingerprint `849d2840007f21da937f4b3f2c09a993d9444e3ff834a574467e10814d0d9160`.

Owns Workspace route and local view selection, then composes the established workflow children. Rich entry is a small validated route branch before prospect/draft branches; local rich draft editing/rendering lives wholly in rich-newsletter children. Existing saved-version, prospect, template and Hill Day IO stays with those canonical owners. Conflicting rich/draft/prospect references are rejected, a client-keyed rich child resets local state, and close navigation preserves a valid client hint. The large function remains a screen selector; adding revisioned persistence or native staging here would cross this accepted boundary.

## RichBlockControls

apps/web/src/features/modules/workspace/rich-newsletter/RichBlockControls.tsx:15; 100 nonblank body lines; fingerprint `3cf80059dcb046d4af8f762b121a5512294ed2811c8643abdbe45adfe245cf79`.

Owns presentation and local updates for one selected typed block. Heading/paragraph HTML uses the adopted RichText component, button/logo labels use plain text matching the canonical renderer, and image/link/style fields update the same block through a parent callback. It delegates rich editing and document lookup/history to other owners, performs no network or persistence, and exposes no generic renderer/schema. The finite kind-specific JSX concerns one selected-block projection. Unsupported advanced controls remain explicit, so extraction merely to meet 80 lines is not warranted.

## RichNewsletterEditor

apps/web/src/features/modules/workspace/rich-newsletter/RichNewsletterEditor.tsx:29; 136 nonblank body lines; fingerprint `fad466d74b21eeea140d8bc5b52297cf3719e49a622e936fd6cb0fa0212bc9e7`.

Owns the lifetime of one local newsletter draft, its bounded immutable past/present/future history, current block selection, preview modes and explicit discard confirmation. Factory/clone transforms, block structure, controls, Tiptap and sanitized rendering are delegated to focused local modules or qualified public exports. The stable selected-block key and RichText external-content synchronization keep history changes from destroying keyboard focus. All state here belongs to one local editing transaction; saving/staging remain disabled and no backend authority, CAS persistence or delivery lifecycle is mixed in.

## Adjacent owners and constraints

The changed shared/capiro/operations/engagement.ts file only adds a response-metadata projection imported from newsletter-routing.ts. It contains 395 nonblank lines and no function over 80 lines at review; there is no seventh trigger to waive. Rich route parsing, local clone/edit helpers, Tiptap adaptation and preview isolation have separate cohesive owners. New thin Next entry composes the existing shell and Engagement screen. No shared shell, transport, authorization boundary, vendor tarball, canonical renderer or old saved-version writer was edited. Browser fixtures preserve old assertion owners and do not establish native admission.
