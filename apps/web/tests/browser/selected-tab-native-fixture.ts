import {
  SELECTED_TAB_SCHEMA as schema,
  createSelectedTabShare,
  receiveSelectedTabMessage,
  type SelectedTabPair,
} from "@capiro/meri-contracts/selected-tab-application";
import type { SelectedTabPort } from "../../src/shared/meri-selected-tab/chrome-port";

export const tabContext = {
  tenantId: "10000000-0000-4000-8000-000000000001",
  actorId: "20000000-0000-4000-8000-000000000001",
  conversationId: "30000000-0000-4000-8000-000000000001",
  runId: "40000000-0000-4000-8000-000000000001",
  selectedClientId: null,
};
export const tabIdentity = {
  user: {
    id: tabContext.actorId,
    clerkUserId: "synthetic-clerk-user",
    email: "fixture@example.invalid",
    firstName: "Fixture",
    lastName: "User",
    title: null,
    emailSignatureEnabled: false,
    hasEmailSignature: false,
    tourCompleted: true,
    legiwatchIntroSeen: true,
  },
  tenant: { id: tabContext.tenantId, slug: "fixture", name: "Fixture firm" },
  role: "standard_user",
  billingAdmin: false,
  features: {},
  entitlements: {
    memoryGovernance: false,
    peWatch: false,
    defenseBudgetIntel: false,
    complianceModule: false,
    dataExport: false,
    customConnectors: false,
  },
};
function event<T>() {
  const listeners = new Set<(value: T) => void>();
  return {
    addListener: (fn: (value: T) => void) => {
      listeners.add(fn);
    },
    removeListener: (fn: (value: T) => void) => {
      listeners.delete(fn);
    },
    emit: (value: T) => {
      for (const fn of listeners) fn(value);
    },
  };
}
/** Native-port test double only. This does not qualify an installed extension. */
export function installTabPortFixture() {
  let pair: SelectedTabPair | undefined;
  const deviceId = crypto.randomUUID(),
    sent: unknown[] = [];
  const onMessage = event<unknown>(),
    onDisconnect = event<void>();
  const emit = (value: unknown) => onMessage.emit(JSON.stringify(value));
  const status = (state: string) =>
    emit({
      schema,
      type: "status",
      pairingId: pair!.pairingId,
      deviceId,
      state,
    });
  const port: SelectedTabPort = {
    onMessage,
    onDisconnect,
    disconnect: () => onDisconnect.emit(),
    postMessage(raw) {
      sent.push(JSON.parse(raw));
      void receiveSelectedTabMessage("application", raw).then((message) => {
        if (message.type === "pair") {
          pair = message;
          status("connected");
        }
        if (message.type === "pause") status("paused");
        if (message.type === "revoke") status("revoked");
      });
    },
  };
  let connection: { id: string; name: string } | undefined;
  const runtime = {
    connect(id: string, options: { name: string }) {
      connection = { id, name: options.name };
      return port;
    },
  };
  Object.assign(Reflect.get(window, "chrome"), { runtime });
  return {
    sent,
    connection: () => connection,
    approve: () => status("active"),
    async share() {
      emit(
        await createSelectedTabShare({
          schema,
          type: "share",
          pairingId: pair!.pairingId,
          deviceId,
          selectionId: crypto.randomUUID(),
          binding: pair!.binding,
          tabId: 9,
          documentId: crypto.randomUUID(),
          url: "https://example.invalid/source",
          title: "Synthetic selected source",
          text: "Visible source text — café",
          capturedAtMs: Date.now(),
        }),
      );
    },
  };
}
declare global {
  interface Window {
    __tabFixture: ReturnType<typeof installTabPortFixture>;
  }
}
