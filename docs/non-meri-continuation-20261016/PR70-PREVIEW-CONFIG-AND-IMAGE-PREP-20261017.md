# PR70 first-chat preview: held build input and service bindings

This is a source-only deployment proposal. It does not authorize an archive,
upload, build, service update or activation. The frontend **image source** is
[PR70 `31a140cddf798c32b5cc45ad22e7b672312b3ca3`](https://github.com/neo-capiro/capiro-frontend/commit/31a140cddf798c32b5cc45ad22e7b672312b3ca3),
Git tree `377fea359c5d744384592dfa6ce9c89c35ee300d`. The local clean mirror
`f2c042af71314f91d39f65da1890b788c5ed2b14` has that tree. This document,
service template, validator and one-shot buildspec are a **separate later
deployment source**; their eventual reviewed commit must be recorded separately
and must not replace the PR70 archive source or its marker.

## Held service proposal

Use `apps/web/deployment/portfolio/preview-config.mjs` with owner-verified
public metadata to produce and validate the complete explicit parameter array.
The template fixes `CAPIRO_PREVIEW_READ_ONLY=true` and
`CAPIRO_REQUEST_ORIGIN=https://portfolio-preview.app.capiro.ai`. The ordinary
`CORE_API_BASE_URL=https://portfolio-preview.app.capiro.ai/api` is the frontend's
own API path; it is separate from the reviewed read and bootstrap target
`https://first-chat-preview.app-dev.capiro.ai/api` (Core bare origin plus `/api`).
Read requires source `6542f5b089656b6d255465edd464d06c2a0b408f`; bootstrap
requires source `c64f0005cf14d69683aabafa11def4964d766832`, the selected
active client and the exact same Core target. The client UUID is deliberately
absent from source. Read, bootstrap and Meri conversation routes default off.

The currently accepted Meri **image** source is
`f005f77316bb8735e60f16c3ac99a5c8e3d71a34`, digest
`sha256:6a03d5367c22a95db1fbc95a08b2bb1237164bfdf3b6f215f076a38833fffb8d`;
the frontend consumer version is `0.1.8`. Those two image facts do not attest
a later Meri startup successor, a serving URL, or first-chat runtime admission.
The Meri origin remains blank until its separately qualified service origin is
known. The route and workflow flags must turn on together against the same
origin and an accepted source/digest pair. A newer Meri runtime pair requires a
reviewed template and validator source update before activation.

`validatePreviewParameters` rejects omissions, unexpected values, duplicates,
overrides and inherited parameters. The deployment review must supply every
parameter explicitly; `UsePreviousValue` is not an option. Existing IAM,
network, listener, security-group and secret-reference wiring is unchanged by
this proposal.

## Exact image qualification input, after the prebuild holds clear

The tracked `apps/web/deployment/portfolio/buildspec.yml` is the canonical
general preview buildspec. The tracked
`docs/non-meri-continuation-20261016/PR48-READ-IMAGE-QUALIFICATION.buildspec.yml`
qualified a narrower Core read source; it omits PR67 native-session/history and
PR70 archived-client behavior. For the one allocated PR70 attempt, review and
pass the **inline bytes** of
`apps/web/deployment/portfolio/PR70-FIRST-CHAT-IMAGE-QUALIFICATION.buildspec.yml`
as CodeBuild `buildspecOverride`. Its SHA256 is
`f345a8d27dee552115e1ed18b22248d83d4337ff1f7643da4bb09346a4ed20c2`.
That file is absent from the PR70 archive, so a path override cannot work.
Record the exact reviewed template commit and override hash next to the
distinct PR70 archive SHA and S3 VersionId.

After independent remote commit/tree confirmation, the held source preparation
commands from a clean PR70 mirror are:

```sh
PR70_ZIP=/path/to/new/preview-source.zip
git archive --format=zip --output="$PR70_ZIP" f2c042af71314f91d39f65da1890b788c5ed2b14
python scripts/verify-preview-archive.py "$PR70_ZIP" . \
  f2c042af71314f91d39f65da1890b788c5ed2b14 \
  31a140cddf798c32b5cc45ad22e7b672312b3ca3 \
  377fea359c5d744384592dfa6ce9c89c35ee300d
```

The verifier appends `source-commit.txt` with the **remote PR70 SHA plus one
newline**, checks every Git blob/member, and reports the ZIP SHA256. Run it once
on a fresh ZIP. Only after the Clerk pairing is proved and the reviewed single
build allocation is released may the owner upload those exact bytes to a
**new immutable S3 object version** and
record the new VersionId and SHA256. Do not reuse the older source version,
archive, tag or idempotency token. The one-shot CodeBuild input must supply
`EXPECTED_SHA=31a140cddf798c32b5cc45ad22e7b672312b3ca3`, the new
`EXPECTED_S3_VERSION` as `sourceVersion`, and the exact frontend repository URI
`967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview`.
Read back the existing build project's source/bucket/key and repository before
constructing the reviewed StartBuild request. `buildspecOverride` must contain
the reviewed inline YAML bytes, with the above SHA256 independently checked;
the source archive remains PR70, without this later buildspec file.

The override checks Node 24, exact marker bytes and S3 version, then runs the
PR70 archive's preview-config Node suite; focused read, first-chat, Meri host/session/history,
archived-client and backend-containment Vitest cases; web TypeScript and lint;
root architecture and build; standalone production smoke; and Linux/amd64
Docker build and smoke. It pushes only the PR70 SHA tag and polls the exact
digest's ECR scan. It checks that the push URI is exactly the fixed frontend
repository in `us-east-1` before Docker work, then resolves the PR70 tag in
that same repository to its digest. A success receipt requires scan `COMPLETE`, all findings
read, and zero HIGH and CRITICAL; `ScanNotFoundException` or pending remains
pending. Independently read back the tag/digest/scan before preparing a
preview-only service change set. Do not infer qualification from an old digest.
Run this successor's extended config tests separately against the reviewed
deployment source; the PR70 image archive intentionally does not contain them.

## Remaining image and activation gates

1. **Before image seal and build:** the Clerk application owner privately confirms that the configured
   publishable and secret references belong to the same application with
   issuer `https://clerk.app.capiro.ai`. Reference names, KMS metadata and
   Dashboard domain alone do not establish that pairing; no secret payloads
   or bearer tokens belong in this handoff.
2. **Before activation:** Core owner confirms the held preview service and ALB route update: browser
   read GETs must reach `/api/me`, `/api/clients` and `/api/clients/:id` at
   the fixed Core bare origin. Its current priority-3 host guard shadows those
   GETs. Bootstrap and native authority are distinct exact POSTs. Frontend
   Meri conversation history does not require Core conversation-history GETs.
3. **Before activation:** Meri owner provides a separately accepted serving origin and a qualified
   runtime source/image pair that includes the selected startup behavior.
   Confirm same-VPC reachability and the required downstream Core identity,
   context and membership routes. The current f005 image receipt alone does
   not supply a service endpoint.
4. **Before activation:** an authorized actor verifies current native Clerk session claims and Core
   identity/context/membership, selected active tenant/client and first-chat
   admission without sharing private IDs or token values. The native-session
   correction in PR67 is source-level; there is no live acceptance receipt.
5. **After the image scan passes:** review the explicit
   service parameters, immutable image digest, Core/Meri runtime pins and
   rollback digest. Apply only through a separate owner-approved change set,
   then verify health, exact task image, auth, selected client, read/bootstrap,
   action-session and history in the live preview.

No private client UUID, credential, token, live service URL, new S3 version or
new frontend ECR digest is claimed by this preparation.
