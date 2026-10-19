# Relationships contenteditable assertion adapter

Commit **`850da33808dab050d2396a26233d3d3881d2fecf`**, based on mail owner `685e55039d5d3945c76085513cde8bc6c33cb55d`, changes only `apps/web/tests/browser/relationships.spec.ts:511` from `toHaveValue` to `toHaveText`. The exact locator and expected **`Synthetic message`** remain unchanged. No production code, handler, count, fixture, helper, selector or other assertion changed.

The full frozen-adbc run provides the red evidence: the provider-refusal case reaches the reopened composer, then Playwright reports **“Not an input element”** for its Message locator. The saved snapshot shows `textbox "Message" > paragraph: Synthetic message`. The RichMailEditor intentionally exposes an accessible contenteditable textbox, so `toHaveText` is the matching full-text assertion. This is not evidence of lost editor text or a failed provider-refusal handler. The test still requires the note failure, visible provider refusal, retained draft, no false “Email sent.” state, exactly one note request, exactly one send request and no unexpected requests.

`before-receipt.json` pins the original root error artifact without altering it. The owner test before this change was byte-identical to frozen adbc. `adapter-receipt.json` confirms that reversing this one matcher substitution recovers every original byte. `commit-receipt.json` and `exact.patch` bind the committed result. Both before and after production source trees are `093b9e7a128cec8ac6164fb11742d1ed848f9a7e`.

The static whole-browser audit reads **256 tracked text files, including 161 specs**, from both configured roots in exact frozen adbc: `apps/web/tests/browser` and `apps/web/test/browser`. It inspects 25 Message locator sites, multiline assertions, the rich editor's `message(page)` alias, all textarea/HTMLTextAreaElement references, `inputValue`, value-property access and direct value assertions. This Relationships assertion was the sole direct Message `toHaveValue` match; the single candidate overlay leaves none. Results and per-file source hashes are in `whole-browser-audit.json`.

Remaining relevant sites are intentional:

- `mail-local-draft`, `mail-rewrite` and `email-compose` use the existing exact plain-message helper, which explicitly handles both textarea and paragraph editor shapes.
- Thread, Portfolio and Government mail cases use `fill()`, supported by contenteditable. Their Cc/Subject `toHaveValue` assertions target actual inputs.
- `mail-rich-compose` checks message text, child formatting and `innerHTML`; it makes no input-value assumption.
- The only direct textarea locator is the independent manual-debrief Meeting context height assertion. The helper's guarded `HTMLTextAreaElement` branch has a rich-text fallback. Other `.value` accesses belong to fixture records, a separate integration-probe input or watchlist terms.

This is a tracked-source search and manual call-site review, not browser execution or a proof about arbitrary dynamic selectors. `git diff --check` passed; static preservation checks passed. **Green browser execution is unrun:** no browser/build/typecheck lease was granted, and the root suite remains active. Root owns unchanged-test replay and qualification on the final integrated source.

The existing untracked `node_modules` link was preserved and was not staged. Only the explicit test path was committed. Old Mail qualification, sealed independent reviews, root source and active gate evidence remain unchanged. No provider/native action occurred.
