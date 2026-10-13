# Final independent Docker context acceptance

**ACCEPTED — no remaining blocker in this bounded review.** Both source findings in the preserved initial report are corrected, and fresh root executions bind the exact corrected helper. This acceptance supersedes the initial changes-requested verdict; all original snapshots, reports and failures remain preserved.

Final committed source: `adbc84b2251fe6b06cb7f75030026fba5b4ff498`; all four reviewed blobs match this commit exactly (committed-binding.json).

Final helper SHA256: `404e52d329f094b44928a0d8148501cec937ec6929c0c3fb52799a25fc6c1a35`. Final CLI-test SHA256: `393f0c193faaf08110515f82b01bac11ea364cfd7f894b5e9568d10239efd998`. Corrected .dockerignore SHA256: `0e4ca55ceb868d95b904348b39f3bd86ac55bf26d73cc922ccaea25af9e0b53a`. Exact source snapshots are listed in final-source-binding.json; its pending-execution timestamp is superseded by final-evidence-binding.json.

The helper now resolves the nearest existing output ancestor with realpath, reconstructs the candidate beneath that canonical path, and compares it with the canonical checkout before any directory creation. This rejects the reviewed symlink-into-checkout case. Option lookup now uses Map, accepting only the two explicit flags; inherited names cannot reach execution. New negative controls cover toString/constructor/__proto__ and the symlinked output path while preserving import/help/missing/reused-output checks. Import remains side-effect-free, and the helper retains one bounded fixture/export/verification responsibility without a custom Docker matcher.

Root's final real Docker executions both identify the exact helper SHA above:

- `context-final-script-baseline/report.json`: Docker export exit0, 21 canary expectations pass, exactly12 tracked Work members absent. This is the expected functional failure of the old ignore rule.
- `context-final-script-corrected/report.json`: Docker export exit0, all33 checks pass, including the12 Work file payload hashes and all21 canary expectations.
- `cli-final-script-tests.log`: three suites pass, zero failures/skips/cancellations, including the new refusal controls.

The reviewer independently read and rehashed all retained export files for both final context runs; every result matches its receipt. Raw receipt copies and their hashes are in final-evidence-binding.json. The earlier default-Docker-config read-only failure remains setup-only evidence. Earlier helper versions and their red/green attempts remain historical evidence, not substituted for this final execution binding.

The .dockerignore `**/work` → `work` correction restores the nested source namespace while continuing to exclude the root work artifact directory. Current source has12 tracked Work members; d5dd had11. The regression discovers that inventory from Git and confirms route/public entry presence. No prior frozen source was modified. Full application/container build, runtime smoke, image qualification and native acceptance remain separate root-owned gates.

This review ran no Docker, CLI tests, browser, typecheck, installation, build or provider/native/cloud action and edited no source. It inspected source and root-produced evidence only.
