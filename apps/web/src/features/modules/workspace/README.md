# Workspace implementation boundary

The Workspace feature owns document library selection, Hill Day setup and document editing, newsletter composition, and the Outreach template studio. Public entry is `WorkspaceScreen`; thin routes and shared product shell remain parent-owned.

Library and Hill Day wire contracts are derived from the existing workspace controllers/services. Campaign templates use the core Outreach V3 template contract, which is distinct from document-agent blueprints. Browser state stores only unsaved form input, selected records and view modes. Backend services own client access, private document access, version pins, persistence and policy.

Reuse: public adopted dialog/input/textarea/select/menu components, shared Module UI controls, the authenticated fixed-operation Capiro gateway and cancellation-aware queries/mutations. Dependencies flow feature → shared UI/transport → verified service definitions. No legacy Meri endpoint substitutes for greenfield Meri.

Verification covers real contract response projections, rejected scope/payload fields, form interactions, accessibility, response/error states, file size guards, TypeScript and build. Live calls, paid generation and delivery are unrun. Unsupported backend capabilities render an explicit unavailable state while retaining their designed view and local composition controls.
