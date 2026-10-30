import {
  browserViewerPng,
  type BrowserViewerEvent,
  type BrowserViewerFrame,
  type BrowserViewerResponseMap,
} from "@capiro/meri-contracts/browser-viewer";
import type { BrowserViewerTransport } from "./transport";

type ViewerOptions = {
  transport: BrowserViewerTransport;
  lifetime: AbortSignal;
  expiresAtMs: number;
  now?: () => number;
  uuid?: () => string;
  images?: { create(bytes: Uint8Array): string; revoke(url: string): void };
  resume?: (
    current: BrowserViewerResponseMap["read"],
    signal: AbortSignal,
  ) => Promise<void>;
};

type Current = BrowserViewerResponseMap["read"];
export type BrowserViewerState = Readonly<{
  status: "idle" | "loading" | "ready" | "recovery" | "expired";
  current: Current | null;
  frame: BrowserViewerFrame | null;
  imageUrl: string | null;
  displayed: boolean;
  message: string | null;
}>;
const initial: BrowserViewerState = Object.freeze({
  status: "idle",
  current: null,
  frame: null,
  imageUrl: null,
  displayed: false,
  message: null,
});

/** One operation at a time. A failed write is recovered by reading the current
 * owner, never by resending the input. Only decoded, actually displayed frames
 * enable input. The canonical conversation lifecycle owns explicit Resume. */
