import type { ComponentType } from "react";

/** One Figma 3.4 Meri frame rendered with explicit synthetic data. */
export type FixtureScreen = {
  slug: string;
  figmaId: string;
  figmaNode: string;
  title: string;
  Screen: ComponentType;
};
