import type { ModuleAssetName } from "./ModuleAsset";

export type ModuleSlug =
  | "engagement"
  | "planner"
  | "calendar"
  | "workspace"
  | "strategies"
  | "directory"
  | "intelligence"
  | "research-portfolios";
export type ModuleDescriptor = {
  slug: ModuleSlug;
  label: string;
  icon: ModuleAssetName;
  cardIcon?: ModuleAssetName;
  group?: "work" | "landscape";
  description: string;
  chips: readonly { label: string; view: string }[];
  profile: string;
  tone?: "steel" | "plum" | "teal";
};
export const moduleCatalog: readonly ModuleDescriptor[] = [
  {
    slug: "engagement",
    label: "Engagement",
    icon: "engagement",
    cardIcon: "engagementCard",
    group: "work",
    description:
      "Meetings, outreach, reports and the meeting library for every client.",
    chips: [
      { label: "Meetings", view: "meetings" },
      { label: "Outreach", view: "outreach" },
      { label: "Reports", view: "reports" },
      { label: "Library", view: "library" },
    ],
    profile: "Engagement, one client",
    tone: "steel",
  },
  {
    slug: "planner",
    label: "Planner",
    icon: "planner",
    cardIcon: "plannerCard",
    group: "work",
    description: "Tasks, projects and deadlines across the firm.",
    chips: [
      { label: "List", view: "list" },
      { label: "Board", view: "board" },
      { label: "Calendar", view: "calendar" },
      { label: "Gantt", view: "gantt" },
    ],
    profile: "Planner, one client",
    tone: "teal",
  },
  {
    slug: "calendar",
    label: "Calendar",
    icon: "calendarNav",
    description: "Meetings and deadlines across your authorized workspace.",
    chips: [],
    profile: "Calendar, one client",
  },
  {
    slug: "workspace",
    label: "Workspace",
    icon: "workspace",
    cardIcon: "workspaceCard",
    group: "work",
    description: "Hill Day packets, drafts and proposal templates.",
    chips: [
      { label: "Hill Day", view: "hillday" },
      { label: "Drafts", view: "drafts" },
      { label: "Template Studio", view: "templates" },
    ],
    profile: "Workspace, one client",
    tone: "plum",
  },
  {
    slug: "strategies",
    label: "Strategies",
    icon: "strategies",
    cardIcon: "strategiesCard",
    group: "work",
    description: "Strategy and context libraries, agent review and runs.",
    chips: [
      { label: "Library", view: "library" },
      { label: "Context", view: "context" },
      { label: "Review", view: "review" },
      { label: "Runs", view: "runs" },
    ],
    profile: "Objectives and Strategies",
    tone: "plum",
  },
  {
    slug: "directory",
    label: "Directory",
    icon: "directory",
    cardIcon: "directoryCard",
    group: "landscape",
    description: "Members, staff, committees and Department of War officials.",
    chips: [
      { label: "Congress", view: "congressional-staff" },
      { label: "Committees", view: "committee-staff" },
      { label: "DoW", view: "department-of-war" },
      { label: "States", view: "state-legislators" },
    ],
    profile: "Relationships, the offices that client touches",
    tone: "teal",
  },
  {
    slug: "intelligence",
    label: "Intelligence",
    icon: "intelligence",
    cardIcon: "intelligenceCard",
    group: "landscape",
    description:
      "Legislation, budgets, funding and geography, searchable across everything the platform tracks.",
    chips: [
      { label: "Data Explorer", view: "explorer" },
      { label: "LegiWatch", view: "legiwatch" },
      { label: "Defense Budget", view: "defense" },
      { label: "Funding Opportunities", view: "funding" },
      { label: "District Nexus", view: "district-nexus" },
    ],
    profile: "Intelligence and Opportunities, matched to that client",
    tone: "steel",
  },
  {
    slug: "research-portfolios",
    label: "Research portfolios",
    icon: "research",
    cardIcon: "researchCard",
    group: "landscape",
    description: "Saved collections of companies and topics.",
    chips: [
      { label: "Snapshots", view: "snapshots" },
      { label: "Subscriptions", view: "subscriptions" },
    ],
    profile: "Firm-wide only",
    tone: "plum",
  },
];
export function moduleHref(slug: ModuleSlug, view?: string) {
  return `/modules/${slug}${view ? `?view=${encodeURIComponent(view)}` : ""}`;
}
