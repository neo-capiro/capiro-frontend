# Adopted dependencies

Exact versions are pinned in `apps/web/package.json` and the root npm lock. This implementation adds the packages below; existing Next, React, Clerk, Zod, Geist and canonical `packages/ui` dependencies remain adopted. License identifiers are read from the installed package metadata. Bundled upstream license files remain part of the installed distributions. No package source was copied into feature folders.

| Package | Version | License | Purpose |
| --- | --- | --- | --- |
| @fontsource/newsreader | 5.3.0 | OFL-1.1 | Locally bundled Newsreader design typography |
| @schedule-x/calendar | 4.9.1 | MIT | Calendar views and navigation |
| @schedule-x/calendar-controls | 4.9.1 | MIT | Calendar views and navigation |
| @schedule-x/react | 4.1.0 | MIT | Calendar views and navigation |
| @schedule-x/theme-default | 4.9.1 | MIT | Calendar views and navigation |
| @tiptap/core | 3.31.4 | MIT | Rich signature editing |
| @tiptap/extension-image | 3.31.4 | MIT | Rich signature editing |
| @tiptap/pm | 3.31.4 | MIT | Rich signature editing |
| @tiptap/react | 3.31.4 | MIT | Rich signature editing |
| @tiptap/starter-kit | 3.31.4 | MIT | Rich signature editing |
| dompurify | 3.4.16 | (MPL-2.0 OR Apache-2.0) | Signature HTML sanitization |
| temporal-polyfill | 0.3.2 | MIT | Calendar date/time compatibility |
| @playwright/test | 1.61.1 | Apache-2.0 | Contract/browser verification |
| vite | 8.3.4 | MIT | Contract/browser verification |
| vitest | 4.1.11 | MIT | Contract/browser verification |

Shared `packages/ui` exports now expose the already adopted dialog, input, textarea, select and dropdown-menu primitives; their source/version/license records are unchanged. The temporary local Chromium distribution used for verification is not a production dependency. Playwright can use its normal installed browser or an explicitly configured local executable through `CAPIRO_QA_CHROMIUM_EXECUTABLE`.
