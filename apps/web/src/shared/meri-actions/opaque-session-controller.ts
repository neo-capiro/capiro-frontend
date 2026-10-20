import type { ActionSessionReceipt } from "./session-receipt";
import type { ActionSessionHints } from "./session-bootstrap";
import {
  ActionSessionUnavailable,
  bootstrapActionSession,
} from "./session-bootstrap";

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
  /** Waits before re-asking after a transient issuance answer; its length bounds the extra attempts. */
  retryDelaysMs?: readonly number[];
};

/**
 * Issuance answers that can clear on their own: Meri reports an authority owner that did not answer (for example
 * Core's Clerk session read timing out under first-load load) as 401 SESSION_REFUSED, and the same-origin proxy
 * reports an unreachable Meri as 5xx. A real refusal is asked again only a bounded number of times and still
 * ends unavailable; a receipt, context or account mismatch is never retried.
 */
const transientIssuance = (error: unknown) =>
  error instanceof ActionSessionUnavailable &&
  (error.status === 401 ||
    error.status === 408 ||
    error.status === 429 ||
    error.status >= 500);
const defaultRetryDelaysMs = Object.freeze([1_000, 3_000]);

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
  /** One issuance with a bounded wait-and-retry for transient answers; the lifetime stops any wait or retry. */
  private async issue(signal: AbortSignal, current: () => boolean) {
    const delays = this.options.retryDelaysMs ?? defaultRetryDelaysMs;
    for (let attempt = 0; ; attempt++) {
      try {
        return await bootstrapActionSession(
          this.options.hints,
          signal,
          this.options.fetcher,
          this.now,
        );
      } catch (error) {
        if (attempt >= delays.length || !transientIssuance(error) || !current())
          throw error;
      }
      await new Promise<void>((resolve, reject) => {
        if (signal.aborted) return reject(signal.reason);
        const stop = () => {
          clearTimeout(timer);
          reject(signal.reason);
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", stop);
          resolve();
        }, delays[attempt]);
        signal.addEventListener("abort", stop, { once: true });
      });
      if (!current()) throw new Error("Action session lifetime ended");
    }
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
      const session = await this.issue(lifetime.signal, current);
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
