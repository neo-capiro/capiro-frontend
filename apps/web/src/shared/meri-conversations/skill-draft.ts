import { z } from "zod";
import {
  skillCatalog,
  type SkillCatalogEntry,
} from "@capiro/meri-contracts/skill-catalog";
import {
  receiveConversationRequest,
  type ConversationSubmitRequest,
  type ConversationSkillAssetPin,
} from "@capiro/meri-contracts/conversation-application";
import { tabRecord, type TabScope, type TabStorage } from "./tab-journal";

export type SkillWindow = NonNullable<
  ConversationSubmitRequest["windowRequest"]
>;
export type SkillDraft = Readonly<{
  schemaVersion: 1;
  skill: Readonly<ConversationSkillAssetPin>;
  windowRequest: SkillWindow | null;
}>;
const pin = z.strictObject({
  skillId: z.string(),
  skillVersion: z.string(),
  manifestSha256: z.string(),
  proseSha256: z.string(),
  catalogSha256: z.string(),
});
const draft = z.strictObject({
  schemaVersion: z.literal(1),
  skill: pin,
  windowRequest: z.unknown(),
});
const syntaxRequestId = "00000000-0000-4000-8000-000000000001";

/** Compare every immutable asset pin; never upgrade a recovered selection to latest. */
export function requireCatalogPin(value: unknown): SkillCatalogEntry {
  const candidate = pin.parse(value);
  const entry = skillCatalog.skills.find(
    (row) =>
      row.skillId === candidate.skillId &&
      row.skillVersion === candidate.skillVersion,
  );
  if (
    !entry ||
    Object.entries(candidate).some(
      ([key, value]) => entry[key as keyof typeof candidate] !== value,
    )
  )
    throw new Error(
      "The selected skill version changed or is unavailable. Choose its exact version again.",
    );
  return entry;
}

/** Canonical syntax validation only. A local draft has no execution or normalization authority. */
export function receiveSkillDraft(value: unknown): SkillDraft {
  const parsed = draft.parse(value),
    entry = requireCatalogPin(parsed.skill);
  const request = receiveConversationRequest(
    "submit",
    new TextEncoder().encode(
      JSON.stringify({
        requestId: syntaxRequestId,
        prompt: "Validate local selection",
        skill: { skillId: entry.skillId, skillVersion: entry.skillVersion },
        ...(parsed.windowRequest === null
          ? {}
          : { windowRequest: parsed.windowRequest }),
      }),
    ),
  );
  const windowRequest = request.windowRequest ?? null;
  if (
    parsed.windowRequest === undefined ||
    (windowRequest && !entry.windowBases.includes(windowRequest.basis))
  )
    throw new Error(
      "Choose a time window supported by this exact skill version.",
    );
  return Object.freeze({
    schemaVersion: 1,
    skill: Object.freeze({ ...parsed.skill }) as ConversationSkillAssetPin,
    windowRequest: windowRequest ? Object.freeze(windowRequest) : null,
  });
}

export function selectSkillDraft(entry: SkillCatalogEntry): SkillDraft {
  const { skillId, skillVersion, manifestSha256, proseSha256, catalogSha256 } =
    entry;
  return receiveSkillDraft({
    schemaVersion: 1,
    skill: {
      skillId,
      skillVersion,
      manifestSha256,
      proseSha256,
      catalogSha256,
    },
    windowRequest: null,
  });
}

/** Prepared request bytes only; callers still need the canonical admission capability. */
export function skillDraftSubmission(
  value: SkillDraft,
  input: Pick<ConversationSubmitRequest, "requestId" | "prompt">,
) {
  const selected = receiveSkillDraft(value);
  if (!selected.windowRequest)
    throw new Error("Choose a time window before preparing this skill.");
  return receiveConversationRequest(
    "submit",
    new TextEncoder().encode(
      JSON.stringify({
        ...input,
        skill: {
          skillId: selected.skill.skillId,
          skillVersion: selected.skill.skillVersion,
        },
        windowRequest: selected.windowRequest,
      }),
    ),
  );
}

/** Uses the existing bounded, identity-retired tab owner; a scope switch never moves a draft. */
export const skillDraftJournal = (scope: TabScope, storage?: TabStorage) =>
  tabRecord(scope, "draft", receiveSkillDraft, "skill-selection-v1", storage);
