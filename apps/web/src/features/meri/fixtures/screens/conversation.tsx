import {
  ScopeScreen,
  type ScopeView,
} from "../../screens/conversation/ScopeScreen";
import {
  ConversationHistoryScreen,
  type HistoryView,
} from "../../screens/conversation/ConversationHistoryScreen";
import {
  CommandPaletteScreen,
  type PaletteView,
} from "../../screens/conversation/CommandPaletteScreen";
import { ResearchProgressScreen } from "../../screens/conversation/ResearchProgressScreen";
import { SpecialistActivityScreen } from "../../screens/conversation/SpecialistActivityScreen";
import { ToolActivityScreen } from "../../screens/conversation/ToolActivityScreen";
import { ExpandedToolActivityScreen } from "../../screens/conversation/ExpandedToolActivityScreen";
import {
  ConversationManagementScreen,
  type ManagementView,
} from "../../screens/conversation/ConversationManagementScreen";
import { historyViews } from "./conversation-history";
import {
  expandedToolActivityView,
  researchView,
  specialists,
  toolActivityView,
} from "./conversation-progress";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

const scope: ScopeView = {
  appliedId: "anduril",
  options: [
    {
      id: "anduril",
      name: "Anduril",
      detail: "Client records, files, tasks and approved memory",
      dataScope: [
        "Client records and timelines",
        "Approved institutional memory",
        "Authorized mailboxes and documents",
        "Public sources",
      ],
    },
    {
      id: "general",
      name: "General workspace",
      detail: "Your permitted firm sources and personal files",
      dataScope: ["Permitted firm sources", "Personal files", "Public sources"],
    },
    {
      id: "aerovironment",
      name: "AeroVironment",
      detail: "Authorized client workspace",
      dataScope: ["Client records and timelines", "Public sources"],
    },
  ],
};

const palette: PaletteView = {
  initialQuery: "meeting brief",
  items: [
    {
      id: "brief",
      kind: "conversation",
      title: "Anduril meeting brief",
      detail: "Conversation · Anduril · Today",
    },
    {
      id: "brief-docx",
      kind: "artifact",
      title: "meeting-brief-v2.docx",
      detail: "Artifact · Version 2 · Verified",
    },
    {
      id: "monday",
      kind: "routine",
      title: "Monday meeting preparation",
      detail: "Routine · America/New_York",
      href: fixtureHref("routines"),
    },
    {
      id: "new",
      kind: "command",
      title: "Create a new conversation",
      detail: "Command",
    },
  ],
};

const management: ManagementView = {
  title: "Anduril meeting brief",
  suggestedTitle: "Anduril meeting brief — October",
  branches: [
    { id: "first", prompt: "Create a one-page brief for the Anduril meeting." },
    {
      id: "second",
      prompt: "Create a two-page brief focused on open commitments.",
    },
  ],
  archived: {
    title: "Archived",
    detail:
      "This conversation is hidden from recent history and remains searchable where permitted.",
  },
};

/** 01.04 and its states share one screen; each frame opens it with its own local state. */
function History({ view }: { view: HistoryView }) {
  return (
    <ConversationHistoryScreen view={view} unavailable={fixtureUnavailable} />
  );
}

