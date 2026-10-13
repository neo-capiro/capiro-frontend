import { expect, it } from "vitest";
import {
  decryptJournal,
  encryptJournal,
} from "../src/shared/session/recovery/journal-crypto";

it("retains a distinct known-no-write terminal fence without a draft or success claim", async () => {
  const refusal = {
    version: 1 as const,
    scope: "synthetic-workspace-copy",
    requestId: "a1000000-0000-4000-8000-000000000008",
    state: "refused" as const,
    code: "WORKSPACE_BRIEF_STATE_CONFLICT" as const,
  };
  const encrypted = await encryptJournal(refusal);
  expect(await decryptJournal(refusal.scope, encrypted)).toEqual(refusal);
  expect(JSON.stringify(encrypted)).not.toContain(refusal.code);
  const invalidPayload = { ...refusal, data: { privateText: "draft" } };
  await expect(encryptJournal(invalidPayload)).rejects.toThrow();
  await expect(
    encryptJournal({
      ...refusal,
      code: "WORKSPACE_BRIEF_REQUEST_CONFLICT",
    } as never),
  ).rejects.toThrow();
});
