import { approvalScreens } from "./approvals";
import { artifactScreens } from "./artifacts";
import { memoryScreens } from "./memory";
import { routineScreens } from "./routines";
import { runScreens } from "./runs";
import { sameScreen } from "./same-screen";
import type { RegisteredFixtureScreen } from "./types";

/**
 * Figma 3.4 10.28–10.32 dark desktop frames. Each renders the same screen and fixture
 * data as its light desktop frame; the shell's dark tokens and the screen's CSS theme it.
 */
export const darkScreens: readonly RegisteredFixtureScreen[] = [
  {
    slug: "dark-run-detail",
    figmaId: "10.28",
    figmaNode: "3032:32570",
    title: "Dark run detail",
    section: "runs",
    Screen: sameScreen(runScreens, "run-detail"),
  },
  {
    slug: "dark-approval-center",
    figmaId: "10.29",
    figmaNode: "3032:33006",
    title: "Dark approval center",
    section: "approvals",
    Screen: sameScreen(approvalScreens, "approval-center"),
  },
  {
    slug: "dark-workspace-files",
    figmaId: "10.30",
    figmaNode: "3032:33402",
    title: "Dark workspace files",
    section: "files",
    Screen: sameScreen(artifactScreens, "workspace-files"),
  },
  {
    slug: "dark-memory-recall",
    figmaId: "10.31",
    figmaNode: "3033:31453",
    title: "Dark memory recall",
    section: "memory",
    Screen: sameScreen(memoryScreens, "memory-recall"),
  },
  {
    slug: "dark-routines",
    figmaId: "10.32",
    figmaNode: "3033:31843",
    title: "Dark routines",
    section: "routines",
    Screen: sameScreen(routineScreens, "routines"),
  },
];
