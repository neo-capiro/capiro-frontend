import { approvalScreens } from "./approvals";
import { routineScreens } from "./routines";
import { runScreens } from "./runs";
import type { FixtureScreen } from "./types";

/** Every rendered Figma 3.4 fixture screen; each area owns its own entries. */
export const fixtureScreens: readonly FixtureScreen[] = [
  ...runScreens,
  ...approvalScreens,
  ...routineScreens,
];

export const findFixtureScreen = (slug: string) =>
  fixtureScreens.find((screen) => screen.slug === slug);
