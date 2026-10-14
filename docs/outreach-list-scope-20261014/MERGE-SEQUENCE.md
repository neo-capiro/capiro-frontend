# Consolidated candidate and later merge sequence

This is preparation for a later approved release; no merge or deployment has occurred. Frozen first-preview shipping source `5ca42049325881782bc9d2ac557450d642eccee8` stays unchanged.

| Order | Candidate | Exact reviewed publication head | Current base |
| --- | --- | --- | --- |
| 1 | [PR25](https://github.com/neo-capiro/capiro-frontend/pull/25), frozen preview | `257cf5b5db673b31c98264f9da33759c68066ba4` | Existing preview stack; preserve preceding PR history |
| 2 | [PR26](https://github.com/neo-capiro/capiro-frontend/pull/26), unavailable API feedback/owner reads | `348bf98481268a5f06e26a924f0985b242265cbb` | PR25 |
| 3 | [PR27](https://github.com/neo-capiro/capiro-frontend/pull/27), Customize entry | `4465f5f1cfb1b807c97106433b70a0ccd480c4a2` | PR26 |
| 4 | [PR28](https://github.com/neo-capiro/capiro-frontend/pull/28), Files navigation/selection | `38c53fb0c8f05f598d835122c0ce7fd0f30a04fc` | PR27 |
| 5 | `repair/capiro-next-functional-20261014`, scoped Outreach list | Qualified source `dcbdd8578e3c974791eb017aefdf9331da834fd0`; publication head is its documentation descendant | PR28 |

The final branch is the consolidated tested candidate. Its ordinary ancestry includes every exact preceding head; it introduces one code/test/review commit and documentation/evidence descendants. Do not cherry-pick the stacked fixes again. Confirm the source ancestry, publication head, reviewed diff and checks before integrating. Use history-preserving merge commits in dependency order, then retarget the remaining successor to the receiving branch and review the reduced diff. Do not merge a successor while its intended predecessor is absent.

The current slice reruns 36 focused mounted browser cases, the 2,255 web and 442 Capiro unit cases, 111 root controls, types/lint/format/packages/architecture/build and credential-free server/browser checks on the consolidated source. It does not rerun every historical mounted test or replace PR26–28 evidence. Native acceptance and a release-selected build/image/configuration require their own qualification. All 337 native rows stay open. A future image must not be confused with the existing frozen PR25 image.