export const conversationScreens: readonly FixtureScreen[] = [
  {
    slug: "choose-scope",
    figmaId: "01.03",
    figmaNode: "1064:144332",
    title: "Choose client and data scope",
    Screen: () => <ScopeScreen view={scope} unavailable={fixtureUnavailable} />,
  },
  {
    slug: "choose-scope-no-matches",
    figmaId: "01.03A",
    figmaNode: "3034:37692",
    title: "Scope picker no matches",
    Screen: () => (
      <ScopeScreen
        view={{ ...scope, initialQuery: "Unlisted client" }}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "conversation-history",
    figmaId: "01.04",
    figmaNode: "1064:144425",
    title: "Conversation history",
    Screen: () => <History view={historyViews.all} />,
  },
  {
    slug: "conversation-history-empty",
    figmaId: "01.04A",
    figmaNode: "3034:32186",
    title: "Empty conversation history",
    Screen: () => <History view={historyViews.empty} />,
  },
  {
    slug: "conversation-history-no-matches",
    figmaId: "01.04B",
    figmaNode: "3034:32443",
    title: "No matching conversations",
    Screen: () => <History view={historyViews.noMatches} />,
  },
  {
    slug: "conversation-history-complete",
    figmaId: "01.04C",
    figmaNode: "3034:36844",
    title: "Completed conversation filter",
    Screen: () => <History view={historyViews.complete} />,
  },
  {
    slug: "conversation-history-anduril",
    figmaId: "01.04D",
    figmaNode: "3034:37090",
    title: "Anduril conversation filter",
    Screen: () => <History view={historyViews.anduril} />,
  },
  {
    slug: "conversation-history-general",
    figmaId: "01.04E",
    figmaNode: "3034:37336",
    title: "General conversation filter",
    Screen: () => <History view={historyViews.general} />,
  },
  {
    slug: "conversation-history-running",
    figmaId: "01.04F",
    figmaNode: "3048:34348",
    title: "Running conversation filter",
    Screen: () => <History view={historyViews.running} />,
  },
  {
    slug: "conversation-history-archived",
    figmaId: "01.04G",
    figmaNode: "3048:34602",
    title: "Archived conversation filter",
    Screen: () => <History view={historyViews.archived} />,
  },
  {
    slug: "conversation-history-after-deletion",
    figmaId: "01.04H",
    figmaNode: "3043:38316",
    title: "History after selected conversation deletion",
    Screen: () => <History view={historyViews.afterDeletion} />,
  },
  {
    slug: "conversation-client-filter",
    figmaId: "13.21",
    figmaNode: "3034:37582",
    title: "Conversation client filter menu",
    Screen: () => <History view={historyViews.clientMenu} />,
  },
  {
    slug: "conversation-status-filter",
    figmaId: "13.22",
    figmaNode: "3034:37596",
    title: "Conversation status filter menu",
    Screen: () => <History view={historyViews.statusMenu} />,
  },
  {
    slug: "command-palette",
    figmaId: "01.05",
    figmaNode: "1064:144529",
    title: "Search and command palette",
    Screen: () => <CommandPaletteScreen view={palette} />,
  },
  {
    slug: "command-palette-no-matches",
    figmaId: "01.05A",
    figmaNode: "3034:37943",
    title: "Command palette no matches",
    Screen: () => (
      <CommandPaletteScreen
        view={{ ...palette, initialQuery: "Unlisted source" }}
      />
    ),
  },
  {
    slug: "research-progress",
    figmaId: "02.01",
    figmaNode: "1064:144151",
    title: "Research in progress",
    Screen: () => (
      <ResearchProgressScreen
        view={researchView()}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "specialist-activity",
    figmaId: "02.02",
    figmaNode: "1064:144601",
    title: "Parallel specialist activity",
    Screen: () => (
      <SpecialistActivityScreen
        view={specialists}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "tool-activity",
    figmaId: "02.07",
    figmaNode: "1064:145061",
    title: "Tool activity and receipts",
    Screen: () => (
      <ToolActivityScreen
        view={toolActivityView()}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "tool-activity-expanded",
    figmaId: "02.07A",
    figmaNode: "3027:28579",
    title: "Expanded tool activity",
    Screen: () => (
      <ExpandedToolActivityScreen
        view={expandedToolActivityView()}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "conversation-management",
    figmaId: "09.08",
    figmaNode: "1064:148633",
    title: "Conversation management and branches",
    Screen: () => (
      <ConversationManagementScreen
        view={management}
        unavailable={fixtureUnavailable}
      />
    ),
  },
];
