import type { ComponentType } from "react";
import type { MeriSection } from "../../../../shared/shell/SidebarDestinations";

/** One Figma 3.4 Meri frame rendered with explicit synthetic data. */
export type FixtureScreen = {
  slug: string;
  figmaId: string;
  figmaNode: string;
  title: string;
  Screen: ComponentType;
};

/** A fixture screen placed in the workspace section whose sidebar destination it belongs to. */
export type RegisteredFixtureScreen = FixtureScreen & {
  section?: MeriSection | undefined;
};
