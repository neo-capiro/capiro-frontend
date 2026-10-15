import type { SourceScopeView } from "../../screens/files/SourceScopeScreen";
import { fixtureHref } from "./href";

/** Synthetic 04.08 / 04.08A data: artifact v2 keeps all contributing source scopes; AR-1042 grants no access. */
const scopeBase = {
  context:
    "meeting-brief-v2.docx · v2 · Verified. Filing keeps its original source permissions and provenance.",
  scopes: ["Anduril client files", "Mailbox J. Clayton", "Federal awards"],
  client: "Anduril",
  destination: "Anduril / Documents / Meeting briefs · Authorized client team",
  audience: "Jordan Clayton · Intersection of all contributing permissions",
};

export const artifactSharing: SourceScopeView = {
  ...scopeBase,
  heading: {
    title: "Share a verified artifact",
    description:
      "The most restricted contributing source controls who can open this exact version.",
  },
  title: "Artifact access and source scopes",
  result:
    "Blocked · Destination access is broader than the contributing mailbox scope",
  notice: {
    title: "Source permission review required",
    detail:
      "Filing cannot expand access or remove provenance. Request approval to make the contributing mailbox source available to the intended audience, or choose a narrower destination. Access is rechecked before filing.",
  },
  actions: [
    {
      id: "cancel",
      label: "Cancel",
      variant: "outline",
      href: fixtureHref("word-document"),
    },
    {
      id: "request",
      label: "Request access review",
      variant: "primary",
      href: fixtureHref("source-access-review-requested"),
    },
  ],
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
