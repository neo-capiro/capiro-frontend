import { createHash } from "node:crypto";
import { canonicalWorkspaceSnapshot } from "@capiro/shared";
import {
  draft,
  actor,
  requestId,
  otherId,
} from "./prospect-resources-fixtures";
import type {
  OrdinarySaveBody,
  OrdinarySaveResponse,
  NewsletterBody,
} from "../src/shared/capiro/operations/workspace-documents";

// Synthetic producer-shaped rows. Field selection and hashes match Core129
// ordinary-draft-save.ts; these do not claim real authorization/PG evidence.
export const scope = {
  ...actor,
  actorId: draft.ownerId,
  draftId: draft.id,
  clientId: null,
};
export const ordinary = () => ({
  ...structuredClone(draft),
  prospectId: null,
  clientId: null as string | null,
  client: null as string | null,
  clientAssociation: undefined as "held" | undefined,
  docTitle: "Synthetic ordinary draft",
  product: null as string | null,
  ask: "n/a",
  isPacket: false,
  docCount: 1,
  config: {
    clientId: null as string | null,
    sections: ["Body"],
    sectionContent: { Body: "Saved body" } as Record<string, string>,
    unknown: { preserved: true },
  },
  documents: [
    {
      ...draft.documents[0]!,
      body: { blocks: [], unknown: { preserved: true } } as {
        blocks: Array<{
          id: string;
          type: "section" | "photo" | "table" | "logo";
          title?: string;
          content?: string;
          [key: string]: unknown;
        }>;
        unknown: { preserved: boolean };
        newsletter?: NewsletterBody;
      },
    },
  ],
});
export function producerHash(value: unknown) {
  return createHash("sha256")
    .update(canonicalWorkspaceSnapshot(value))
    .digest("hex");
}
export function producerSnapshot(row: ReturnType<typeof ordinary>) {
  return {
    docTitle: row.docTitle,
    config: row.config,
    ask: row.ask,
    industry: row.industry,
    product: row.product,
    client: row.client,
    clientId: row.clientId,
    status: row.status,
    isPacket: row.isPacket,
    docCount: row.docCount,
    documents: row.documents.map(({ id, name, ordinal, body }) => ({
      id,
      name,
      ordinal,
      body,
    })),
  };
}
export function state(row = ordinary()) {
  return {
    schemaVersion: 1 as const,
    tenantId: actor.tenantId,
    draftId: draft.id,
    clientId: row.clientId,
    stateHash: producerHash(producerSnapshot(row)),
    hashFormat: "workspace-ordinary-draft-state-v1" as const,
    draft: row,
  };
}
export function receipt(
  body: OrdinarySaveBody,
  row = ordinary(),
  replayed = false,
): OrdinarySaveResponse {
  const snapshot = producerSnapshot(row);
  const atomicSave = {
    operation: "save_ordinary_draft" as const,
    tenantId: actor.tenantId,
    draftId: draft.id,
    actorId: draft.ownerId,
    requestId: body.requestId,
    requestHash: producerHash({
      operation: "save_ordinary_draft",
      tenantId: actor.tenantId,
      draftId: draft.id,
      actorId: draft.ownerId,
      input: JSON.parse(JSON.stringify(body)),
    }),
    clientId: row.clientId,
    stateHash: producerHash(snapshot),
  };
  return {
    schemaVersion: 1,
    replayed,
    receipt: {
      ...atomicSave,
      versionId: body.requestId,
      savedAt: "2026-10-25T12:00:00.000Z",
      snapshotHash: producerHash({ ...snapshot, atomicSave }),
      hashFormat: "workspace-snapshot-canonical-json-v1",
    },
  };
}
export { requestId, otherId };
