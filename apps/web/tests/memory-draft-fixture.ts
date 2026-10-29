import type {
  MemoryDraftFile,
  MemoryDraftRead,
} from "@capiro/shared/settings-memory-drafts";
export const draftActor = "10000000-0000-4000-8000-000000000001";
export const draftTenant = "10000000-0000-4000-8000-000000000002";
export const draftCandidate = "10000000-0000-4000-8000-000000000003";
export const draftReview = "10000000-0000-4000-8000-000000000004";
export const draftAccount = {
  user: {
    id: draftActor,
    clerkUserId: "test-user",
    email: null,
    firstName: null,
    lastName: null,
    title: null,
    emailSignatureEnabled: false,
    hasEmailSignature: false,
    tourCompleted: true,
    legiwatchIntroSeen: true,
  },
  tenant: { id: draftTenant, slug: "synthetic", name: "Synthetic tenant" },
  role: "user_admin",
  billingAdmin: false,
  entitlements: {
    memoryGovernance: true,
    peWatch: false,
    defenseBudgetIntel: false,
    complianceModule: false,
    dataExport: false,
    customConnectors: false,
  },
  features: {},
};
export function draftFile(
  scope: "user" | "firm" | "client" = "firm",
): MemoryDraftFile {
  return {
    schema: "memory-settings-file/1",
    type:
      scope === "user"
        ? "user-profile"
        : scope === "firm"
          ? "firm-soul"
          : "client-soul",
    slug:
      scope === "user"
        ? "me"
        : scope === "firm"
          ? "firm"
          : "10000000-0000-4000-8000-000000000005",
    scope,
    baseItemId: "10000000-0000-4000-8000-000000000006",
    baseVersion: "a".repeat(64),
    sections: [
      {
        key: "mission",
        heading: "Mission & mandate",
        owner: "human",
        body: "Published mission",
      },
      {
        key: "positioning",
        heading: "Positioning",
        owner: "human",
        body: "Published position",
      },
      {
        key: "engine",
        heading: "Engine signal",
        owner: "engine",
        body: "Engine-managed content",
      },
    ],
    drafts: [],
    hasMoreDrafts: false,
    retention: { policyVersion: 1, draftDays: 30 },
    publicationAvailable: false,
  };
}
export function savedDraft(file: MemoryDraftFile, id: string): MemoryDraftRead {
  return {
    schema: "memory-settings-draft/1",
    id,
    type: file.type,
    slug: file.scope === "user" ? draftActor : file.slug,
    revision: 1,
    state: "draft",
    baseItemId: file.baseItemId,
    baseVersion: file.baseVersion,
    sections: [{ key: "mission", body: "Private draft text" }],
    expiresAt: "2030-01-01T00:00:00.000Z",
    updatedAt: "2026-10-29T00:00:00.000Z",
    legalHold: false,
    baseChanged: false,
  };
}
