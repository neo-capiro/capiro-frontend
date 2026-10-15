import type { MeriSection } from "../../../../shared/shell/SidebarDestinations";
import { approvalScreens } from "./approvals";
import { artifactScreens } from "./artifacts";
import { artifactPageScreens } from "./artifacts-pages";
import { browserScreens } from "./browser";
import { conversationScreens } from "./conversation";
import { darkScreens } from "./dark";
import { fileScreens } from "./files";
import { memoryScreens } from "./memory";
import { memoryProposalScreens } from "./memory-proposals";
import { responsiveScreens } from "./responsive";
import { routineScreens } from "./routines";
import { runScreens } from "./runs";
import { settingsScreens } from "./settings";
import { evidenceScreens, sourceScreens } from "./sources";
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
  ...inSection("files", artifactPageScreens),
  ...inSection("files", fileScreens),
  ...inSection("approvals", approvalScreens),
  ...inSection("routines", routineScreens),
  ...inSection("conversations", evidenceScreens),
  ...inSection("data-access", sourceScreens),
  ...inSection("memory", memoryScreens),
  ...inSection("memory", memoryProposalScreens),
  ...inSection("conversations", workflowScreens),
  ...inSection("conversations", workflowSetupScreens),
  ...inSection("conversations", workflowResponsiveScreens),
  ...inSection(undefined, stateScreens),
  ...inSection("preferences", settingsScreens),
  ...responsiveScreens,
  ...darkScreens,
];

export const findFixtureScreen = (slug: string) =>
  fixtureScreens.find((screen) => screen.slug === slug);
