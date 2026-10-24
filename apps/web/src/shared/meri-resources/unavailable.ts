/**
 * Explanations for unavailable controls, including source-supported slices that are held by
 * configuration or lack an ordinary consumer. Existing server routes and validated configuration
 * own activation; source reception alone never means a workspace is enabled.
 */
export type UnavailableResource = Readonly<{
  /** Short user-facing name of the resource. */
  label: string;
  /** One sentence for people: what is missing and what still works. */
  summary: string;
  /** Precise remaining dependency; do not claim published contracts are absent. */
  missing: string;
  /** Repository area that owns the missing route. */
  owner: string;
}>;

const conversations = "neo-capiro/meri-greenfield apps/control/conversations";

export const unavailableResources = Object.freeze({
  conversationList: {
    label: "Recent conversations",
    summary:
      "Connect to Meri to search your chat titles and manage saved conversations.",
    missing:
      "Current access and serving configuration for the published conversation summaries and management routes.",
    owner: `${conversations} (conversation-wide history lane)`,
  },
  conversationHistory: {
    label: "Earlier turns",
    summary:
      "Saved history requires a verified conversation connection. Reconnect to read earlier turns.",
    missing:
      "Current access and serving configuration for the published conversation transcript and run-history routes.",
    owner: `${conversations} (conversation-wide history lane)`,
  },
  newConversation: {
    label: "New conversation",
    summary:
      "Starting a separate conversation requires an enabled connection and a permitted configured client.",
    missing:
      "Qualified Core bootstrap and current Meri admission. The idempotent new-conversation consumer already exists; opening or reconnecting does not create a new conversation.",
    owner: "neo-capiro/meri-greenfield apps/control/action-host/session",
  },
  runs: {
    label: "Runs",
    summary:
      "A list of runs is not available yet. Current runs can be reviewed within an enabled conversation.",
    missing:
      "A public run-list consumer. conversation-lifecycle/0.1.0 already exports control and checkpoint inspection; activation and safe recovery remain separately qualified.",
    owner: `${conversations}/lifecycle`,
  },
  approvals: {
    label: "Approvals",
    summary:
      "The approval center is not available yet. Enabled proposal decisions are reviewed within their conversation.",
    missing:
      "A workspace-wide approval inbox. Versioned conversation intent list and decision consumers already exist behind their deployment gate.",
    owner: "neo-capiro/meri-greenfield apps/control (approval owner)",
  },
  memory: {
    label: "Memory",
    summary:
      "Full institutional memory is not available yet. Personal owner review is a separately enabled workspace.",
    missing:
      "The complete recall/proposal/governance composition. The personal owner-memory review route already exists and requires its current Core connection.",
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
      "Personal Meri preferences can be saved when their connection is enabled. Other settings remain unavailable unless separately connected.",
    missing:
      "Activation of the published user-preferences read/save consumer. Connector grants, limits, skills, notifications and privacy have separate owners and remaining dependencies.",
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
