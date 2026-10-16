import { approvalScreens } from "./approvals";
import { artifactScreens } from "./artifacts";
import { browserScreens } from "./browser";
import { conversationScreens } from "./conversation";
import { fileScreens } from "./files";
import { memoryScreens } from "./memory";
import { routineScreens } from "./routines";
import { runScreens } from "./runs";
import { sameScreen } from "./same-screen";
import type { RegisteredFixtureScreen } from "./types";

/**
 * Figma 3.4 final phone (390×844) and tablet (1024×1100) frames added on 15 October. Each entry
 * renders the same screen and fixture data as its desktop frame; the screen's own CSS adapts it.
 */
export const mobileScreens: readonly RegisteredFixtureScreen[] = [
  {
    slug: "phone-routines",
    figmaId: "10.19",
    figmaNode: "3032:30166",
    title: "Phone routines",
    section: "routines",
    Screen: sameScreen(routineScreens, "routines"),
  },
  {
    slug: "phone-approval-center",
    figmaId: "10.20",
    figmaNode: "3032:30415",
    title: "Phone approval center",
    section: "approvals",
    Screen: sameScreen(approvalScreens, "approval-center"),
  },
  {
    slug: "phone-memory-recall",
    figmaId: "10.21",
    figmaNode: "3032:30630",
    title: "Phone memory recall",
    section: "memory",
    Screen: sameScreen(memoryScreens, "memory-recall"),
  },
  {
    slug: "phone-run-detail",
    figmaId: "10.22",
    figmaNode: "3032:30828",
    title: "Phone run detail",
    section: "runs",
    Screen: sameScreen(runScreens, "run-detail"),
  },
  {
    slug: "phone-conversation-history",
    figmaId: "10.23",
    figmaNode: "3032:31071",
    title: "Phone conversation history",
    section: "conversations",
    Screen: sameScreen(conversationScreens, "conversation-history"),
  },
  {
    slug: "phone-browser-activity",
    figmaId: "10.24",
    figmaNode: "3032:31325",
    title: "Phone browser activity",
    section: "conversations",
    Screen: sameScreen(browserScreens, "browser-activity"),
  },
  {
    slug: "tablet-approval-center",
    figmaId: "10.25",
    figmaNode: "3032:31529",
    title: "Tablet approval center",
    section: "approvals",
    Screen: sameScreen(approvalScreens, "approval-center"),
  },
  {
    slug: "tablet-routines",
    figmaId: "10.26",
    figmaNode: "3032:31859",
    title: "Tablet routines",
    section: "routines",
    Screen: sameScreen(routineScreens, "routines"),
  },
  {
    slug: "tablet-workspace-files",
    figmaId: "10.27",
    figmaNode: "3032:32204",
    title: "Tablet workspace files",
    section: "files",
    Screen: sameScreen(artifactScreens, "workspace-files"),
  },
  {
    slug: "phone-artifact-sharing",
    figmaId: "10.35",
    figmaNode: "3033:32900",
    title: "Phone artifact sharing",
    section: "files",
    Screen: sameScreen(fileScreens, "artifact-sharing"),
  },
  {
    slug: "tablet-artifact-sharing",
    figmaId: "10.36",
    figmaNode: "3033:33089",
    title: "Tablet artifact sharing",
    section: "files",
    Screen: sameScreen(fileScreens, "artifact-sharing"),
  },
];
