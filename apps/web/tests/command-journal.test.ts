import { describe, expect, it } from "vitest";
import {
  decryptJournal,
  encryptJournal,
} from "../src/shared/session/recovery/journal-crypto";
const scope = '["synthetic-command","tenant-a","actor-a","client-a"]';
const requestId = "a1000000-0000-4000-8000-000000000008";
const input = {
  version: 1 as const,
  scope,
  requestId,
  state: "pending" as const,
  data: { privateText: "Synthetic retained body" },
};
describe("opaque recovery journal", () => {
  it("roundtrips a structured-cloned nonextractable key and exact payload", async () => {
    const encrypted = structuredClone(await encryptJournal(input));
    expect(encrypted.key.extractable).toBe(false);
    expect(await decryptJournal(scope, encrypted)).toEqual(input);
    await expect(
      crypto.subtle.exportKey("raw", encrypted.key),
    ).rejects.toThrow();
    expect(JSON.stringify(encrypted)).not.toContain(input.data.privateText);
  });
  it("rejects different context, ciphertext mutation and key/request lineage mutation", async () => {
    const encrypted = await encryptJournal(input);
    await expect(
      decryptJournal(scope + "replacement", encrypted),
    ).rejects.toThrow();
    const bytes = new Uint8Array(encrypted.ciphertext.slice(0));
    bytes[0] = bytes[0]! ^ 1;
    await expect(
      decryptJournal(scope, { ...encrypted, ciphertext: bytes.buffer }),
    ).rejects.toThrow();
    await expect(
      decryptJournal(scope, {
        ...encrypted,
        requestId: "a1000000-0000-4000-8000-000000000009",
      }),
    ).rejects.toThrow();
  });
  it("acknowledged intent contains no retained draft payload", async () => {
    const value = {
      version: 1 as const,
      scope,
      requestId,
      state: "acknowledged" as const,
    };
    expect(await decryptJournal(scope, await encryptJournal(value))).toEqual(
      value,
    );
    const invalid = { ...value, data: input.data };
    await expect(encryptJournal(invalid)).rejects.toThrow();
  });
});

describe("concurrent intent progress cannot be overwritten", () => {
  it("keeps command body, known IDs and accepted version monotonic", async () => {
    const { validateCommandRecoveryUpdate } =
      await import("../src/features/portfolio/client-profile/quick-log/command-recovery");
    const { commandInput } = await import("./activity-command-fixtures");
    const value = {
      input: commandInput,
      known: { version: 7, taskId: "task-one" },
    };
    expect(() =>
      validateCommandRecoveryUpdate(value, {
        ...value,
        known: { ...value.known, version: 8 },
      }),
    ).not.toThrow();
    expect(() =>
      validateCommandRecoveryUpdate(value, {
        ...value,
        known: { ...value.known, version: 6 },
      }),
    ).toThrow();
    expect(() =>
      validateCommandRecoveryUpdate(value, { ...value, known: { version: 7 } }),
    ).toThrow();
    expect(() =>
      validateCommandRecoveryUpdate(value, {
        ...value,
        input: {
          ...commandInput,
          activity: { ...commandInput.activity, title: "Changed original" },
        },
      }),
    ).toThrow();
  });
  it("claims upload bytes once and never persists File or signed credentials", async () => {
    const { retainedUpload, uploadRecoveryContract } =
      await import("../src/features/portfolio/files/prospect-upload-recovery");
    const { prepareProspectUpload } =
      await import("../src/features/portfolio/files/prospect-upload");
    const { actor, prospectId, requestId } =
      await import("./prospect-resources-fixtures");
    const prepared = await prepareProspectUpload(
      prospectId,
      actor,
      new File(["hello"], "test.txt", { type: "text/plain" }),
      requestId,
      () => {},
    );
    const original = retainedUpload(prepared);
    const ticket = { ...original, s3Key: "original/key" };
    const started = { ...ticket, bytesStarted: true };
    expect(() =>
      uploadRecoveryContract.validateUpdate(original, ticket),
    ).not.toThrow();
    expect(() =>
      uploadRecoveryContract.validateUpdate(ticket, started),
    ).not.toThrow();
    expect(() =>
      uploadRecoveryContract.validateUpdate(started, started),
    ).toThrow();
    expect(() =>
      uploadRecoveryContract.validateUpdate(started, ticket),
    ).toThrow();
    expect(() =>
      uploadRecoveryContract.validateUpdate(ticket, {
        ...ticket,
        s3Key: "replacement/key",
      }),
    ).toThrow();
    expect(original).not.toHaveProperty("file");
    expect(original).not.toHaveProperty("ticket");
  });
});
