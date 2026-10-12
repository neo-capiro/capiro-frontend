const DATABASE = "capiro-command-recovery-v1";
const STORE = "records";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDB.open(DATABASE, 1);
    const fail = (error: unknown) => {
      settled = true;
      clearTimeout(deadline);
      reject(error);
    };
    const deadline = setTimeout(
      () => fail(new Error("Recovery storage did not open in time.")),
      10_000,
    );
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => fail(request.error);
    request.onblocked = () =>
      fail(
        new Error(
          "Recovery storage is blocked by another open application window.",
        ),
      );
    request.onsuccess = () => {
      clearTimeout(deadline);
      if (settled) request.result.close();
      else {
        settled = true;
        resolve(request.result);
      }
    };
  });
}
export async function readJournalRecord(scope: string): Promise<unknown> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(scope);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
export async function writeJournalRecord(scope: string, value: unknown) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite", {
        durability: "strict",
      });
      transaction.objectStore(STORE).put(value, scope);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
