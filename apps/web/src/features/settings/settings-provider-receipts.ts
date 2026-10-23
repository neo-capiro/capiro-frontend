import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";
import type { SettingsWrite } from "./security-write-types";
import { row, equal } from "./settings-receipt-values";
import { settingsDestination } from "./externalNavigation";

type Api = CapiroApi<typeof capiroOperations>;

/** Receipt identity owned by the provider Settings contract. */
export function providerReceipt(
  write: SettingsWrite,
  value: unknown,
): boolean | undefined {
  const receipt = row(value);
  const { params = {}, body = {} } = write.input;
  switch (write.operation) {
    case "settings.integrations.disconnectMicrosoft":
    case "settings.integrations.disconnectGoogle":
      return (
        equal(receipt.connectionId, params.connectionId) &&
        receipt.disconnected === true
      );
    case "settings.integrations.create":
      return (
        typeof receipt.id === "string" &&
        !!receipt.id &&
        equal(receipt.provider, body.provider) &&
        equal(
          receipt.accountEmail,
          typeof body.accountEmail === "string"
            ? body.accountEmail.trim().toLowerCase()
            : undefined,
        ) &&
        receipt.status === "needs_configuration" &&
        receipt.displayName ===
          (typeof body.displayName === "string"
            ? body.displayName.trim() || null
            : null)
      );
    case "settings.integrations.syncMicrosoft":
    case "settings.integrations.syncGoogle":
      return equal(receipt.connectionId, params.connectionId);
    case "settings.integrations.configureMicrosoftSubscriptions":
      return receipt.configured === true;
    case "settings.integrations.startMicrosoft":
    case "settings.integrations.startGoogle": {
      if (
        typeof receipt.connectionId !== "string" ||
        !receipt.connectionId ||
        (body.connectionId !== undefined &&
          receipt.connectionId !== body.connectionId) ||
        typeof receipt.authUrl !== "string"
      )
        return false;
      try {
        settingsDestination(
          receipt.authUrl,
          write.operation.endsWith("Microsoft") ? "microsoft" : "google",
        );
        return true;
      } catch {
        return false;
      }
    }
    case "settings.billing.portal":
    case "settings.billing.checkout": {
      if (typeof receipt.url !== "string") return false;
      try {
        const url = new URL(settingsDestination(receipt.url, "billing"));
        return (
          url.origin ===
          (write.operation.endsWith("portal")
            ? "https://billing.stripe.com"
            : "https://checkout.stripe.com")
        );
      } catch {
        return false;
      }
    }
    default:
      return undefined;
  }
}

/** Current authorized readback follows a delivered receipt; it never replays. */
export async function reconcileProvider(
  api: Api,
  write: SettingsWrite,
  signal: AbortSignal,
): Promise<boolean | undefined> {
  const { params = {} } = write.input;
  switch (write.operation) {
    case "settings.integrations.disconnectMicrosoft":
    case "settings.integrations.disconnectGoogle": {
      const connections = await api.request(
        "settings.integrations.list",
        {},
        { signal },
      );
      return !connections.some(
        (item) => item.id === params.connectionId && item.status !== "disabled",
      );
    }
    default:
      return undefined;
  }
}
