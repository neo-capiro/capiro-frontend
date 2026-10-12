import { outreachTemplateOperations } from "./outreach-templates";
import { workspaceCommentOperations } from "./workspace-comments";
import { workspaceDocumentOperations } from "./workspace-documents";
import { workspaceExportOperations } from "./workspace-exports";
import { workspaceHillDayOperations } from "./workspace-hillday";
import { workspaceProspectOperations } from "./workspace-prospects";
export const workspaceOperations = {
  ...workspaceHillDayOperations,
  ...outreachTemplateOperations,
  ...workspaceDocumentOperations,
  ...workspaceExportOperations,
  ...workspaceCommentOperations,
  ...workspaceProspectOperations,
} as const;
