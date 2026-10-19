import type { ActionSessionReceipt } from "./session-receipt";
import type { ActionSessionHints } from "./session-bootstrap";
import { bootstrapActionSession } from "./session-bootstrap";

type Snapshot<P> = Readonly<
  | { status: "idle" | "connecting" | "unavailable" | "expired" }
  | { status: "ready"; port: P; lifetimeKey: string }
>;
type Options<P> = {
  hints: ActionSessionHints;
  createPort: (lifetime: {
    session: ActionSessionReceipt;
    signal: AbortSignal;
    onAccessLost: () => void;
    isCurrent: () => boolean;
    now: () => number;
  }) => P;
  fetcher?: typeof fetch;
  now?: () => number;
};

/** Owns one in-memory connection and observation lifetime; never admits a run. */
export class OpaqueSessionController<P extends { dispose(): void }> {
  private snapshot: Snapshot<P> = Object.freeze({ status: "idle" });
  private listeners = new Set<() => void>();
  private active = false;
  private clientAvailable = true;
  private lifetime: AbortController | undefined;
  private expiry: ReturnType<typeof setTimeout> | undefined;
  private port: P | undefined;
  private now: () => number;
  constructor(private readonly options: Options<P>) {
    this.now = options.now ?? Date.now;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(snapshot: Snapshot<P>) {
    this.snapshot = Object.freeze(snapshot);
    for (const listener of this.listeners) listener();
  }
  private clear() {
    this.lifetime?.abort();
    this.lifetime = undefined;
    clearTimeout(this.expiry);
    this.expiry = undefined;
    this.port?.dispose();
    this.port = undefined;
  }
  attach = () => {
    this.active = true;
    return () => {
      this.active = false;
      this.clear();
      this.publish({ status: "idle" });
    };
  };
  setClientAvailable(available: boolean) {
    this.clientAvailable = available;
  }
  revoke() {
    this.clear();
    this.publish({ status: "expired" });
  }
  connect = async () => {
    if (
      !this.active ||
      !this.clientAvailable ||
      this.snapshot.status === "connecting" ||
      this.snapshot.status === "ready"
    )
      return;
    this.clear();
    const lifetime = new AbortController();
    this.lifetime = lifetime;
    this.publish({ status: "connecting" });
    const current = () =>
      this.active && this.lifetime === lifetime && !lifetime.signal.aborted;
    try {
      const session = await bootstrapActionSession(
        this.options.hints,
        lifetime.signal,
        this.options.fetcher,
        this.now,
      );
      if (!current()) return;
      const expire = () => {
        if (!current()) return;
        this.clear();
        this.publish({ status: "expired" });
      };
      const port = this.options.createPort({
        session,
        signal: lifetime.signal,
        onAccessLost: expire,
        isCurrent: () => this.clientAvailable,
        now: this.now,
      });
      this.port = port;
      this.expiry = setTimeout(expire, session.expiresAtMs - this.now());
      this.publish({
        status: "ready",
        port,
        lifetimeKey: JSON.stringify(session.context),
      });
    } catch {
      if (!current()) return;
      this.clear();
      this.publish({ status: "unavailable" });
    }
  };
}
