import { outreachTemplateOperations } from "./outreach-templates";
import { workspaceCommentOperations } from "./workspace-comments";
import { workspaceDocumentOperations } from "./workspace-documents";
import { workspaceExportOperations } from "./workspace-exports";
import { workspaceHillDayOperations } from "./workspace-hillday";
import { workspaceProspectOperations } from "./workspace-prospects";
import { newsletterStagingOperations } from "./workspace-newsletter-staging";
import { workspaceObjectiveOperations } from "./objective-work-destinations";
import { richNewsletterOperations } from "./rich-newsletter";
import { richNewsletterAssetOperations } from "./rich-newsletter-assets";
import { richNewsletterAssetManagementOperations } from "./rich-newsletter-asset-management";
import { richNewsletterLibraryOperations } from "./rich-newsletter-library";
import { workspaceBriefCopyOperations } from "./workspace-brief-copy";
import { workspaceClientBriefCopyOperations } from "./workspace-client-brief-copy";
import { workspaceCollaboratorOperations } from "./workspace-collaborators";
import { workspaceNotificationOperations } from "./workspace-notifications";
import { richNewsletterReviewOperations } from "./rich-newsletter-review";
export const workspaceOperations = {
  ...richNewsletterAssetOperations,
  ...richNewsletterAssetManagementOperations,
  ...richNewsletterReviewOperations,
  ...workspaceCollaboratorOperations,
  ...workspaceNotificationOperations,
  ...workspaceClientBriefCopyOperations,
  ...workspaceBriefCopyOperations,
  ...richNewsletterOperations,
  ...richNewsletterLibraryOperations,
  ...workspaceObjectiveOperations,
  ...workspaceHillDayOperations,
  ...outreachTemplateOperations,
  ...workspaceDocumentOperations,
  ...workspaceExportOperations,
  ...workspaceCommentOperations,
  ...workspaceProspectOperations,
  ...newsletterStagingOperations,
} as const;
