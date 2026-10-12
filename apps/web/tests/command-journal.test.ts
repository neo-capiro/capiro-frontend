import { describe, expect, it } from "vitest";
import {
  decryptJournal,
  encryptJournal,
} from "../src/shared/portfolio/recovery/journal-crypto";
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
