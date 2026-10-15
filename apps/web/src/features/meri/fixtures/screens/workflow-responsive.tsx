import type { ComponentType } from "react";
import { workflowSetupScreens } from "./workflow-setups";
import { workflowScreens } from "./workflows";
import type { FixtureScreen } from "./types";

const desktopScreens = [...workflowScreens, ...workflowSetupScreens];

/**
 * The responsive frames are the same registered screens at another viewport
 * or colour scheme: each entry renders the desktop entry's Screen unchanged.
 */
const same = (slug: string): ComponentType => {
  const screen = desktopScreens.find((entry) => entry.slug === slug);
  if (!screen) throw new Error(`No workflow fixture screen ${slug}`);
  return screen.Screen;
};

/** Figma 3.4 02 · Responsive & theme references and 05 · Phone workflow setups. */
export const workflowResponsiveScreens: readonly FixtureScreen[] = [
  {
    slug: "workflow-library-phone",
    figmaId: "Meri · Workflow library · Phone",
    figmaNode: "1064:152692",
    title: "Workflow library · Phone",
    Screen: same("workflow-library"),
  },
  {
    slug: "commitments-deliverables-phone",
    figmaId: "Meri · Commitments & Deliverables · Phone",
    figmaNode: "1064:152717",
    title: "Commitments & Deliverables · Phone",
    Screen: same("commitments-deliverables"),
  },
  {
    slug: "sources-coverage-phone",
    figmaId: "Meri · Sources & coverage · Phone",
    figmaNode: "1064:152737",
    title: "Sources & coverage · Phone",
    Screen: same("sources-coverage"),
  },
  {
    slug: "workflow-request-phone",
    figmaId: "Meri · Review workflow request · Phone",
    figmaNode: "1064:152758",
    title: "Review workflow request · Phone",
    Screen: same("workflow-request"),
  },
  {
    slug: "workflow-library-tablet",
    figmaId: "Meri · Workflow library · Tablet",
    figmaNode: "1064:152783",
    title: "Workflow library · Tablet",
    Screen: same("workflow-library"),
  },
  {
    slug: "workflow-library-dark",
    figmaId: "Meri · Workflow library · Dark",
    figmaNode: "1064:152868",
    title: "Workflow library · Dark",
    Screen: same("workflow-library"),
  },
  {
    slug: "phone-setup-research-company",
    figmaId: "Phone setup · Research a Company",
    figmaNode: "1064:153319",
    title: "Phone setup · Research a Company",
    Screen: same("setup-research-company"),
  },
  {
    slug: "phone-setup-relationship-brief",
    figmaId: "Phone setup · Relationship Brief",
    figmaNode: "1064:153321",
    title: "Phone setup · Relationship Brief",
    Screen: same("setup-relationship-brief"),
  },
  {
    slug: "phone-setup-client-changes",
    figmaId: "Phone setup · Client Changes",
    figmaNode: "1064:153323",
    title: "Phone setup · Client Changes",
    Screen: same("setup-client-changes"),
  },
  {
    slug: "phone-setup-portfolio-changes",
    figmaId: "Phone setup · Portfolio Changes",
    figmaNode: "1064:153325",
    title: "Phone setup · Portfolio Changes",
    Screen: same("setup-portfolio-changes"),
  },
  {
    slug: "phone-setup-portfolio-overlap",
    figmaId: "Phone setup · Portfolio Overlap",
    figmaNode: "1064:153327",
    title: "Phone setup · Portfolio Overlap",
    Screen: same("setup-portfolio-overlap"),
  },
  {
    slug: "phone-setup-mail-history",
    figmaId: "Phone setup · Mail History",
    figmaNode: "1064:153329",
    title: "Phone setup · Mail History",
    Screen: same("setup-mail-history"),
  },
  {
    slug: "phone-setup-meeting-prep",
    figmaId: "Phone setup · Meeting Prep Brief",
    figmaNode: "1064:153331",
    title: "Phone setup · Meeting Prep Brief",
    Screen: same("setup-meeting-prep"),
  },
  {
    slug: "phone-setup-commitments-audit",
    figmaId: "Phone setup · Commitments & Deliverables",
    figmaNode: "1064:153333",
    title: "Phone setup · Commitments & Deliverables",
    Screen: same("setup-commitments-audit"),
  },
  {
    slug: "phone-setup-funding-opportunity-match",
    figmaId: "Phone setup · Funding Opportunity Match",
    figmaNode: "1064:153335",
    title: "Phone setup · Funding Opportunity Match",
    Screen: same("setup-funding-opportunity-match"),
  },
  {
    slug: "phone-setup-pe-deep-dive",
    figmaId: "Phone setup · PE Deep Dive",
    figmaNode: "1064:153337",
    title: "Phone setup · PE Deep Dive",
    Screen: same("setup-pe-deep-dive"),
  },
  {
    slug: "phone-setup-bill-watch",
    figmaId: "Phone setup · Bill Watch",
    figmaNode: "1064:153339",
    title: "Phone setup · Bill Watch",
    Screen: same("setup-bill-watch"),
  },
  {
    slug: "phone-setup-hearing-watch",
    figmaId: "Phone setup · Hearing Watch",
    figmaNode: "1064:153341",
    title: "Phone setup · Hearing Watch",
    Screen: same("setup-hearing-watch"),
  },
  {
    slug: "phone-setup-representation-lookup",
    figmaId: "Phone setup · Representation Lookup",
    figmaNode: "1064:153343",
    title: "Phone setup · Representation Lookup",
    Screen: same("setup-representation-lookup"),
  },
  {
    slug: "phone-setup-regulatory-docket-brief",
    figmaId: "Phone setup · Regulatory Docket Brief",
    figmaNode: "1064:153345",
    title: "Phone setup · Regulatory Docket Brief",
    Screen: same("setup-regulatory-docket-brief"),
  },
];
