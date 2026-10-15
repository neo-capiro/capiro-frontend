import { MeriCitedAnswer } from "../../MeriCitedAnswer";
import { MeriHomeFixture } from "../MeriHomeFixture";
import { approvalScreens } from "./approvals";
import { artifactScreens } from "./artifacts";
import { conversationScreens } from "./conversation";
import { fileScreens } from "./files";
import { evidenceScreens } from "./sources";
import { sameScreen } from "./same-screen";
import type { RegisteredFixtureScreen } from "./types";

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
  {
    slug: "tablet-artifact-drawer",
    figmaId: "10.03",
    figmaNode: "1064:148841",
    title: "Tablet artifact drawer",
    section: "files",
    Screen: sameScreen(artifactScreens, "word-document"),
  },
  {
    slug: "mobile-artifact",
    figmaId: "10.06",
    figmaNode: "1064:148985",
    title: "Mobile artifact",
    section: "files",
    Screen: sameScreen(artifactScreens, "word-document"),
  },
  {
    slug: "mobile-artifact-actions",
    figmaId: "10.10",
    figmaNode: "1064:149191",
    title: "Mobile artifact actions",
    section: "files",
    Screen: sameScreen(fileScreens, "download-artifact"),
  },
  {
    slug: "mobile-artifact-revision",
    figmaId: "10.11",
    figmaNode: "1064:149225",
    title: "Mobile artifact revision",
    section: "files",
    Screen: sameScreen(artifactScreens, "revise-artifact"),
  },
  {
    slug: "mobile-versions",
    figmaId: "10.12",
    figmaNode: "1064:149254",
    title: "Mobile versions",
    section: "files",
    Screen: sameScreen(artifactScreens, "artifact-versions"),
  },
  {
    slug: "mobile-upload",
    figmaId: "10.15",
    figmaNode: "1064:149346",
    title: "Mobile upload",
    section: "files",
    Screen: sameScreen(fileScreens, "attach-files"),
  },
  {
    slug: "mobile-filing-receipt",
    figmaId: "10.17",
    figmaNode: "1064:149090",
    title: "Mobile filing receipt",
    section: "files",
    Screen: sameScreen(fileScreens, "filing-receipt"),
  },
  {
    slug: "mobile-revision-progress",
    figmaId: "10.18",
    figmaNode: "1064:149120",
    title: "Mobile revision progress",
    section: "files",
    Screen: sameScreen(fileScreens, "revision-progress"),
  },
  {
    slug: "document-working-draft-tablet",
    figmaId: "Meri · Document working draft · Tablet",
    figmaNode: "1064:150459",
    title: "Document working draft · Tablet",
    section: "files",
    Screen: sameScreen(artifactScreens, "document-working-draft"),
  },
  {
    slug: "document-working-draft-phone",
    figmaId: "Meri · Document working draft · Phone",
    figmaNode: "1064:150539",
    title: "Document working draft · Phone",
    section: "files",
    Screen: sameScreen(artifactScreens, "document-working-draft"),
  },
  {
    slug: "document-mobile-revision",
    figmaId: "Document overlay · mobileRevision",
    figmaNode: "1064:150605",
    title: "Document overlay · mobile revision",
    section: "files",
    Screen: sameScreen(artifactScreens, "document-working-draft"),
  },
  {
    slug: "mobile-task-approval",
    figmaId: "10.07",
    figmaNode: "1064:149028",
    title: "Mobile task approval",
    section: "approvals",
    Screen: sameScreen(approvalScreens, "review-task-action"),
  },
  {
    slug: "mobile-sources",
    figmaId: "10.09",
    figmaNode: "1064:149158",
    title: "Mobile sources",
    section: "data-access",
    Screen: sameScreen(evidenceScreens, "evidence-sources"),
  },
  {
    slug: "mobile-filing-review",
    figmaId: "10.13",
    figmaNode: "1064:149286",
    title: "Mobile filing review",
    section: "approvals",
    Screen: sameScreen(approvalScreens, "review-artifact-filing"),
  },
  {
    slug: "mobile-research-progress",
    figmaId: "10.16",
    figmaNode: "1064:149375",
    title: "Mobile research progress",
    section: "conversations",
    Screen: sameScreen(conversationScreens, "research-progress"),
  },
];
