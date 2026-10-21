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
  /**
   * Opts in to renewing before the cap: true while the port has a write or read in flight that ending the session
   * now would cut. Without it the session ends at its cap.
   */
  busy?: (port: P) => boolean;
};

/**
 * Meri never extends a session past its issued cap (it is bound to the native credential it was issued with), so the
 * session ends itself early instead: this long before the cap, once no request is in flight, for the owner's usual
 * renewal. It exceeds the 30 s budget of one request, so nothing started before it runs into the cap.
 */
export const RENEW_LEAD_MS = 45_000;
const RENEW_RECHECK_MS = 1_000;

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
type ExpirationReason = "renewal" | "expiry" | "access-lost";

/** Owns one in-memory connection and observation lifetime; never admits a run. */
export class OpaqueSessionController<P extends { dispose(): void }> {
  private snapshot: Snapshot<P> = Object.freeze({ status: "idle" });
  private listeners = new Set<() => void>();
  private active = false;
  private clientAvailable = true;
  private lifetime: AbortController | undefined;
  private expiry: ReturnType<typeof setTimeout> | undefined;
  private renewal: ReturnType<typeof setTimeout> | undefined;
  private port: P | undefined;
  private expirationReason: ExpirationReason | undefined;
  private now: () => number;
  constructor(private readonly options: Options<P>) {
    this.now = options.now ?? Date.now;
  }
  getSnapshot = () => this.snapshot;
  /** Local lifetime evidence only; a timer ending a session is not a membership refusal. */
  getExpirationReason = () => this.expirationReason;
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
    clearTimeout(this.renewal);
    this.renewal = undefined;
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
    this.expirationReason = "access-lost";
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
    this.expirationReason = undefined;
    const lifetime = new AbortController();
    this.lifetime = lifetime;
    this.publish({ status: "connecting" });
    const current = () =>
      this.active && this.lifetime === lifetime && !lifetime.signal.aborted;
    try {
      const session = await this.issue(lifetime.signal, current);
      if (!current()) return;
      const expire = (reason: ExpirationReason) => {
        if (!current()) return;
        this.expirationReason = reason;
        this.clear();
        this.publish({ status: "expired" });
      };
      const port = this.options.createPort({
        session,
        signal: lifetime.signal,
        // The port's own expiry timer can run before this owner's timer.
        onAccessLost: () =>
          expire(this.now() >= session.expiresAtMs ? "expiry" : "access-lost"),
        isCurrent: () => this.clientAvailable,
        now: this.now,
      });
      this.port = port;
      this.expiry = setTimeout(
        () => expire("expiry"),
        session.expiresAtMs - this.now(),
      );
      const busy = this.options.busy;
      const renew = () => {
        if (!current()) return;
        if (busy?.(port)) this.renewal = setTimeout(renew, RENEW_RECHECK_MS);
        else expire("renewal");
      };
      const renewIn = session.expiresAtMs - RENEW_LEAD_MS - this.now();
      if (busy && renewIn > 0) this.renewal = setTimeout(renew, renewIn);
      this.publish({
        status: "ready",
        port,
        lifetimeKey: JSON.stringify(session.context),
      });
    } catch (error) {
      if (!current()) return;
      if (
        error instanceof ActionSessionUnavailable &&
        [401, 403].includes(error.status)
      )
        this.expirationReason = "access-lost";
      this.clear();
      this.publish({ status: "unavailable" });
    }
  };
}
