import type { FixtureScreen } from "./types";

/**
 * A responsive or theme frame is the same registered screen at another viewport
 * or colour scheme: it renders the desktop entry's Screen and fixture data unchanged.
 */
export function sameScreen(screens: readonly FixtureScreen[], slug: string) {
  const desktop = screens.find((screen) => screen.slug === slug);
  if (!desktop) throw new Error(`No registered desktop fixture ${slug}`);
  return desktop.Screen;
}
