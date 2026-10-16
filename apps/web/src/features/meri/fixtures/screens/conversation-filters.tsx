import { conversationScreens } from "./conversation";
import { sameScreen } from "./same-screen";
import type { FixtureScreen } from "./types";

/**
 * Figma 3.4 01.04I and 01.04J: the full conversation history page with the client or
 * status filter menu open under its trigger. They render the same screen and data as
 * the 13.21 and 13.22 menu entries.
 */
export const conversationFilterScreens: readonly FixtureScreen[] = [
  {
    slug: "conversation-history-client-menu",
    figmaId: "01.04I",
    figmaNode: "3067:40614",
    title: "Client filter menu open",
    Screen: sameScreen(conversationScreens, "conversation-client-filter"),
  },
  {
    slug: "conversation-history-status-menu",
    figmaId: "01.04J",
    figmaNode: "3067:40882",
    title: "Status filter menu open",
    Screen: sameScreen(conversationScreens, "conversation-status-filter"),
  },
];
