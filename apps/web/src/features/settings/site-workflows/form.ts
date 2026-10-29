import {
  SITE_WORKFLOW_SCHEMA,
  type SiteWorkflowManifest,
  type SiteWorkflowConfiguration,
} from "@capiro/shared/site-workflows";
export function newWorkflow(): SiteWorkflowManifest {
  return {
    schema: SITE_WORKFLOW_SCHEMA,
    siteId: "",
    workflowId: "",
    version: 1,
    taskSummary: "",
    origins: [],
    idpOrigins: [],
    signInUrl: "",
    signedInProbe: { kind: "selector", value: "" },
    sensitiveSelectors: [],
    tools: ["browser_navigate", "browser_snapshot"],
    approvalRequired: [],
    downloads: { formats: [], maxBytes: 26214400, maxFiles: 0 },
    sessionTtlMs: 3600000,
    logoutUrl: null,
    tosReviewRef: null,
    qualificationEvidenceRef: null,
  };
}
export const workflowKey = (row: SiteWorkflowConfiguration) =>
  row.manifest.siteId + "/" + row.manifest.workflowId;
export type WorkflowFieldsProps = {
  value: SiteWorkflowManifest;
  change: (next: SiteWorkflowManifest) => void;
  existing: boolean;
};
