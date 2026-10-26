import type {
  WorkspaceBlueprintDefinition,
  WorkspaceTheme,
  WorkspaceBrandUpload,
  WorkspaceBrandAsset,
} from "@capiro/shared/workspace-template-studio";
export const studioTenant = "20000000-0000-4000-8000-000000000001";
export const studioDefinition: WorkspaceBlueprintDefinition = {
  schemaVersion: 1,
  documentType: { id: "policy-brief", label: "Policy brief", product: "Brief" },
  intakeQuestions: [
    {
      id: "audience",
      label: "Who will read this?",
      required: false,
      answerSource: "user",
      helpText: "Name the intended audience.",
      condition: { field: "kind", operator: "equals", value: "brief" },
    },
  ],
  sections: [
    {
      id: "summary",
      title: "Executive summary",
      purpose: "Summarize the policy",
      instructions: "Use the supplied evidence.",
      required: true,
      removable: false,
      reorderable: true,
      lockedByDefault: false,
      targetWords: { min: 100, max: 250 },
      evidenceRules: ["Cite primary sources"],
    },
  ],
  evidencePolicy: {
    minimumSources: 2,
    primarySourcesPreferred: true,
    citationRequiredFor: ["Claims"],
    freshnessRules: [{ sourceType: "Legislation", currentCycleRequired: true }],
  },
  contentRules: {
    requiredTerms: ["Policy"],
    prohibitedTerms: [],
    requiredDisclaimers: ["For discussion"],
    instructions: ["Use plain language"],
  },
  defaultTheme: {
    id: "house",
    name: "House style",
    settings: { color: "navy", retainedSetting: { enabled: true } },
  },
};
export const studioTheme: WorkspaceTheme = {
  id: "70000000-0000-4000-8000-000000000001",
  tenantId: studioTenant,
  slug: "synthetic-theme",
  name: "Synthetic house theme",
  description: "Document settings",
  ownerId: "synthetic-publisher",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
  versions: [1, 2].map((version) => ({
    id: `71000000-0000-4000-8000-00000000000${version}`,
    themeId: "70000000-0000-4000-8000-000000000001",
    tenantId: studioTenant,
    version,
    status: version === 1 ? "draft" : "published",
    settings: { color: "#123456", retained: { nested: true } },
    settingsHash: String(version + 3).repeat(64),
    createdById: "synthetic-publisher",
    createdAt: "2026-10-01T12:00:00.000Z",
    publishedAt: version === 2 ? "2026-10-02T12:00:00.000Z" : null,
    retiredAt: null,
  })),
};
export const studioUpload: WorkspaceBrandUpload = {
  id: "72000000-0000-4000-8000-000000000001",
  tenantId: studioTenant,
  s3Key: `tenants/${studioTenant}/engagement/synthetic-mark.png`,
  fileName: "Synthetic mark.png",
  contentType: "image/png",
  contentLength: 240,
  downloadUrl:
    "https://assets.example.test/synthetic-mark.png?signature=synthetic",
  scanDisclosure: "Synthetic scan disclosure",
};
export const studioAsset: WorkspaceBrandAsset = {
  id: "73000000-0000-4000-8000-000000000001",
  tenantId: studioTenant,
  uploadedById: "synthetic-publisher",
  objectKey: studioUpload.s3Key,
  filename: studioUpload.fileName,
  mimeType: studioUpload.contentType,
  sizeBytes: studioUpload.contentLength,
  createdAt: "2026-10-01T12:00:00.000Z",
  available: true,
  url: studioUpload.downloadUrl,
  scanDisclosure: studioUpload.scanDisclosure,
};
