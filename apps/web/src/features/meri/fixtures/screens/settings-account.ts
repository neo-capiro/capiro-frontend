import type { HelpShortcutsView } from "../../screens/settings/HelpShortcutsScreen";
import type { NotificationsAccountView } from "../../screens/settings/NotificationsAccountScreen";
import type { PrivacyDeletionView } from "../../screens/settings/PrivacyDeletionScreen";
import { unavailablePreferences as base } from "../../screens/settings/preferences-unavailable";
import type { SettingsOutcome } from "../../screens/settings/settings-view";
import { fixtureHref } from "./href";

/** Figma 3.4 09.05: the account is the synthetic sample identity. */
export const notificationsAccount: NotificationsAccountView = {
  ...base.updates,
  account: {
    ...base.updates.account,
    fields: [
      { id: "account", label: "Account", value: "Jordan Clayton" },
      {
        id: "workspace",
        label: "Current workspace",
        value: "Capiro · Design preview",
      },
    ],
  },
};

/** Figma 3.4 09.06: retention states open the 11.06 board. */
export const privacyDeletion: PrivacyDeletionView = {
  ...base.privacy,
  retained: {
    ...base.privacy.retained,
    states: {
      label: "View retention states",
      href: fixtureHref("retention-states"),
    },
  },
};

/** Figma 3.4 09.07: the report draft starts from the designed example text. */
export const helpShortcuts: HelpShortcutsView = {
  ...base.help,
  report: {
    ...base.help.report,
    summary: {
      ...base.help.report.summary,
      value: "Something did not work as expected",
    },
    detail: {
      ...base.help.report.detail,
      value: "Tell us what you were doing and what happened.",
    },
  },
};

/** Figma 3.4 Settings outcome overlays: shown only as fixture states of their triggering pages. */
export const settingsOutcomes = {
  preferencesSaved: {
    title: "Preferences saved",
    detail: "Your personal defaults were saved.",
  },
  connectionDisconnected: {
    title: "Connection disconnected",
    detail:
      "Future retrieval stops; existing content is rechecked against current access.",
  },
  exportReady: {
    title: "Export ready",
    detail:
      "Only permitted messages are included. Retained and restricted content stays protected.",
  },
  deletionRequested: {
    title: "Deletion requested",
    detail:
      "Workspace policy is checked before removal. Some records may be retained.",
  },
  problemReportSent: {
    title: "Problem report sent",
    detail:
      "Your report was submitted. Private files were not attached automatically.",
  },
  signedOut: {
    title: "Signed out",
    detail: "Your workspace session has ended. Sign in again to continue.",
  },
} satisfies Record<string, SettingsOutcome>;
