import {
  BrowserActivityScreen,
  type BrowserActivityView,
} from "../../screens/browser/BrowserActivityScreen";
import {
  BrowserSignInScreen,
  type BrowserSignInView,
} from "../../screens/browser/BrowserSignInScreen";
import {
  BrowserFilesScreen,
  type BrowserFilesView,
} from "../../screens/browser/BrowserFilesScreen";
import {
  BrowserConnectionStatesScreen,
  type BrowserConnectionState,
} from "../../screens/browser/BrowserConnectionStatesScreen";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

const activity: BrowserActivityView = {
  task: "Find the public funding update",
  snapshot: {
    url: "https://www.congress.gov/",
    site: "Congress.gov",
    heading: "Search legislation and public records",
    searchLabel: "Search public records",
    query: "defense funding",
    resultTitle: "Public record result",
    resultText:
      "A source result would appear here with its official title, publication date and document link.",
    caption: "Illustrative snapshot · Captured 10:44 AM · Public session",
  },
  activity: [
    { title: "Opened public site", detail: "Domain allowed for this run" },
    { title: "Searched records", detail: "Query: defense funding" },
    { title: "Read result", detail: "Official title and date checked" },
    {
      title: "Download available",
      detail: "Saved only after source and access checks",
    },
  ],
  filesHref: fixtureHref("browser-files"),
};

const signIn: BrowserSignInView = {
  site: "Authorized research portal",
  account: "Jordan Clayton · Permitted research account",
  access: "Read source pages and download permitted documents",
  cancelHref: fixtureHref("browser-activity"),
  statesHref: fixtureHref("browser-connection-states"),
};

const files: BrowserFilesView = {
  fileName: "funding-update.pdf",
  receipt: [
    { label: "Original URL", value: "Official source document link" },
    { label: "Domain", value: "Public source · Allowed" },
    { label: "Downloaded", value: "9 Oct 2026, 10:44 AM" },
    { label: "Workspace location", value: "Inputs / funding-update.pdf" },
    { label: "Processing", value: "12 pages extracted · Source link retained" },
  ],
  connected: {
    title: "Research account connected",
    detail: "Read pages and download permitted files. Uploads are not enabled.",
    status: "Connected",
  },
  browseHref: fixtureHref("browser-activity"),
};

const states: readonly BrowserConnectionState[] = [
  {
    title: "Site unavailable",
    detail:
      "The page could not be reached. The current task and saved files are preserved.",
    tone: "warning",
    action: "Retry navigation",
  },
  {
    title: "Domain blocked",
    detail: "This domain is outside the allowed sites for your workspace.",
    tone: "danger",
    action: "View allowed connections",
  },
  {
    title: "Sign-in expired",
    detail: "Reconnect the permitted account to continue reading this site.",
    tone: "warning",
    action: "Reconnect",
    href: fixtureHref("browser-sign-in"),
  },
  {
    title: "Connection revoked",
    detail:
      "Meri cannot continue with this connection or show previously restricted context.",
    tone: "danger",
    action: "Start clean",
  },
];

export const browserScreens: readonly FixtureScreen[] = [
  {
    slug: "browser-activity",
    figmaId: "07.01",
    figmaNode: "1064:147956",
    title: "Public browser activity",
    Screen: () => (
      <BrowserActivityScreen view={activity} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "browser-sign-in",
    figmaId: "07.02",
    figmaNode: "1064:148036",
    title: "Site connection and sign-in",
    Screen: () => (
      <BrowserSignInScreen view={signIn} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "browser-files",
    figmaId: "07.03",
    figmaNode: "1064:148104",
    title: "Browser files and receipts",
    Screen: () => (
      <BrowserFilesScreen view={files} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "browser-connection-states",
    figmaId: "07.04",
    figmaNode: "1064:148185",
    title: "Browser connection states",
    Screen: () => (
      <BrowserConnectionStatesScreen
        states={states}
        unavailable={fixtureUnavailable}
      />
    ),
  },
];
