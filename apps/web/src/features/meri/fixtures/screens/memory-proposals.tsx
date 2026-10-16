import { MemoryProposalScreen } from "../../screens/memory/MemoryProposalScreen";
import type { MemoryProposalView } from "../../screens/memory/proposal-phases";
import { fixtureHref, fixtureUnavailable } from "./href";
import {
  changesRequested,
  draft,
  loadError,
  loading,
  pending,
  rejected,
  retrying,
  revised,
  submitting,
} from "./memory-proposal-states";
import {
  changed,
  refreshed,
  restricted,
  statusConfirmed,
  statusUncertain,
  submissionError,
} from "./memory-review-states";
import type { FixtureScreen } from "./types";

const proposalScreen = (
  view: MemoryProposalView,
  closeHref = fixtureHref("memory-recall"),
) =>
  function ProposalFixture() {
    return (
      <MemoryProposalScreen
        view={view}
        closeHref={closeHref}
        unavailable={fixtureUnavailable}
      />
    );
  };

/** Memory proposal lifecycle: one shared proposal dialog in each explicit Figma state (05.06, 05.10–05.20A). */
export const memoryProposalScreens: readonly FixtureScreen[] = [
  {
    slug: "memory-proposal",
    figmaId: "05.06",
    figmaNode: "1064:147204",
    title: "Memory update proposal",
    Screen: proposalScreen(draft, fixtureHref("memory-detail")),
  },
  {
    slug: "memory-proposal-submitting",
    figmaId: "05.10",
    figmaNode: "3019:28780",
    title: "Memory proposal — submitting",
    Screen: proposalScreen(submitting),
  },
  {
    slug: "memory-proposal-pending",
    figmaId: "05.11",
    figmaNode: "3019:28977",
    title: "Memory proposal — submitted and pending",
    Screen: proposalScreen(pending),
  },
  {
    slug: "memory-proposal-rejected",
    figmaId: "05.12",
    figmaNode: "3019:29174",
    title: "Memory proposal — rejected",
    Screen: proposalScreen(rejected),
  },
  {
    slug: "memory-proposal-changes-requested",
    figmaId: "05.13",
    figmaNode: "3019:29371",
    title: "Memory proposal — changes requested",
    Screen: proposalScreen(changesRequested),
  },
  {
    slug: "memory-proposal-revised",
    figmaId: "05.14",
    figmaNode: "3019:29568",
    title: "Memory proposal — revised draft",
    Screen: proposalScreen(revised),
  },
  {
    slug: "memory-proposals-loading",
    figmaId: "05.15",
    figmaNode: "3019:29765",
    title: "Memory proposals — loading",
    Screen: proposalScreen(loading),
  },
  {
    slug: "memory-proposals-load-error",
    figmaId: "05.16",
    figmaNode: "3019:29962",
    title: "Memory proposals — load error",
    Screen: proposalScreen(loadError),
  },
  {
    slug: "memory-proposals-retrying",
    figmaId: "05.16B",
    figmaNode: "3062:34870",
    title: "Memory proposals — retry loading in progress",
    Screen: proposalScreen(retrying),
  },
  {
    slug: "memory-proposal-submission-error",
    figmaId: "05.17",
    figmaNode: "3019:30159",
    title: "Memory proposal — submission error",
    Screen: proposalScreen(submissionError),
  },
  {
    slug: "memory-review-status-uncertain",
    figmaId: "05.18",
    figmaNode: "3019:30356",
    title: "Memory review — decision status uncertain",
    Screen: proposalScreen(statusUncertain),
  },
  {
    slug: "memory-review-status-confirmed",
    figmaId: "05.18A",
    figmaNode: "3062:35082",
    title: "Memory review — status confirmed",
    Screen: proposalScreen(statusConfirmed),
  },
  {
    slug: "memory-review-restricted",
    figmaId: "05.19",
    figmaNode: "3019:30553",
    title: "Memory review — access restricted",
    Screen: proposalScreen(restricted),
  },
  {
    slug: "memory-proposal-changed",
    figmaId: "05.20",
    figmaNode: "3019:30750",
    title: "Memory proposal — changed while open",
    Screen: proposalScreen(changed),
  },
  {
    slug: "memory-proposal-refreshed",
    figmaId: "05.20A",
    figmaNode: "3062:35293",
    title: "Memory proposal — refreshed to latest revision",
    Screen: proposalScreen(refreshed),
  },
];
