import type { BrowserSignInView } from "../../screens/browser/BrowserSignInScreen";
import type { BrowserFilesView } from "../../screens/browser/BrowserFilesScreen";
import type { FieldRow } from "../../ui/FieldTable";
import { fixtureHref } from "./href";

const portal = {
  site: "Authorized research portal",
  account: "Jordan Clayton · Permitted research account",
  access: "Read source pages and download permitted documents",
  permissionsHref: fixtureHref("browser-permissions"),
  statesHref: fixtureHref("browser-connection-states"),
};

/** 07.02: before the provider sign-in completes. */
export const signIn: BrowserSignInView = {
  ...portal,
  stage: "awaiting",
  title: "Connect a supported site",
  description:
    "Site access is specific to your authorized account and this workspace.",
  dialogTitle: "Sign in to the research portal",
  dialogContext: "Only qualified connections support authenticated browsing.",
  notice: {
    title: "Secure sign-in handoff",
    body: "Complete sign-in through the supported connection flow. Meri does not inherit your desktop browser session.",
  },
  status:
    "Return here after the account is connected. You can cancel without losing the current task.",
  cancelHref: fixtureHref("browser-activity"),
};

/** 07.02A: status read back after provider sign-in; no credential reached Meri. */
export const connected: BrowserSignInView = {
  ...portal,
  stage: "connected",
  title: "Research account connected",
  description:
    "Only the provider-confirmed account and granted permissions apply to this workspace.",
  dialogTitle: "Authorized research portal",
  dialogContext: "Connection checked · Jordan Clayton · 9 Oct 2026, 10:44 AM",
  notice: {
    title: "Connected · Read and download grant",
    body: "Meri can read permitted source pages and download permitted documents. Uploads are not granted. Current access is checked again before each operation.",
  },
  status: "Provider sign-in completed. No credentials were entered into Meri.",
  filesHref: fixtureHref("browser-files"),
  receiptHref: fixtureHref("browser-files"),
  conversationHref: fixtureHref("research-progress"),
};

const downloaded = (origin: FieldRow, access: FieldRow): FieldRow[] => [
  origin,
  access,
  { label: "Downloaded", value: "9 Oct 2026, 10:44 AM" },
  { label: "Workspace location", value: "Inputs / funding-update.pdf" },
  { label: "Processing", value: "12 pages extracted · Source link retained" },
];

/** 07.03: authenticated download receipt, bound to the connection and its grant. */
export const files: BrowserFilesView = {
  description:
    "Authenticated research account · Source permissions and original link retained",
  fileName: "funding-update.pdf",
  receipt: downloaded(
    {
      label: "Original URL",
      value: "Authorized research portal / funding-update.pdf",
    },
    {
      label: "Connection and grant",
      value: "Research portal · Jordan Clayton · Read and download only",
    },
  ),
  uploadNote:
    "This connection permits reading and downloads. File uploads appear only for supported sites with an explicit upload grant and required review.",
  connected: {
    title: "Research account connected",
    detail: "Read pages and download permitted files. Uploads are not enabled.",
    status: "Connected",
  },
  browseHref: fixtureHref("browser-activity"),
  permissionsHref: fixtureHref("browser-permissions"),
};

/** 07.03A: public-source download receipt; no account or grant is involved. */
export const publicFiles: BrowserFilesView = {
  description: "Public-source download · Source-linked workspace input",
  fileName: "funding-update.pdf",
  receipt: downloaded(
    { label: "Original URL", value: "Official source document link" },
    { label: "Domain", value: "Public source · Allowed" },
  ),
  uploadNote:
    "This public source is read without a site connection. Downloads are limited to publicly available files, and uploads are not available for public sources.",
  permissionsHref: fixtureHref("browser-permissions"),
};
