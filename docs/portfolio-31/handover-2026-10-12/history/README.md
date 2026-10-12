# Recover the preserved local source history

Use `portfolio-continuation-760dcc6-requires-02c02d9.bundle`. It explicitly requires the published frontend base `02c02d95bdf3949662b9123f425271c6491ffdab`; a normal clone of the GitHub preservation branch provides that commit and its published ancestry.

The bundle is **1,389,324 bytes**, SHA256 **591d293dee1b903e31c70e8b659beae928b04d4c1ed87c8e7a6e27416eabc8af**. It preserves 26 available continuation refs, including 13 branch refs and all 33 root continuation commits after the base. It ends at source checkpoint `760dcc6c1179312c7f4b762e64cf3af1aad60c3e`; the later handover documents and context packs are preserved directly in GitHub.

Run these commands inside a fresh clone of the preservation branch. They import the original branches into a separate namespace without replacing the current branch:

```sh
git cat-file -e '02c02d95bdf3949662b9123f425271c6491ffdab^{commit}'
git bundle verify docs/portfolio-31/handover-2026-10-12/history/portfolio-continuation-760dcc6-requires-02c02d9.bundle
git fetch docs/portfolio-31/handover-2026-10-12/history/portfolio-continuation-760dcc6-requires-02c02d9.bundle 'refs/heads/*:refs/remotes/portfolio-history/*'
git rev-parse refs/remotes/portfolio-history/codex/portfolio-continuation-20261011
git rev-parse 'refs/remotes/portfolio-history/codex/portfolio-continuation-20261011^{tree}'
git rev-list --count 02c02d95bdf3949662b9123f425271c6491ffdab..refs/remotes/portfolio-history/codex/portfolio-continuation-20261011
git fsck --full
```

The expected recovered commit is `760dcc6c1179312c7f4b762e64cf3af1aad60c3e`, tree `46417a01484727747b0a2d81b3b4f278285cb709`, and continuation count `33`. The exact fresh-checkout qualification is preserved in [qualified-history-restoration.json](qualified-history-restoration.json); the independent review is in [the history resolution](../reviews/direct-artifact-history-resolution.json).

## Earlier bundle retained as historical evidence

`portfolio-local-history-through-760dcc6.bundle` and `local-history-bundle-receipt.json` are preserved unchanged. Their original verification ran inside the existing shallow repository and reported complete history. Independent review identified the missing parent of the shallow base, so that result did not establish a fresh standalone restore. Use the explicitly qualified prerequisite bundle above. The original finding and its closure are both retained; neither the old bytes nor the old verification log was rewritten.

The context package verifier checks the external bundle's bytes against its recorded hash. Git prerequisite and ancestry verification are separate steps, performed by the commands above. Restoring context snapshots does not itself recreate `.git` administrative state or apply old worktree diffs.
