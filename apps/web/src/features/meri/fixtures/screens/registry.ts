import type { MeriSection } from "../../../../shared/shell/SidebarDestinations";
import { approvalScreens } from "./approvals";
import { artifactScreens } from "./artifacts";
import { browserScreens } from "./browser";
import { conversationScreens } from "./conversation";
import { fileScreens } from "./files";
import { memoryScreens } from "./memory";
import { responsiveScreens } from "./responsive";
import { routineScreens } from "./routines";
import { runScreens } from "./runs";
import { sourceScreens } from "./sources";
import { stateScreens } from "./states";
import { workflowScreens } from "./workflows";
import { workflowSetupScreens } from "./workflow-setups";
import { workflowResponsiveScreens } from "./workflow-responsive";
import type { FixtureScreen, RegisteredFixtureScreen } from "./types";

const inSection = (
  section: MeriSection | undefined,
  screens: readonly FixtureScreen[],
): readonly RegisteredFixtureScreen[] =>
  screens.map((screen) => ({ ...screen, section }));

/** Every rendered Figma 3.4 fixture screen; each area owns its entries, the registry owns their section. */
export const fixtureScreens: readonly RegisteredFixtureScreen[] = [
  ...inSection("conversations", conversationScreens),
  ...inSection("conversations", browserScreens),
  ...inSection("runs", runScreens),
  ...inSection("files", artifactScreens),
  ...inSection("files", fileScreens),
  ...inSection("approvals", approvalScreens),
  ...inSection("routines", routineScreens),
  ...inSection("data-access", sourceScreens),
  ...inSection("memory", memoryScreens),
  ...inSection("conversations", workflowScreens),
  ...inSection("conversations", workflowSetupScreens),
  ...inSection("conversations", workflowResponsiveScreens),
  ...inSection(undefined, stateScreens),
  ...responsiveScreens,
];

export const findFixtureScreen = (slug: string) =>
  fixtureScreens.find((screen) => screen.slug === slug);
