import { MeriCitedAnswer } from "../../MeriCitedAnswer";
import { MeriHomeFixture } from "../MeriHomeFixture";
import { conversationScreens } from "./conversation";
import type { FixtureScreen, RegisteredFixtureScreen } from "./types";

/** The registered desktop screen a responsive frame renders unchanged. */
function sameScreen(screens: readonly FixtureScreen[], slug: string) {
  const desktop = screens.find((screen) => screen.slug === slug);
  if (!desktop) throw new Error(`No registered desktop fixture ${slug}`);
  return desktop.Screen;
}

/**
 * Figma 3.4 10 · Responsive frames and the drafting tablet/phone variants. Each entry renders
 * the same screen and fixture data as its desktop frame; the screen's own CSS adapts it.
 */
export const responsiveScreens: readonly RegisteredFixtureScreen[] = [
  {
    slug: "dark-workspace",
    figmaId: "10.01",
    figmaNode: "1064:148697",
    title: "Dark workspace",
    section: "conversations",
    Screen: MeriHomeFixture,
  },
  {
    slug: "tablet-conversation",
    figmaId: "10.02",
    figmaNode: "1064:148772",
    title: "Tablet conversation",
    section: "conversations",
    Screen: sameScreen(conversationScreens, "research-progress"),
  },
  {
    slug: "mobile-home",
    figmaId: "10.04",
    figmaNode: "1064:148902",
    title: "Mobile home",
    section: "conversations",
    Screen: MeriHomeFixture,
  },
  {
    slug: "mobile-conversation",
    figmaId: "10.05",
    figmaNode: "1064:148941",
    title: "Mobile conversation",
    section: "conversations",
    Screen: MeriCitedAnswer,
  },
  {
    slug: "mobile-navigation",
    figmaId: "10.08",
    figmaNode: "1064:149061",
    title: "Mobile navigation",
    section: "conversations",
    Screen: MeriHomeFixture,
  },
  {
    slug: "mobile-scope-picker",
    figmaId: "10.14",
    figmaNode: "1064:149316",
    title: "Mobile scope picker",
    section: "conversations",
    Screen: sameScreen(conversationScreens, "choose-scope"),
  },
];
