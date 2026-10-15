import { MeriHomeFixture } from "../MeriHomeFixture";
import type { RegisteredFixtureScreen } from "./types";

/**
 * Figma 3.4 10 · Responsive frames and the drafting tablet/phone variants. Each entry renders
 * the same screen and fixture data as its desktop frame; the screen's own CSS adapts it.
 */
export const responsiveScreens: readonly RegisteredFixtureScreen[] = [
  {
    slug: "mobile-navigation",
    figmaId: "10.08",
    figmaNode: "1064:149061",
    title: "Mobile navigation",
    section: "conversations",
    Screen: MeriHomeFixture,
  },
];
