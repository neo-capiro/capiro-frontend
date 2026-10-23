import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";
import type { SettingsWrite } from "./security-write-types";

type Row = Record<string, unknown>;
const row = (value: unknown): Row =>
  value && typeof value === "object" ? (value as Row) : {};
const same = (a: unknown, b: unknown) => a !== undefined && a === b;
const projected = (value: Row, keys: string[]) =>
  Object.fromEntries(keys.map((key) => [key, value[key]]));
async function digest(write: SettingsWrite, value: unknown) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        write.scopeHash,
        write.operation,
        write.input.params,
        write.attemptId,
        value,
      ]),
    ),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Persist only the salted comparison, never title/contact/signature text or a replayable body. */
export async function prepareOrdinaryRecovery(
  write: SettingsWrite,
  scope: string,
) {
  write.scopeHash = await digest(write, scope);
  const body = write.input.body ?? {};
  const expected =
    write.operation === "me.update"
      ? {
          id: write.subjectId,
          title:
            typeof body.title === "string"
              ? body.title.trim() || null
              : undefined,
        }
      : ["settings.contact.update", "settings.branding.update"].includes(
            write.operation,
          )
        ? body
        : write.operation === "settings.branding.logoConfirm"
          ? { logoS3Key: body.s3Key, logoContentType: body.contentType }
          : undefined;
  if (expected) {
    const keys = Object.keys(expected).sort();
    write.projection = {
      keys,
      hash: await digest(write, projected(expected, keys)),
    };
  }
}

/** Canonical transformed signature HTML comes from Core; it is never recreated in the browser. */
export async function retainCanonicalSignature(
  write: SettingsWrite,
  value: unknown,
) {
  if (write.operation !== "me.emailSignature.update") return;
  const keys = ["enabled", "html"];
  write.projection = {
    keys,
    hash: await digest(write, projected(row(value), keys)),
  };
}

export function ordinaryReceipt(
  write: SettingsWrite,
  value: unknown,
): boolean | undefined {
  const receipt = row(value),
    body = write.input.body ?? {},
    params = write.input.params ?? {};
  switch (write.operation) {
    case "me.update":
      return (
        !!write.subjectId &&
        receipt.user !== undefined &&
        same(row(receipt.user).id, write.subjectId) &&
        same(
          row(receipt.user).title,
          typeof body.title === "string"
            ? body.title.trim() || null
            : undefined,
        )
      );
    case "me.emailSignature.update":
      return (
        same(receipt.enabled, body.enabled) &&
        (typeof receipt.html === "string" || receipt.html === null)
      );
    case "settings.contact.update":
      return (
        Object.keys(body).length > 0 &&
        Object.entries(body).every(([key, value]) => same(receipt[key], value))
      );
    case "settings.branding.update":
      return same(receipt.name, body.name);
    case "settings.branding.logoConfirm":
      return (
        same(receipt.logoS3Key, body.s3Key) &&
        same(receipt.logoContentType, body.contentType)
      );
    case "settings.profiles.archive":
      return same(receipt.id, params.clientId) && receipt.status === "archived";
    case "settings.profiles.restore":
      return same(receipt.id, params.clientId) && receipt.status === "active";
    case "settings.profiles.create":
      return (
        typeof receipt.id === "string" &&
        !!receipt.id &&
        same(receipt.name, body.name) &&
        receipt.status === "active"
      );
    default:
      return undefined;
  }
}

export async function reconcileOrdinaryWrite(
  api: CapiroApi<typeof capiroOperations>,
  write: SettingsWrite,
  signal: AbortSignal,
): Promise<boolean | undefined> {
  const ordinary = [
    "me.update",
    "me.emailSignature.update",
    "settings.branding.update",
    "settings.branding.logoConfirm",
    "settings.contact.update",
    "settings.profiles.archive",
    "settings.profiles.restore",
  ].includes(write.operation);
  // Equal current state does not prove which command produced it.
  if (ordinary && !write.receiptConfirmed) return false;
  let current: Row;
  switch (write.operation) {
    case "me.update":
      current = (await api.request("me.read", {}, { signal })).user;
      break;
    case "me.emailSignature.update":
      if (!write.projection) return false; // A lost canonical sanitizer result cannot be guessed.
      current = await api.request("me.emailSignature.read", {}, { signal });
      break;
    case "settings.branding.update":
    case "settings.branding.logoConfirm":
      current = row(
        await api.request("settings.branding.read", {}, { signal }),
      );
      break;
    case "settings.contact.update":
      current = await api.request("settings.contact.read", {}, { signal });
      break;
    case "settings.profiles.archive":
    case "settings.profiles.restore": {
      const profiles = await api.request(
        "clients.list",
        { query: { includeArchived: true } },
        { signal },
      );
      const target = profiles.find(
        (profile) => profile.id === write.input.params?.clientId,
      );
      return (
        !!target &&
        target.status ===
          (write.operation.endsWith("archive") ? "archived" : "active")
      );
    }
    default:
      return undefined;
  }
  signal.throwIfAborted();
  return (
    !!write.projection &&
    (await digest(write, projected(current, write.projection.keys))) ===
      write.projection.hash
  );
}
