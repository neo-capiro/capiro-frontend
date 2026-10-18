/**
 * Meri resources the backend does not serve to the browser yet. Each entry is that resource's
 * client adapter until a public route exists: it reports "not available yet" with the exact missing
 * route or contract and its owner, and it never returns records. Replace an entry with a real
 * adapter when `neo-capiro/meri-greenfield` publishes the route through a versioned contract.
 */
export type UnavailableResource = Readonly<{
  /** Short user-facing name of the resource. */
  label: string;
  /** One sentence for people: what is missing and what still works. */
  summary: string;
  /** The exact route or contract that does not exist yet. */
  missing: string;
  /** Repository area that owns the missing route. */
  owner: string;
}>;

const conversations = "neo-capiro/meri-greenfield apps/control/conversations";

export const unavailableResources = Object.freeze({
  conversationList: {
    label: "Recent conversations",
    summary:
      "Searching conversations is not available yet. Recent conversations and the current conversation still work.",
    missing:
      "A conversation search route. The service lists recent conversations with paging (POST /api/conversations/list), which Recents uses, but cannot search them.",
    owner: `${conversations} (conversation-wide history lane)`,
  },
  conversationHistory: {
    label: "Earlier turns",
    summary:
      "Turns from before this page was opened are not shown. Turns sent here stay visible until you leave.",
    missing:
      "Conversation-wide history across runs. POST /api/conversations/history returns only the run bound to the current session.",
    owner: `${conversations} (conversation-wide history lane)`,
  },
  newConversation: {
    label: "New conversation",
    summary:
      "Starting a separate conversation is not available yet. The service chooses the current conversation for this client.",
    missing:
      "A create-conversation selector. POST /api/action-followthrough/session accepts only conversationId, runId and clientId hints that must match the service's own choice.",
    owner: "neo-capiro/meri-greenfield apps/control/action-host/session",
  },
  runs: {
    label: "Runs",
    summary:
      "A list of runs is not available yet. The current run's status and Stop are shown in the conversation.",
    missing:
      "A run list route. Steer, pause, resume and fork use the private POST /api/conversations/control, which has no public contract export.",
    owner: `${conversations}/lifecycle`,
  },
  approvals: {
    label: "Approvals",
    summary:
      "The approval center is not available yet. Approval requests published in the current conversation are shown there, without decisions.",
    missing:
      "An approval list route and a browser approval decision route. Only approval.required conversation events are published.",
    owner: "neo-capiro/meri-greenfield apps/control (approval owner)",
  },
  memory: {
    label: "Memory",
    summary: "Institutional memory and memory proposals are not available yet.",
    missing:
      "Memory recall, memory proposal and memory review routes. No browser memory route or event type exists.",
    owner: "neo-capiro/meri-greenfield governed memory owner",
  },
  routines: {
    label: "Routines",
    summary: "Routines are not available yet.",
    missing:
      "Browser routes for the schedule owner (create, update, cancel and history exist only as server source in apps/control/schedules).",
    owner: "neo-capiro/meri-greenfield apps/control/schedules",
  },
  dataAccess: {
    label: "Data access",
    summary: "Source coverage and data access are not available yet.",
    missing:
      "A source coverage route. Retrieval contracts exist but have no bound handlers.",
    owner: "neo-capiro/meri-greenfield gateway and source adapters",
  },
  preferences: {
    label: "Meri preferences",
    summary:
      "Meri preferences cannot be read or saved yet. Nothing on this page is stored.",
    missing:
      "Meri settings read and write routes (preferences, connectors, limits, skills, notifications, privacy).",
    owner: "neo-capiro/meri-greenfield settings owner",
  },
  attachments: {
    label: "Attachments",
    summary: "Attaching files to a message is not available yet.",
    missing:
      "An upload and extraction route. The artifact owner publishes only files Meri generates.",
    owner: "neo-capiro/meri-greenfield apps/artifacts",
  },
  workspaceFiles: {
    label: "All workspace files",
    summary:
      "A list of every file in the workspace is not available yet. Files created in the current conversation are listed with it.",
    missing:
      "A workspace-wide artifact list route. Artifacts are published only as artifact.available conversation events.",
    owner: "neo-capiro/meri-greenfield apps/artifacts",
  },
} satisfies Record<string, UnavailableResource>);

export type UnavailableResourceId = keyof typeof unavailableResources;

/** Tooltip text for a disabled control that depends on an unavailable resource. */
export const unavailableTitle = (id: UnavailableResourceId) =>
  `Not available yet: ${unavailableResources[id].summary} Missing: ${unavailableResources[id].missing}`;
