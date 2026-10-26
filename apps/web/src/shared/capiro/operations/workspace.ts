import { outreachTemplateOperations } from "./outreach-templates";
import { workspaceCommentOperations } from "./workspace-comments";
import { workspaceDocumentOperations } from "./workspace-documents";
import { workspaceDocumentTemplateOperations } from "./workspace-document-templates";
import { workspaceBlueprintAuthoringOperations } from "./workspace-blueprint-authoring";
import { workspaceThemeStudioOperations } from "./workspace-theme-studio";
import { workspaceExportOperations } from "./workspace-exports";
import { workspaceHillDayOperations } from "./workspace-hillday";
import { workspaceProspectOperations } from "./workspace-prospects";
import { newsletterStagingOperations } from "./workspace-newsletter-staging";
import { workspaceObjectiveOperations } from "./objective-work-destinations";
import { richNewsletterOperations } from "./rich-newsletter";
import { richNewsletterAssetOperations } from "./rich-newsletter-assets";
import { richNewsletterAssetManagementOperations } from "./rich-newsletter-asset-management";
import { richNewsletterLibraryOperations } from "./rich-newsletter-library";
import { richNewsletterBrandOperations } from "./rich-newsletter-brand";
import { richNewsletterSurveyOperations } from "./rich-newsletter-surveys";
import { workspaceBriefCopyOperations } from "./workspace-brief-copy";
import { workspaceClientBriefCopyOperations } from "./workspace-client-brief-copy";
import { workspaceCollaboratorOperations } from "./workspace-collaborators";
import { workspaceNotificationOperations } from "./workspace-notifications";
import { richNewsletterReviewOperations } from "./rich-newsletter-review";
import { richNewsletterCollaborationOperations } from "./rich-newsletter-collaboration";
export const workspaceOperations = {
  ...richNewsletterCollaborationOperations,
  ...richNewsletterBrandOperations,
  ...richNewsletterSurveyOperations,
  ...workspaceDocumentTemplateOperations,
  ...workspaceBlueprintAuthoringOperations,
  ...workspaceThemeStudioOperations,
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
