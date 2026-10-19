import { ApiError } from "@/shared/portfolio/api/http";
import type { MatterDetail } from "./contracts";
import { legacyStatuses, lifecycleStatuses } from "./history-model";

export type MatterDraft = {
  title: string;
  summary: string;
  status: string;
  confirmOutcome: boolean;
};
export type MatterUpdate = {
  title: string;
  summary: string;
  status: string;
  confirmOutcome?: boolean;
};
const finalStatuses = new Set([
  "successful",
  "partially_successful",
  "unsuccessful",
]);
export function needsOutcomeConfirmation(matter: MatterDetail, status: string) {
  return (
    status !== matter.status &&
    finalStatuses.has(status) &&
    !matter.links.some((link) => link.linkType === "outcome_event")
  );
}
export function matterEditOptions(currentStatus: string) {
  const options: { value: string; label: string }[] = lifecycleStatuses.map(
    (value) => ({ value, label: value.replaceAll("_", " ") }),
  );
  if (legacyStatuses.some((status) => status === currentStatus))
    options.unshift({
      value: currentStatus,
      label: `${currentStatus} (legacy)`,
    });
  return options;
}
export function draftForMatter(matter: MatterDetail): MatterDraft {
  return {
    title: matter.title,
    summary: matter.summary ?? "",
    status: matter.status,
    confirmOutcome: false,
  };
}
export function prepareMatterUpdate(
  matter: MatterDetail,
  draft: MatterDraft,
): MatterUpdate {
  const title = draft.title.trim();
  const summary = draft.summary.trim();
  if (!title || title.length > 300 || summary.length > 4000)
    throw new ApiError(
      400,
      "Enter a title of at most 300 characters and a summary of at most 4,000 characters.",
    );
  if (
    !matterEditOptions(matter.status).some(
      (option) => option.value === draft.status,
    )
  )
    throw new ApiError(400, "Choose a supported matter status.");
  const confirmationRequired = needsOutcomeConfirmation(matter, draft.status);
  if (confirmationRequired && !draft.confirmOutcome)
    throw new ApiError(
      400,
      "Confirm your outcome judgment before saving this final status.",
    );
  return {
    title,
    summary,
    status: draft.status,
    ...(confirmationRequired ? { confirmOutcome: true } : {}),
  };
}
/** Local review identity; this is never sent as a native version or CAS token. */
export function matterEditRevision(matter: MatterDetail) {
  return JSON.stringify({
    id: matter.id,
    title: matter.title,
    summary: matter.summary,
    status: matter.status,
    updatedAt: matter.updatedAt,
    links: matter.links
      .map((link) => [link.id, link.linkType, link.linkKey] as const)
      .sort((a, b) => a[0].localeCompare(b[0])),
  });
}
export function matterUpdateReflected(
  matter: MatterDetail,
  id: string,
  input: MatterUpdate,
) {
  return (
    matter.id === id &&
    matter.title === input.title &&
    matter.summary === input.summary &&
    matter.status === input.status
  );
}
