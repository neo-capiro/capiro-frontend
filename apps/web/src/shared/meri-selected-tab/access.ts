import {
  SELECTED_TAB_SCHEMA as schema,
  SELECTED_TAB_LIMITS as limits,
  receiveSelectedTabMessage,
  sameSelectedTabBinding,
  type SelectedTabBinding,
  type SelectedTabState,
  type SelectedTabPair,
} from "@capiro/meri-contracts/selected-tab-application";
import type { MeriUploadAccess } from "../meri-uploads/access";
import type { ConversationContext } from "../meri-conversations/session";
import {
  connectSelectedTab,
  type SelectedTabConnector,
  type SelectedTabPort,
} from "./chrome-port";
import { SelectedTabUploads } from "./upload-handoff";

type Options = {
  context: ConversationContext;
  uploads: MeriUploadAccess;
  lifetime: AbortSignal;
  expiresAtMs: number;
  isCurrent: () => boolean;
  now?: () => number;
  connector?: SelectedTabConnector;
};
export type SelectedTabSnapshot = Readonly<{
  state: SelectedTabState | "connecting" | "unavailable";
  message: string | null;
}>;
/** One native conversation lifetime owns its extension connection. No credential
 * crosses the port, and no browser scope hint can authorize the existing upload. */
export class SelectedTabAccess {
  private snapshot: SelectedTabSnapshot = Object.freeze({
    state: "disconnected",
    message: null,
  });
  private listeners = new Set<() => void>();
  private port: SelectedTabPort | null = null;
  private pairing: SelectedTabPair | null = null;
  private device: string | null = null;
  private uploads: SelectedTabUploads | null = null;
  private seen = new Set<string>();
  private revision = 0;
  private disposed = false;
  private pausePending = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopUploads: () => void;
  private now: () => number;
  private binding: SelectedTabBinding;
  constructor(private options: Options) {
    this.now = options.now ?? Date.now;
    const c = options.context;
    this.binding = Object.freeze({
      tenantId: c.tenantId,
      actorId: c.actorId,
      conversationId: c.conversationId,
      clientId: c.selectedClientId,
    });
    this.stopUploads = options.uploads.subscribe(this.reportOutcomes);
    if (options.lifetime.aborted) this.dispose();
    else
      options.lifetime.addEventListener("abort", this.dispose, { once: true });
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  private publish(
    state: SelectedTabSnapshot["state"],
    message: string | null = null,
  ) {
    this.snapshot = Object.freeze({ state, message });
    for (const listener of this.listeners) listener();
  }
  private current = () =>
    !this.disposed &&
    !this.options.lifetime.aborted &&
    this.options.isCurrent() &&
    this.options.expiresAtMs > this.now();
  private active = () =>
    this.current() &&
    !!this.port &&
    !!this.pairing &&
    this.pairing.expiresAtMs > this.now() &&
    this.snapshot.state === "active";
  private send(value: unknown) {
    if (this.port) this.port.postMessage(JSON.stringify(value));
  }
  private close(
    state: SelectedTabSnapshot["state"],
    message: string | null = null,
  ) {
    this.revision++;
    clearTimeout(this.timer);
    this.timer = undefined;
    const port = this.port;
    this.port = null;
    this.pairing = null;
    this.device = null;
    this.pausePending = false;
    port?.onMessage.removeListener(this.receive);
    port?.onDisconnect.removeListener(this.disconnected);
    this.uploads?.cancelPending();
    this.uploads = null;
    this.seen.clear();
    try {
      port?.disconnect();
    } catch {
      /* Already disconnected. */
    }
    this.publish(state, message);
  }
  private disconnected = () =>
    this.close(
      "disconnected",
      "Reconnect from this chat when the extension is available. Check any pending attachment here.",
    );
  connect = async (extensionId: string, labels: SelectedTabPair["labels"]) => {
    this.close("connecting");
    const revision = this.revision;
    try {
      if (!this.current()) throw Error("Current conversation unavailable");
      const pair = await receiveSelectedTabMessage(
        "application",
        JSON.stringify({
          schema,
          type: "pair",
          pairingId: crypto.randomUUID(),
          binding: this.binding,
          labels,
          expiresAtMs: Math.min(
            this.options.expiresAtMs,
            this.now() + limits.pairingMs,
          ),
        }),
      );
      if (pair.type !== "pair" || !this.current() || revision !== this.revision)
        return;
      this.pairing = pair;
      this.port = (this.options.connector ?? connectSelectedTab)(extensionId);
      this.uploads = new SelectedTabUploads(
        this.options.uploads,
        this.reportOutcomes,
      );
      this.port.onMessage.addListener(this.receive);
      this.port.onDisconnect.addListener(this.disconnected);
      this.timer = setTimeout(
        () => this.close("expired", "Reconnect to share another tab."),
        pair.expiresAtMs - this.now(),
      );
      this.send(pair);
    } catch {
      if (revision === this.revision)
        this.close(
          "unavailable",
          "The selected-tab extension could not connect in this browser.",
        );
    }
  };
  private receive = (raw: unknown) => {
    void this.accept(raw);
  };
  private async accept(raw: unknown) {
    const revision = this.revision,
      port = this.port;
    try {
      if (typeof raw !== "string") throw Error("Invalid extension message");
      const message = await receiveSelectedTabMessage("extension", raw);
      if (!this.current()) {
        this.close("revoked", "The conversation session is no longer current.");
        return;
      }
      if (revision !== this.revision || port !== this.port || !this.pairing)
        return;
      if (
        message.pairingId !== this.pairing.pairingId ||
        (this.device && message.deviceId !== this.device)
      )
        throw Error("Extension pairing changed");
      if (message.type === "status") {
        if (!this.device && message.state !== "connected")
          throw Error("Missing pairing acknowledgement");
        this.device ??= message.deviceId;
        if (["disconnected", "revoked", "expired"].includes(message.state)) {
          this.close(message.state);
          return;
        }
        if (message.state === "active" && this.pausePending) return;
        if (message.state === "paused") {
          this.pausePending = false;
          this.revision++;
          this.uploads?.cancelPending();
        }
        this.publish(
          message.state,
          message.state === "connected"
            ? "Allow this chat in the extension popup, then capture a source tab."
            : null,
        );
        return;
      }
      if (
        !this.active() ||
        !this.device ||
        !sameSelectedTabBinding(message.binding, this.binding) ||
        message.capturedAtMs > this.now() ||
        this.now() - message.capturedAtMs >= limits.captureMs ||
        this.seen.has(message.selectionId) ||
        this.seen.size >= 8
      )
        throw Error("Stale selected-tab share");
      this.seen.add(message.selectionId);
      await this.uploads!.accept(
        message,
        () => this.active() && revision === this.revision,
      );
    } catch {
      if (revision === this.revision && port === this.port)
        this.close(
          "revoked",
          "The selection changed or could not be verified. Reconnect and capture it again; check any pending attachment first.",
        );
    }
  }
  private reportOutcomes = () => {
    if (!this.current() || !this.pairing || !this.port || !this.uploads) return;
    try {
      for (const outcome of this.uploads.outcomes())
        this.send({
          schema,
          type: "outcome",
          pairingId: this.pairing.pairingId,
          ...outcome,
        });
    } catch {
      this.disconnected();
    }
  };
  pause = () => {
    if (!this.pairing) return;
    this.revision++;
    this.pausePending = true;
    this.uploads?.cancelPending();
    this.publish(
      "paused",
      "Resume from the extension popup when you are ready.",
    );
    try {
      this.send({ schema, type: "pause", pairingId: this.pairing.pairingId });
    } catch {
      this.disconnected();
    }
  };
  revoke = () => {
    try {
      if (this.pairing)
        this.send({
          schema,
          type: "revoke",
          pairingId: this.pairing.pairingId,
        });
    } catch {
      /* Close locally too. */
    }
    this.close("revoked");
  };
  dispose = () => {
    if (this.disposed) return;
    this.disposed = true;
    this.revoke();
    this.stopUploads();
    this.options.lifetime.removeEventListener("abort", this.dispose);
    this.listeners.clear();
  };
}
