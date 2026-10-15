import { approvalScreens } from "./approvals";
import { browserScreens } from "./browser";
import { memoryScreens } from "./memory";
import { routineScreens } from "./routines";
import { runScreens } from "./runs";
import { sourceScreens } from "./sources";
import type { FixtureScreen } from "./types";

/** Every rendered Figma 3.4 fixture screen; each area owns its own entries. */
export const fixtureScreens: readonly FixtureScreen[] = [
  ...runScreens,
  ...approvalScreens,
  ...browserScreens,
  ...routineScreens,
  ...sourceScreens,
  ...memoryScreens,
];

export const findFixtureScreen = (slug: string) =>
  fixtureScreens.find((screen) => screen.slug === slug);
