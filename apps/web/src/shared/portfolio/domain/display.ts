const sources: Readonly<Record<string, string>> = {
  manual: "Uploaded file",
  federal_assistance_award: "Federal assistance award",
  sam_opportunity: "SAM.gov opportunity",
  intel_memo: "Intelligence memo",
  legiwatch_hearing_brief: "Hearing brief",
  contract_award: "Contract award",
  usaspending: "USAspending",
  sam: "SAM.gov",
};
export function portfolioSourceLabel(value: string) {
  if (value.startsWith("capability:")) return "Capability document";
  return (
    sources[value] ??
    value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())
  );
}
export function portfolioTimestamp(value: string | null | undefined) {
  if (!value) return "Not yet";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Time unavailable";
}
export function identityBasisLabel(value: string) {
  const labels: Readonly<Record<string, string>> = {
    exact_uei: "Exact Unique Entity ID match",
    exact_name: "Exact organization name match",
    name_match: "Organization name match",
    exact_domain: "Exact website domain match",
  };
  return labels[value] ?? portfolioSourceLabel(value);
}
