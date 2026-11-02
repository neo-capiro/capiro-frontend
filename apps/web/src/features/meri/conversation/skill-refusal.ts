import { ConversationUnavailable } from "@capiro/meri-client/conversation";

/**
 * A typed skill refusal control answers on allocate, admit or submit before any run exists
 * (contracts 0.1.47): the selected skill cannot run for this actor and scope. The request was not
 * dispatched; the person changes the selection or the conversation and sends again.
 */
export type SkillRefusal = Readonly<
  | { code: "SKILL_SOURCES_UNAVAILABLE"; sources: readonly string[] }
  | { code: "SKILL_SCOPE_REFUSED"; requiredScope: "client" | "general" }
>;

export function skillRefusal(cause: unknown): SkillRefusal | undefined {
  if (!(cause instanceof ConversationUnavailable) || !cause.definitive)
    return undefined;
  if (cause.code === "SKILL_SCOPE_REFUSED" && cause.detail.requiredScope)
    return { code: cause.code, requiredScope: cause.detail.requiredScope };
  if (
    cause.code === "SKILL_SOURCES_UNAVAILABLE" &&
    cause.detail.sources?.length
  )
    return { code: cause.code, sources: cause.detail.sources };
  return undefined;
}

/** Plain family names for the source ids the retrieval catalog declares; anything else reads as words. */
const sourceNames: Readonly<Record<string, string>> = {
  mail: "mail",
  meetings: "meetings",
  clients: "client records",
  tasks: "tasks",
  research_portfolios: "research portfolios",
  research_legal_legislation: "legislation research",
  research_legal_news: "news research",
  federal_legislation: "federal legislation",
  state_legislation: "state legislation",
  state_status_votes: "state votes",
  bill_text: "bill text",
  tracked_bills: "tracked bills",
  legislative_directory: "the legislative directory",
  legiwatch_suggestions: "LegiWatch suggestions",
  funding_opportunities: "funding opportunities",
  federal_market: "the federal market",
  sam_opportunities: "SAM opportunities",
  acquisition_personnel: "acquisition personnel",
  program_elements: "program elements",
  pe_references: "program element references",
  florida_budget: "the Florida budget",
  district_nexus: "district data",
  disclosures: "disclosures",
  business_development: "business development",
  strategies_work: "strategy work",
  application_schedules: "application schedules",
  artifact_versions: "saved files",
  stored_public_reports: "public reports",
  stored_public_data: "public data",
  stored_owner_records: "owner records",
  stored_intelligence: "saved intelligence",
  dataset_metadata: "dataset details",
  client_knowledge_search: "client knowledge",
  tenant_contacts: "contacts",
  teams_channel_reads: "Teams channels",
  connected_app_reads: "connected apps",
  public_web: "the public web",
  watch_action: "watch actions",
  rule_status: "rule status",
  capiro_commands: "Capiro commands",
};
export const sourceName = (id: string) =>
  sourceNames[id] ?? id.replace(/[_.-]+/g, " ").trim();

function list(names: readonly string[]) {
  const unique = [...new Set(names)];
  return unique.length <= 1
    ? (unique[0] ?? "")
    : `${unique.slice(0, -1).join(", ")} and ${unique.at(-1)}`;
}

/** The one sentence shown next to the composer; the raw code never appears. */
export function describeSkillRefusal(refusal: SkillRefusal) {
  if (refusal.code === "SKILL_SCOPE_REFUSED")
    return refusal.requiredScope === "client"
      ? "Pick a client first: this skill works in a client conversation."
      : "Use a General conversation: this skill does not work for one client.";
  return `This skill needs data Meri cannot reach in this conversation: ${list(
    refusal.sources.map(sourceName),
  )}. Try without the skill or in a client conversation.`;
}
