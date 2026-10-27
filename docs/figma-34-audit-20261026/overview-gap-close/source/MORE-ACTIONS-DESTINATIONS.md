## More-actions destination follow-up

Focused read-only Figma search of native Portfolio section, integration/recovery sections, parity catalog and continuations found no client-edit/export/archive frames. Existing **prospect** edit references are [Company Info](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-186414), [Government Registration](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-186568), [Sector & Tracks](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-186725). These may supply native dialog components but must be adapted to Client/Overview context; do not navigate a client action into a Prospect record.

### Export target

Source: [ClientProfileExport.tsx](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/export/ClientProfileExport.tsx), [actions.ts](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/export/actions.ts).

Title **Export client profile**. Description **Download a JSON snapshot of the saved profile and its intelligence sources.**

Body: The snapshot includes sensitive client information available to your account. Source values and attribution are preserved in the JSON.

Actions: Close + Prepare JSON; pending Preparing…; failure Retry preparation. Once prepared:

- Complete: **Profile ready to download**; client name; Client profile and intelligence are included.; Prepared timestamp; **Download JSON**.
- Partial: **Partial profile ready to download**; client name; Intelligence was unavailable and is omitted. The JSON records this omission and the source error.; Prepared timestamp; **Download partial JSON**.
- Unauthorized: A current authorized client session is required. Preparation/download cannot continue.

Preparation reads current client and intelligence source; intelligence401/403 blocks export. Other intelligence failures produce explicit partial output with recorded omission. There is no invented PDF/CSV selector.

### Archive target

Source: [ArchiveClientDialog.tsx](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-intake/ArchiveClientDialog.tsx).

Title **Archive client**. Description **Archive {client name}?**

Body: **This removes the client from the active Portfolio. Its saved records are retained.**

Actions **Cancel**, **Archive client** / **Archiving…**. Close/X/Escape/scrim are blocked while pending. Identity loading/failure with retry and archive error use QueryState. Role denial: **Your role cannot archive clients.** On success invalidate relevant caches and navigate /portfolio. Do not call this deletion.

### Client edit target

Source: [ClientIntakeDialog.tsx](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-intake/ClientIntakeDialog.tsx), CompanyStep.tsx, RegistrationStep.tsx and SectorStep.tsx in the same directory.

In-place dialog; no standalone edit route. Title **Edit client details**, client-name description. Three steps:

1. **Company Info**: legal name* max200, website*, company description* max600, main company email, main company phone, Small Business Classification. Company logo supports PNG/JPEG/SVG/WebP up to2MB with Upload logo and Remove selected logo.
2. **Government Registration**: CAGE Code max5, UEI max12, SAM.gov status, SAM.gov expiration date, LDA registrant name, EIN, NAICS codes, PSC codes, organization types, federal set-aside certifications.
3. **Sector & Tracks**: sector tags; conditional **Primary sector** selector when sectors exist (absent in old prospect Figma reference); funding priorities up to20×120chars; active submission tracks; LDA issue codes; engagement start date; Primary POC at client; Internal notes max2000, explicitly distinct from activity and profile notes.

Footer **Cancel**, **Back** where applicable, **Next** then **Save changes**. Pending disables dismissal and inputs; validation focuses first invalid control and displays Check the highlighted fields before continuing. Admin required. Successful profile save but failed logo is separate: profile saved; logo not confirmed; Retry logo or Continue to profile.

