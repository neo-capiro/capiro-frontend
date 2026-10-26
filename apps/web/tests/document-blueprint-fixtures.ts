import type {
  WorkspaceBlueprintDetail,
  WorkspaceBlueprintVersionMetadata,
} from "@capiro/shared/workspace-template-studio";
import { ordinary } from "./workspace-ordinary-save-fixtures";
export const blueprintId = "60000000-0000-4000-8000-000000000001";
export const otherBlueprintId = "60000000-0000-4000-8000-000000000002";
export const versions: WorkspaceBlueprintVersionMetadata[] = [1, 2, 3].map(
  (version) => ({
    id: `61000000-0000-4000-8000-00000000000${version}`,
    blueprintId,
    tenantId: null,
    version,
    status: version === 1 ? "retired" : version === 2 ? "published" : "draft",
    definitionHash: String(version).repeat(64),
    createdById: "synthetic-publisher",
    createdAt: `2026-10-0${version}T12:00:00.000Z`,
    publishedAt: version < 3 ? `2026-10-0${version}T13:00:00.000Z` : null,
    retiredAt: version === 1 ? "2026-10-04T12:00:00.000Z" : null,
  }),
);
export const blueprint: WorkspaceBlueprintDetail = {
  id: blueprintId,
  tenantId: null,
  scope: "capiro",
  slug: "synthetic-brief",
  name: "Synthetic policy brief",
  product: "Brief",
  description: "A saved document blueprint for policy work.",
  ownerId: "synthetic-publisher",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-03T12:00:00.000Z",
  versions,
};
export const catalog = () => [
  { ...blueprint, versions: [versions[2]!], pinnedDocCount: 4 },
  {
    ...blueprint,
    id: otherBlueprintId,
    tenantId: "20000000-0000-4000-8000-000000000001",
    scope: "firm",
    name: "Synthetic letter",
    slug: "synthetic-letter",
    product: "Letters",
    versions: [],
    pinnedDocCount: 0,
  },
];
export const comparison = () => ({
  blueprintId,
  versions: versions.map(
    ({
      id: versionId,
      version,
      status,
      definitionHash,
      createdAt,
      publishedAt,
    }) => ({
      versionId,
      version,
      status,
      definitionHash,
      createdAt,
      publishedAt,
    }),
  ),
  diffs: [
    {
      fromVersionId: versions[0]!.id,
      toVersionId: versions[1]!.id,
      changedKeys: [],
    },
    {
      fromVersionId: versions[1]!.id,
      toVersionId: versions[2]!.id,
      changedKeys: ["sections", "contentRules"],
    },
  ],
});
export const publishedPin = () => ({
  blueprintId,
  versionId: versions[1]!.id,
  version: 2,
  definitionHash: versions[1]!.definitionHash,
});
export const adoptedDraft = () => {
  const row = ordinary();
  return {
    ...row,
    config: {
      ...row.config,
      sections: [],
      sectionContent: {},
      documentAgent: {
        blueprintPin: publishedPin(),
        phase: "design",
        revision: 1,
      },
    },
  };
};
