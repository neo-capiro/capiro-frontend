import { legiwatchAnalyticsOperations } from "./legiwatch-analytics";
import { legiwatchBriefingOperations } from "./legiwatch-briefings";
import { legiwatchCalendarOperations } from "./legiwatch-calendar";
import { legiwatchCommitteeOperations } from "./legiwatch-committees";
import { legiwatchEditorialOperations } from "./legiwatch-editorial";
import { legiwatchEvidenceOperations } from "./legiwatch-evidence";
import { legiwatchHearingOperations } from "./legiwatch-hearings";
import { legiwatchImportOperations } from "./legiwatch-imports";
import { legiwatchKeywordOperations } from "./legiwatch-keywords";
import { legiwatchMonitoringOperations } from "./legiwatch-monitoring";
import { legiwatchPublicationOperations } from "./legiwatch-publications";
import { legiwatchReportOperations } from "./legiwatch-reports";
import { legiwatchResearchOperations } from "./legiwatch-research";
import { legiwatchResearchImportOperations } from "./legiwatch-research-imports";
import { legiwatchResearchWorkOperations } from "./legiwatch-research-work";
import { legiwatchSessionOperations } from "./legiwatch-sessions";
import { legiwatchSubscriptionOperations } from "./legiwatch-subscriptions";
import { legiwatchWorkOperations } from "./legiwatch-work";
import { legiwatchWorkflowOperations } from "./legiwatch-workflows";
export const legiwatchOperations = {
  ...legiwatchPublicationOperations,
  ...legiwatchCalendarOperations,
  ...legiwatchHearingOperations,
  ...legiwatchSessionOperations,
  ...legiwatchWorkOperations,
  ...legiwatchCommitteeOperations,
  ...legiwatchReportOperations,
  ...legiwatchEvidenceOperations,
  ...legiwatchBriefingOperations,
  ...legiwatchResearchOperations,
  ...legiwatchResearchWorkOperations,
  ...legiwatchMonitoringOperations,
  ...legiwatchSubscriptionOperations,
  ...legiwatchAnalyticsOperations,
  ...legiwatchImportOperations,
  ...legiwatchEditorialOperations,
  ...legiwatchKeywordOperations,
  ...legiwatchWorkflowOperations,
  ...legiwatchResearchImportOperations,
} as const;
