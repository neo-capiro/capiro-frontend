import type { SourceScopeDetailsView } from "../../screens/files/SourceScopeDetails";
import type { SourceScopeView } from "../../screens/files/SourceScopeScreen";
import type { DownloadOption } from "../../screens/files/types";
import { fixtureHref } from "./href";

/**
 * Synthetic 04.08 / 04.08A / 04.08B data: artifact v2 keeps all contributing source
 * scopes; AR-1042 grants no access; the source bundle holds only sources you can open.
 */

/** The meeting brief's permitted source bundle, offered by the sharing view and the PDF download. */
export const briefBundleOption: DownloadOption = {
  id: "bundle",
  label: "Permitted source bundle",
  detail: "ZIP · Only sources you can open",
};

const scopeBase = {
  context:
    "meeting-brief-v2.docx · v2 · Verified. Filing keeps its original source permissions and provenance.",
  scopes: ["Anduril client files", "Mailbox J. Clayton", "Federal awards"],
  client: "Anduril",
  destination: "Anduril / Documents / Meeting briefs · Authorized client team",
  audience: "Jordan Clayton · Intersection of all contributing permissions",
};

const sharing: Omit<SourceScopeDetailsView, "actions"> = {
  ...scopeBase,
  title: "Artifact access and source scopes",
  result:
    "Blocked · Destination access is broader than the contributing mailbox scope",
  notice: {
    title: "Source permission review required",
    detail:
      "Filing cannot expand access or remove provenance. Request approval to make the contributing mailbox source available to the intended audience, or choose a narrower destination. Access is rechecked before filing.",
  },
  bundle: {
    title: "meeting-brief-v2-sources.zip",
    description:
      "Permitted source bundle · Exact version v2 · Only sources you can open",
    options: [briefBundleOption],
  },
};

const sharingActions = (
  leave: SourceScopeDetailsView["actions"][number],
): SourceScopeDetailsView["actions"] => [
  leave,
  {
    id: "bundle",
    label: "Download source bundle",
    variant: "outline",
    local: "bundle",
  },
  {
    id: "request",
    label: "Request access review",
    variant: "primary",
    href: fixtureHref("source-access-review-requested"),
  },
];

/** 04.08 as its own page; Cancel returns to the document. */
export const artifactSharing: SourceScopeView = {
  ...sharing,
  heading: {
    title: "Share a verified artifact",
    description:
      "The most restricted contributing source controls who can open this exact version.",
  },
  actions: sharingActions({
    id: "cancel",
    label: "Cancel",
    variant: "outline",
    href: fixtureHref("word-document"),
  }),
};

/** 04.08B: the same view as a dialog over the document; Back to document closes it. */
export const documentSharing: SourceScopeDetailsView = {
  ...sharing,
  actions: sharingActions({
    id: "back",
    label: "Back to document",
    variant: "outline",
    local: "close",
  }),
};

export const accessReviewRequested: SourceScopeView = {
  ...scopeBase,
  heading: {
    title: "Source access review requested",
    description: "AR-1042 · Anduril · meeting-brief-v2.docx · Exact version v2",
  },
  title: "Request AR-1042 submitted",
  result: "Pending · The artifact remains restricted to Jordan Clayton",
  notice: {
    title: "Approval requested · No access has changed",
    detail:
      "An authorized source owner must review the requested mailbox scope for this exact artifact version. Until that decision is recorded, filing stays blocked. The approval covers only the requested audience and source grant; access is rechecked before filing.",
  },
  actions: [
    {
      id: "back",
      label: "Back to access details",
      variant: "outline",
      href: fixtureHref("artifact-sharing"),
    },
    {
      id: "approval",
      label: "View approval request",
      variant: "outline",
      href: fixtureHref("source-access-review"),
    },
  ],
};
