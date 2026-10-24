# Remaining owner allocations after the plain Quick Log repair

These are concrete follow-up seams for root allocation, not implemented protocols or completion claims. PF16, release gates and migrations remain with their allocated owners.

## Live refusal relay: allocated and repaired in source

Root allocated the exact proxy/helper/tests. Frontend `bb0b386bd936b4d15d901459c3726721a8af33d8` repairs the actual backend route's removal of both `DIRECTORY_NOTE_REFUSED` and `PROSPECT_NEW_CLIENT_REFUSED` fields. No further source allocation is needed for this finite relay.

The small adjacent `portfolio-command-refusals.ts` validator relays only exact POST Core Directory note commands and new-client conversion commands. It checks v1 schema, request UUID against body, target against route/body, kind/mode, status, digest encoding, bounded message and exact envelope fields. Existing feature validation binds the original payload digest, including Directory actor scope. Generic/GET/authority/malformed/foreign failures stay sanitized, no upstream headers are forwarded, and no-store is preserved. Twenty-four focused tests include the actual proxy→ApiClient→feature path and foreign-digest rejection. Browser/deployed qualification and independent follow-up review remain root-owned.

## PF13 client contact creation: historical receipt storage is missing

Frontend owners are `relationships/contact-create-attempt.ts`, `contact-api.ts` and their existing form/hook consumers. Current attempts live only in QueryClient; generic non-server ApiError clears them. Core owners are `clients/client-people.controller.ts` and `client-people.service.ts::createPerson`. The method returns a mutable ClientPerson row and schedules indexing after commit. `ClientPerson` has no request/digest/history fields, and existing update/delete operations can change or erase that row. Reusing the live person row or email lookup as historical command proof is therefore invalid.

Proposed bounded next allocation: add a contact-create command/receipt beside ClientPeople, an immutable domain receipt model/table with a root-assigned migration identifier, and the existing frontend encrypted recovery scope. Bind tenant, actor, canonical client, request, exact normalized fields and digest; create contact, audit and receipt atomically under the original command lock and current Core authority. Preserve title-based placement and first-create-only indexing. Receipt history must survive later contact edits/removal without claiming the contact is currently available. Keep ordinary update/hierarchy/delete owners separate. Only a typed rollback with no original receipt may permit explicit edit retirement. Do not add generic status-based clearing.

Required acceptance includes same-key concurrency, conflict/no fresh UUID, commit-response loss/reload, current actor/client-wall revocation, indexing only once, real audit/receipt rollback, and readback after contact update/removal. No schema or shared contact owner has been edited for this proposal.

## PF18 selected contact carry-over requires an explicit operation

Prospect contact source ownership is `business-development/prospect-contacts/prospect-contacts.service.ts`: source contacts have version, removal state and current prospect scope. Target ownership is ClientPeople. Its import helper matches current email/name and can update existing people; client email is deliberately non-unique. It is not an exact reviewed transfer receipt and cannot be called implicitly during conversion.

A contact-only follow-up should bind the already committed conversion receipt/client, explicitly selected source IDs and versions, and reviewed create/link/skip decisions for each target conflict. Preserve the source contacts; record per-item source-to-target lineage and immutable result. Recheck current source and target permission inside the transaction. Changed source/version/target conflict must refuse the reviewed command; no silent copy-all or email-based merge. A separate root allocation must decide the receipt storage and whether the reviewed batch is all-or-nothing before implementation.

Files and research need their own custody/ACL/version and partial-effect contracts. No file relocation, implicit research materialization or PF16 changes are proposed in the contact command.

## PF09 and other PF13 owners

PF09 currently filters Workspace documents by canonical client ID and excludes prospect/name-only associations. Saved revision/writer and deployed revocation qualification require the Workspace owner and scheduled environment; a Portfolio current-list filter cannot establish them.

Undo deletion, calendar mutations/artifacts/sharing/sync and non-PF16 file operations remain in the separate owner inventory. The plain creation repair does not claim durable deletion or provider recovery for those operations.