export class BrowserViewerController {
  #state = initial;
  #listeners = new Set<() => void>();
  #local = new AbortController();
  #busy = false;
  #selectedPage: string | null = null;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #heartbeat: ReturnType<typeof setTimeout> | undefined;
  #visible: boolean | undefined;
  #options: ViewerOptions;
  constructor(options: ViewerOptions) {
    this.#options = options;
    const expires = options.expiresAtMs - this.#now();
    if (options.lifetime.aborted || expires <= 0) this.dispose();
    else {
      options.lifetime.addEventListener("abort", this.dispose, { once: true });
      this.#timer = setTimeout(this.dispose, expires);
    }
  }
  #now = () => (this.#options.now ?? Date.now)();
  #uuid = () => (this.#options.uuid ?? crypto.randomUUID.bind(crypto))();
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
  getSnapshot = () => this.#state;
  pending = () => this.#busy || this.#options.transport.pending();
  canResume = () => !!this.#options.resume;
  setVisible = (visible: boolean) => {
    this.#visible = visible;
    clearTimeout(this.#heartbeat);
    if (!visible) {
      this.#clearFrame();
      if (this.#state.current?.state === "user" && !this.#busy)
        void this.release();
      return;
    }
    if (this.#local.signal.aborted) return;
    void this.refresh();
    const tick = () => {
      if (!this.#visible || this.#local.signal.aborted) return;
      if (
        !this.#busy &&
        ["user", "taking"].includes(this.#state.current?.state ?? "")
      )
        void this.refresh();
      this.#heartbeat = setTimeout(tick, 3000);
    };
    this.#heartbeat = setTimeout(tick, 3000);
  };
  #update(patch: Partial<BrowserViewerState>) {
    this.#state = Object.freeze({ ...this.#state, ...patch });
    this.#listeners.forEach((listener) => listener());
  }
  #clearFrame() {
    if (this.#state.imageUrl)
      (this.#options.images?.revoke ?? URL.revokeObjectURL)(
        this.#state.imageUrl,
      );
    this.#update({ frame: null, imageUrl: null, displayed: false });
  }
  #current() {
    this.#local.signal.throwIfAborted();
    if (this.#now() >= this.#options.expiresAtMs) {
      this.dispose();
      throw new Error("Session expired");
    }
  }
  async #operation(
    action: () => Promise<void>,
    writing = false,
    recoveryMessage?: string,
  ) {
    if (this.#busy || this.#local.signal.aborted) return;
    this.#busy = true;
    this.#update({ status: "loading", displayed: false, message: null });
    try {
      this.#current();
      await action();
      this.#current();
      this.#update({ status: "ready" });
    } catch {
      if (!this.#local.signal.aborted) {
        this.#clearFrame();
        this.#update({
          status: "recovery",
          message:
            recoveryMessage ??
            (writing
              ? "The operation could not be confirmed. Check the browser state before continuing. Input will not be repeated."
              : "The browser is unavailable. Check its current state to reconnect."),
        });
      }
    } finally {
      this.#busy = false;
    }
  }
  async #read() {
    const value = await this.#options.transport.request(
      "read",
      {},
      this.#local.signal,
    );
    this.#current();
    if ("error" in value) throw new Error(value.error.code);
    this.#clearFrame();
    this.#update({ current: value });
    if (value.state !== "user") {
      this.#selectedPage = null;
      return;
    }
    const page =
      value.pages.find((page) => page.pageId === this.#selectedPage) ??
      value.pages[0];
    this.#selectedPage = page?.pageId ?? null;
    if (page) await this.#capture();
  }
  #lease() {
    const current = this.#state.current;
    if (
      !current ||
      current.state !== "user" ||
      !current.ownerId ||
      !current.lease ||
      current.lease.expiresAtMs <= this.#now()
    )
      throw new Error("No current browser lease");
    return {
      ownerId: current.ownerId,
      viewerId: current.lease.viewerId,
      leaseEpoch: current.lease.leaseEpoch,
    };
  }
  async #capture() {
    if (!this.#selectedPage) throw new Error("No selected browser page");
    const value = await this.#options.transport.request(
      "frame",
      {
        ...this.#lease(),
        requestId: this.#uuid(),
        pageId: this.#selectedPage,
      },
      this.#local.signal,
    );
    this.#current();
    if ("error" in value) throw new Error(value.error.code);
    if (this.#visible === false) return;
    const bytes = browserViewerPng(value.frame);
    const imageUrl = this.#options.images
      ? this.#options.images.create(bytes)
      : URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], { type: "image/png" }),
        );
    this.#clearFrame();
    this.#update({ frame: value.frame, imageUrl });
  }
  refresh = () => this.#operation(() => this.#read());
  resume = () =>
    this.#operation(
      async () => {
        await this.#read();
        const current = this.#state.current;
        if (!current || !this.#options.resume)
          throw new Error("Resume unavailable");
        await this.#options.resume(current, this.#local.signal);
        this.dispose();
      },
      true,
      "Resume could not be confirmed. Recover the pending resume to check the same operation; Meri will not resume automatically.",
    );
  takeControl = () =>
    this.#operation(async () => {
      const ticket = await this.#options.transport.request(
        "ticket",
        { requestId: this.#uuid() },
        this.#local.signal,
      );
      this.#current();
      if ("error" in ticket || ticket.expiresAtMs <= this.#now())
        throw new Error("Ticket unavailable");
      const connected = await this.#options.transport.request(
        "connect",
        {
          requestId: this.#uuid(),
          ticket: ticket.ticket,
        },
        this.#local.signal,
      );
      this.#current();
      if ("error" in connected) throw new Error(connected.error.code);
      await this.#read();
    }, true);
  selectPage = (pageId: string) =>
    this.#operation(async () => {
      if (!this.#state.current?.pages.some((page) => page.pageId === pageId))
        throw new Error("Page unavailable");
      this.#selectedPage = pageId;
      this.#clearFrame();
      await this.#capture();
    });
  displayed = (frameId: string) => {
    if (
      !this.#local.signal.aborted &&
      this.#state.frame?.frameId === frameId &&
      this.#state.status === "ready"
    )
      this.#update({ displayed: true });
  };
  renderFailed = (frameId: string) => {
    if (this.#state.frame?.frameId !== frameId || this.#local.signal.aborted)
      return;
    this.#clearFrame();
    this.#update({
      status: "recovery",
      message:
        "The browser image could not be displayed. Refresh the view before sending input.",
    });
  };
  input = (events: readonly BrowserViewerEvent[]) => {
    const frame = this.#state.frame;
    if (!frame || !this.#state.displayed || this.#busy)
      return Promise.resolve();
    return this.#operation(async () => {
      const value = await this.#options.transport.request(
        "input",
        {
          ...this.#lease(),
          requestId: this.#uuid(),
          pageId: frame.pageId,
          frameId: frame.frameId,
          events,
        },
        this.#local.signal,
      );
      this.#current();
      if ("error" in value) throw new Error(value.error.code);
      await this.#read();
    }, true);
  };
  release = () =>
    this.#operation(async () => {
      const value = await this.#options.transport.request(
        "release",
        {
          ...this.#lease(),
          requestId: this.#uuid(),
        },
        this.#local.signal,
      );
      this.#current();
      if ("error" in value) throw new Error(value.error.code);
      this.#clearFrame();
      await this.#read();
    }, true);
  dispose = () => {
    if (this.#local.signal.aborted) return;
    this.#local.abort();
    clearTimeout(this.#timer);
    clearTimeout(this.#heartbeat);
    this.#options.lifetime.removeEventListener("abort", this.dispose);
    this.#options.transport.dispose();
    this.#clearFrame();
    this.#update({
      status: "expired",
      current: null,
      message: "Browser access has ended.",
    });
  };
}
