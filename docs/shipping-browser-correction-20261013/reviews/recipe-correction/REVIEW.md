# PR17 qualification recipe correction — static addendum

**Accepted for the bounded static review: all four initial findings are resolved, with no remaining recipe source-review blocker found.** The reviewed script SHA256 is `d2439c4e3c3a8ed4e84698993a83e5a4bd82ea7698c98900ae8679982182acac`. This is not an execution or qualification pass. The recipe remains unexecuted and producer-reported syntax checked only; this reviewer ran no recipe, browser, server, installation, build or full check.

The earlier [initial review](../capiro-pr17-recipe-review-20261013/REVIEW.md) and its findings remain sealed and historically valid. This packet contains the corrected bytes, exact diff and [verification receipt](VERIFICATION.json).

- **RECIPE-01 resolved:** an explicit Portfolio executable now populates both Modules aliases; otherwise all three aliases are cleared. The environment probe records actual `browser.version()` separately from the requested executable and Playwright's configured full Chromium path. The latter is no longer presented as the actual headless-shell executable.
- **RECIPE-02 resolved:** the direct Modules web-workspace command receives its external artifact output path. Its canonical worker/timeout/retry settings remain intact; the external JSON destination is retained.
- **RECIPE-03 resolved:** the script requires checkout-root cwd, resolves the destination's parent through `realpath`, and rejects the checkout or its descendants before installation. A missing parent fails closed. Existing external results still cannot be reused.
- **RECIPE-04 resolved:** the unchanged tracked-source guard is followed by repeated exact commit/root/application-tree comparisons before completion.

The manifest's only change is the recipe hash. Its 9,199-entry tree still matches exact frozen Git output, and all seven critical input size/hash records match both frozen and current bytes. The source remains `d4be41e60516e576c74afa304b50ed67da15cb93`, root tree `401cadde371b91606e3346243aaca6b6225aafcb`, application tree `6ae2118b797f478f5a63788841a9777d67c8001e`.

`TZ=UTC`, canonical commands, actual failure exit capture, separate output directories and fail-closed behavior remain. No AWS, Docker image build/publication or deployment command was added. The current dirty documentation-producing checkout still intentionally fails the recipe's precondition: future execution requires the script retained outside a separate clean exact-source checkout and invocation from that checkout root.

The parent's acknowledged IMPLEMENTATION wording adjustment—describe AWS Playwright1.61.1 as lock-pinned rather than an independently captured runtime version—is a remaining documentation precision follow-up, outside this corrected recipe. DOC-01's exact JSON copies and relative links were verified in the initial review and are not changed here. No running or later gate status is inferred from this static acceptance.
