import { test, expect } from "@playwright/test";
import {
  expectHold,
  retainedCommand,
  expectRetained,
} from "./activity-command-recovery-fixtures";

for (const unavailable of ["localStorage", "indexedDB", "locks"] as const) {
  test(`${unavailable} unavailable after response loss blocks replacement commands across reload`, async ({
    page,
  }) => {
    const saved = await retainedCommand(page);
    await page.addInitScript((target) => {
      if (target === "locks")
        Object.defineProperty(navigator, "locks", { value: undefined });
      else
        Object.defineProperty(window, target, {
          get() {
            throw new DOMException(
              "Synthetic storage refusal",
              "SecurityError",
            );
          },
        });
    }, unavailable);
    await page.reload();
    await expectHold(page);
    await page
      .getByRole("button", {
        name: "Retry saved-command recovery",
        exact: true,
      })
      .click();
    await expectHold(page);
    expect(saved.posts()).toHaveLength(1);
    expect(saved.pairs.size).toBe(1);
    expect(saved.unexpected).toEqual([]);
  });
}

for (const corruption of [
  "fence",
  "missing-fence",
  "missing-record",
  "ciphertext",
] as const) {
  test(`${corruption} corruption cannot become an empty form or a replacement key`, async ({
    page,
  }) => {
    const saved = await retainedCommand(page);
    await page.evaluate(async (kind) => {
      const key = Object.keys(localStorage).find((name) =>
        name.startsWith("capiro-command-fence-v1:"),
      )!;
      if (kind === "fence") localStorage.setItem(key, "not-json");
      else if (kind === "missing-fence") localStorage.removeItem(key);
      else
        await new Promise<void>((resolve, reject) => {
          const open = indexedDB.open("capiro-command-recovery-v1", 1);
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction("records", "readwrite");
            const store = tx.objectStore("records");
            const scope = key.slice("capiro-command-fence-v1:".length);
            if (kind === "missing-record") store.delete(scope);
            else {
              const read = store.get(scope);
              read.onsuccess = () =>
                store.put(
                  {
                    ...read.result,
                    ciphertext: new Uint8Array([1, 2, 3]).buffer,
                  },
                  scope,
                );
            }
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error);
            };
          };
        });
    }, corruption);
    await page.reload();
    await expectHold(page);
    expect(saved.posts()).toHaveLength(1);
    expect(saved.pairs.size).toBe(1);
    expect(saved.unexpected).toEqual([]);
  });
}

test("retained browser storage contains opaque ciphertext and a nonextractable key, never plaintext draft fields", async ({
  page,
}) => {
  const saved = await retainedCommand(page);
  const storage = await page.evaluate(async () => {
    const local = JSON.stringify({ ...localStorage });
    const records = await new Promise<unknown[]>((resolve, reject) => {
      const open = indexedDB.open("capiro-command-recovery-v1", 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("records", "readonly");
        const read = tx.objectStore("records").getAll();
        tx.oncomplete = () => {
          db.close();
          resolve(read.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
    return {
      local,
      records: records.map((record) => {
        const value = record as { key: CryptoKey; ciphertext: ArrayBuffer };
        return {
          keys: Object.keys(value),
          extractable: value.key.extractable,
          serialized: JSON.stringify(value),
          raw: new TextDecoder().decode(value.ciphertext),
        };
      }),
    };
  });
  expect(storage.records).toHaveLength(1);
  expect(storage.records[0]!.extractable).toBe(false);
  expect(storage.records[0]!.keys.sort()).toEqual([
    "ciphertext",
    "iv",
    "key",
    "requestId",
    "version",
  ]);
  expect(JSON.stringify(storage)).not.toContain("Private restart");
  await page.reload();
  await expectRetained(page, saved.original.requestId);
  expect(saved.posts()).toHaveLength(1);
});
