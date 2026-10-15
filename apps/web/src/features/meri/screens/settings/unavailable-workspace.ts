import type { ConnectorAccountsView } from "./ConnectorAccountsScreen";
import type { PersonalPreferencesView } from "./PersonalPreferencesScreen";
import type { SkillsTemplatesView } from "./SkillsTemplatesScreen";
import type { UsageLimitsView } from "./UsageLimitsScreen";

/** Canonical 09.01–09.04 copy with no account data (see preferences-unavailable.ts). */
export const personal: PersonalPreferencesView = {
  heading: {
    title: "Personal defaults",
    description:
      "Writing, appearance and accessibility for your Meri workspace.",
  },
  defaults: {
    title: "Writing and workspace defaults",
    fields: [
      {
        id: "style",
        label: "Writing style",
        value: "",
        placeholder: "Concise, direct and grounded in sources",
      },
      {
        id: "scope",
        label: "Default scope",
        value: "",
        placeholder: "Ask me when starting a new conversation",
      },
      {
        id: "template",
        label: "Artifact template",
        value: "",
        placeholder: "Capiro client brief",
      },
    ],
  },
  appearance: {
    title: "Appearance",
    description: "Choose a workspace preview. Persistence is unavailable.",
    options: ["Light", "Dark", "System"],
    initial: "Light",
    previews: {
      Light: {
        title: "Light preview",
        detail:
          "Current appearance preview · Follows the shared Capiro design tokens.",
      },
      Dark: {
        title: "Dark preview",
        detail:
          "Preview only · Persistence is unavailable, so the workspace keeps its current appearance.",
      },
      System: {
        title: "System preview",
        detail:
          "Preview only · Follows the device colour scheme once persistence is available.",
      },
    },
  },
  accessibility: {
    title: "Accessibility",
    fields: [
      {
        id: "motion",
        label: "Reduced motion",
        value: "",
        placeholder: "Use static progress; avoid animated shimmer.",
      },
      {
        id: "keyboard",
        label: "Keyboard navigation",
        value: "",
        placeholder: "Visible focus and accessible control names.",
      },
    ],
    links: [{ label: "Keyboard shortcuts" }, { label: "Templates and skills" }],
  },
  clear: {
    title: "Clear personal defaults?",
    description:
      "Writing style, default scope and artifact template will reset. Workspace policies and permissions stay in effect.",
    confirm: "Clear defaults",
  },
};

export const connections: ConnectorAccountsView = {
  heading: {
    title: "Connections",
    description: "Authorized accounts, granted scope and source health.",
  },
  connections: {
    title: "Meri authorized connections",
    description: "Current connection data is unavailable.",
    rows: [
      {
        id: "unavailable",
        connection: "Meri connection data is unavailable.",
        account: "—",
        scope: "—",
        refresh: "—",
        health: "—",
      },
    ],
  },
  grantedScope: {
    title: "Granted scope",
    description:
      "Private mail and memory remain limited to their granted audience. Administrators manage tenant policies separately from personal preferences.",
    notice: {
      title: "Provider sign-in",
      detail:
        "Credentials are never entered into Meri. Sign-in and authorization happen with the provider.",
    },
  },
  unavailable: {
    title: "Connection data unavailable",
    detail:
      "Reconnect and disconnect remain unavailable until Meri is connected.",
    tone: "warning",
  },
  disconnect: {
    description:
      "Future retrieval stops. Existing conversations and outputs are rechecked against current access before opening. Provider credentials are never entered into Meri.",
    confirm: "Confirm disconnect",
  },
};

const unavailablePolicy = "Enforced by workspace policy · unavailable";

export const usage: UsageLimitsView = {
  heading: {
    title: "Usage and limits",
    description:
      "Every attempt counts, including failed, cancelled and retried attempts.",
  },
  metrics: ["Today’s usage", "Current run", "Available capacity"].map(
    (label) => ({ label, value: "—", caption: "Live data unavailable" }),
  ),
  runUsage: {
    title: "Run usage",
    rows: [
      {
        id: "unavailable",
        run: "—",
        outcome: "Meri run usage is unavailable.",
        attempts: "—",
        usage: "—",
      },
    ],
  },
  configuration: {
    title: "Workspace configuration",
    fields: [
      {
        id: "model",
        label: "Agent model",
        value: "Workspace-approved configuration unavailable",
      },
    ],
    limits: ["Budget", "Concurrency", "Deadline"].map((label) => ({
      label,
      value: unavailablePolicy,
    })),
    footnote:
      "Ordinary users see effective limits and usage. Configuration controls are shown only to authorized administrators.",
  },
  limitStates: {
    title: "Limit states",
    description:
      "Illustrative behavior; thresholds come from workspace policy.",
    notices: [
      {
        title: "Near limit",
        detail:
          "Finish or reduce remaining work. The enforced workspace budget applies to every attempt.",
        tone: "warning",
      },
      {
        title: "Workspace budget reached",
        detail:
          "New work is unavailable until capacity is restored by the workspace policy owner.",
        tone: "danger",
      },
      {
        title: "Concurrency reached",
        detail:
          "The run remains queued. It will start when capacity is available and authorization is rechecked.",
      },
    ],
    queue: { label: "View run queue" },
  },
};

export const skills: SkillsTemplatesView = {
  heading: {
    title: "Skills and templates",
    description: "Workspace-approved ways to begin supported work.",
  },
  skills: {
    title: "Meri artifact templates",
    description: "Reusable ways to begin supported work.",
    items: [
      {
        title: "Research brief",
        description:
          "A sourced brief with explicit coverage and current facts.",
        output: "Designed output · document",
      },
      {
        title: "Spreadsheet analysis",
        description: "Verified values, charts and supported formulas.",
        output: "Designed output · spreadsheet",
      },
      {
        title: "Client update deck",
        description: "A concise deck with speaker notes and references.",
        output: "Designed output · presentation",
      },
    ],
  },
  approved: {
    title: "Approved artifact templates",
    rows: [
      {
        id: "unavailable",
        template: "Approved template data is unavailable.",
        owner: "—",
        output: "—",
      },
    ],
    footnote:
      "Template uploads follow your workspace role. Brand assets and examples retain their source permissions.",
  },
  notices: [
    {
      title: "Workspace-approved skills",
      detail:
        "A skill or template cannot grant permissions or add arbitrary instructions as authority.",
    },
    {
      title: "No approved templates",
      detail:
        "When no permitted template is available, show an empty state and keep attachment unavailable.",
    },
  ],
};
