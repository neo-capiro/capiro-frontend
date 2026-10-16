import * as account from "./unavailable-account";
import * as workspace from "./unavailable-workspace";

/** The seven Settings pages, in Figma navigation order. */
export const preferencePages = [
  { id: "personal", label: "Personal defaults" },
  { id: "connections", label: "Connections" },
  { id: "usage", label: "Usage and limits" },
  { id: "skills", label: "Skills and templates" },
  { id: "updates", label: "Workspace updates" },
  { id: "privacy", label: "Privacy and retention" },
  { id: "help", label: "Help and shortcuts" },
] as const;
export type PreferencePageId = (typeof preferencePages)[number]["id"];

/**
 * Canonical Figma 3.4 09.01–09.07 copy with no account data: what every host shows while Meri
 * settings are disconnected. Fixture views extend these with explicitly synthetic records.
 */
export const unavailablePreferences = { ...workspace, ...account };
