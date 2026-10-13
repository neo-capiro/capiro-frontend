import { outreachTemplateOperations } from "./outreach-templates";
import { workspaceCommentOperations } from "./workspace-comments";
import { workspaceDocumentOperations } from "./workspace-documents";
import { workspaceExportOperations } from "./workspace-exports";
import { workspaceHillDayOperations } from "./workspace-hillday";
import { workspaceProspectOperations } from "./workspace-prospects";
import { newsletterStagingOperations } from "./workspace-newsletter-staging";
import { workspaceObjectiveOperations } from "./objective-work-destinations";
import { richNewsletterOperations } from "./rich-newsletter";
import { workspaceBriefCopyOperations } from "./workspace-brief-copy";
export const workspaceOperations = {
  ...workspaceBriefCopyOperations,
  ...richNewsletterOperations,
  ...workspaceObjectiveOperations,
  ...workspaceHillDayOperations,
  ...outreachTemplateOperations,
  ...workspaceDocumentOperations,
  ...workspaceExportOperations,
  ...workspaceCommentOperations,
  ...workspaceProspectOperations,
  ...newsletterStagingOperations,
} as const;
