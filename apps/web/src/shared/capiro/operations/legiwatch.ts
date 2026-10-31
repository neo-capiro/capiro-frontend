import { legiwatchFolderOperations } from "./legiwatch-folders";
import { legiwatchDeliveryOperations } from "./legiwatch-delivery";
import { legiwatchRolloutOperations } from "./legiwatch-rollout";
import { legiwatchAnalyticsOperations } from "./legiwatch-analytics";
import { legiwatchBriefingOperations } from "./legiwatch-briefings";
import { legiwatchCalendarOperations } from "./legiwatch-calendar";
import { legiwatchCommitteeOperations } from "./legiwatch-committees";
import { legiwatchEditorialOperations } from "./legiwatch-editorial";
import { legiwatchEvidenceOperations } from "./legiwatch-evidence";
import { legiwatchHearingOperations } from "./legiwatch-hearings";
import { legiwatchKeywordOperations } from "./legiwatch-keywords";
import { legiwatchMonitoringOperations } from "./legiwatch-monitoring";
import { legiwatchPublicationOperations } from "./legiwatch-publications";
import { legiwatchResearchOperations } from "./legiwatch-research";
import { legiwatchResearchWorkOperations } from "./legiwatch-research-work";
import { legiwatchSessionOperations } from "./legiwatch-sessions";
import { legiwatchWorkOperations } from "./legiwatch-work";
import { legiwatchWorkflowOperations } from "./legiwatch-workflows";
export const legiwatchOperations = {
  ...legiwatchFolderOperations,
  ...legiwatchDeliveryOperations,
  ...legiwatchRolloutOperations,
  ...legiwatchPublicationOperations,
  ...legiwatchCalendarOperations,
  ...legiwatchHearingOperations,
  ...legiwatchSessionOperations,
  ...legiwatchWorkOperations,
  ...legiwatchCommitteeOperations,
  ...legiwatchEvidenceOperations,
  ...legiwatchBriefingOperations,
  ...legiwatchResearchOperations,
  ...legiwatchResearchWorkOperations,
  ...legiwatchMonitoringOperations,
  ...legiwatchAnalyticsOperations,
  ...legiwatchEditorialOperations,
  ...legiwatchKeywordOperations,
  ...legiwatchWorkflowOperations,
} as const;
