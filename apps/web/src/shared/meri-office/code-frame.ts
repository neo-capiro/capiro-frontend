import type { OfficeLaunch } from "@capiro/meri-contracts/office-application";

type Events = Pick<Window, "addEventListener" | "removeEventListener">;
type Callbacks = {
  ready(): void;
  modified(value: boolean): void;
  renew(): void;
  unavailable(reason: "closed" | "expired" | "save-unknown" | "disposed"): void;
};
type Save = {
  resolve(): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
  signal: AbortSignal;
  abort(): void;
};
const getter = (key: "origin" | "source" | "data") =>
  Object.getOwnPropertyDescriptor(MessageEvent.prototype, key)!.get!;
const originGetter = getter("origin"),
  sourceGetter = getter("source"),
  dataGetter = getter("data");

/** CODE messages are hints from this exact frame, never an authority or a Publish
 * receipt. After Save succeeds the caller must read the canonical private draft. */
export class CodeFrameChannel {
  private ready = false;
  private closed = false;
  private save: Save | null = null;
  private expiry: ReturnType<typeof setTimeout> | undefined;
  private renewal: ReturnType<typeof setTimeout> | undefined;
  private renewAt = 0;
  private renewalRequested = false;
  private readonly now: () => number;
  constructor(
    private readonly options: {
      origin: string;
      frame: Window;
      events: Events;
      expiresAtMs: number;
      callbacks: Callbacks;
      now?: () => number;
      saveTimeoutMs?: number;
    },
  ) {
    const url = new URL(options.origin);
    if (url.protocol !== "https:" || url.origin !== options.origin)
      throw new Error("Invalid editor origin");
    this.now = options.now ?? Date.now;
    options.events.addEventListener("message", this.receive);
    try {
      this.arm(options.expiresAtMs);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  private send(MessageId: string, Values: Record<string, unknown> = {}) {
    if (this.closed) throw new Error("Editor channel ended");
    this.options.frame.postMessage(
      JSON.stringify({ MessageId, SendTime: this.now(), Values }),
      this.options.origin,
    );
  }
  handshake() {
    this.send("Host_PostmessageReady");
  }
  private arm(expiresAtMs: number) {
    const remaining = expiresAtMs - this.now();
    if (
      !Number.isSafeInteger(expiresAtMs) ||
      remaining <= 0 ||
      remaining > 600_000
    )
      throw new Error("Editor token expired");
    clearTimeout(this.expiry);
    clearTimeout(this.renewal);
    this.renewalRequested = false;
    const renewIn = Math.max(1, remaining - Math.min(30_000, remaining / 2));
    this.renewAt = this.now() + renewIn;
    this.expiry = setTimeout(() => this.stop("expired"), remaining);
    this.renewal = setTimeout(() => this.requestRenewal(), renewIn);
  }
  private requestRenewal() {
    // CODE warns immediately for short tokens, including after every reset.
    // The host's signed expiry determines one renewal window per token.
    if (this.closed || this.renewalRequested || this.now() < this.renewAt)
      return;
    this.renewalRequested = true;
    this.options.callbacks.renew();
  }
  /** Both fields are mandatory. Sending does not establish that CODE accepted them. */
  renew(launch: OfficeLaunch) {
    if (
      !this.ready ||
      this.closed ||
      launch.editorOrigin !== this.options.origin ||
      launch.fields.access_token_ttl !== String(launch.expiresAtMs)
    )
      throw new Error("Editor renewal unavailable");
    if (
      !Number.isSafeInteger(launch.expiresAtMs) ||
      launch.expiresAtMs <= this.now() ||
      launch.expiresAtMs - this.now() > 600_000
    ) {
      this.stop("expired");
      throw new Error("Editor renewal expired");
    }
    this.send("Reset_Access_Token", {
      token: launch.fields.access_token,
      ttl: launch.fields.access_token_ttl,
    });
    this.arm(launch.expiresAtMs);
  }
  requestSave(signal: AbortSignal): Promise<void> {
    if (!this.ready || this.closed || this.save || signal.aborted)
      return Promise.reject(new Error("Editor Save unavailable"));
    return new Promise<void>((resolve, reject) => {
      const abort = () => this.stop("save-unknown");
      const timer = setTimeout(abort, this.options.saveTimeoutMs ?? 30_000);
      this.save = { resolve, reject, timer, signal, abort };
      signal.addEventListener("abort", abort, { once: true });
      try {
        this.send("Action_Save", {
          Notify: true,
          DontSaveIfUnmodified: false,
          DontTerminateEdit: true,
        });
      } catch {
        this.stop("save-unknown");
      }
    });
  }
  private settleSave(success: boolean) {
    const pending = this.save;
    if (!pending) return;
    this.save = null;
    clearTimeout(pending.timer);
    pending.signal.removeEventListener("abort", pending.abort);
    if (success) pending.resolve();
    else pending.reject(new Error("Editor Save outcome unavailable"));
  }
  private receive = (event: MessageEvent) => {
    if (this.closed) return;
    let data: unknown;
    try {
      if (
        originGetter.call(event) !== this.options.origin ||
        sourceGetter.call(event) !== this.options.frame
      )
        return;
      const raw = dataGetter.call(event);
      if (typeof raw !== "string" || raw.length > 65_536) return;
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    const message = data as { MessageId?: unknown; Values?: unknown },
      values = message.Values;
    const fields =
      values && typeof values === "object" && !Array.isArray(values)
        ? (values as Record<string, unknown>)
        : {};
    if (
      message.MessageId === "App_LoadingStatus" &&
      fields.Status === "Document_Loaded"
    ) {
      if (!this.ready) {
        this.ready = true;
        this.options.callbacks.ready();
      }
    } else if (
      message.MessageId === "Doc_ModifiedStatus" &&
      typeof fields.Modified === "boolean"
    )
      this.options.callbacks.modified(fields.Modified);
    else if (
      message.MessageId === "App_TokenExpiring" ||
      message.MessageId === "App_TokenExpired"
    )
      this.requestRenewal();
    else if (
      message.MessageId === "UI_Close" ||
      message.MessageId === "Session_Closed"
    )
      this.stop("closed");
    else if (message.MessageId === "Action_Save_Resp" && this.save) {
      if (fields.success === true) this.settleSave(true);
      else this.stop("save-unknown");
    }
  };
  private stop(reason: Parameters<Callbacks["unavailable"]>[0]) {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    clearTimeout(this.expiry);
    clearTimeout(this.renewal);
    this.options.events.removeEventListener("message", this.receive);
    this.settleSave(false);
    this.options.callbacks.unavailable(reason);
  }
  dispose() {
    this.stop("disposed");
  }
}

/** One transient POST form; token fields are removed immediately after submit.
 * The caller owns frame removal on expiry, access loss and channel retirement. */
export function submitCodeLaunch(
  frame: HTMLIFrameElement,
  launch: OfficeLaunch,
) {
  if (
    !frame.isConnected ||
    !frame.contentWindow ||
    new URL(launch.actionUrl).origin !== launch.editorOrigin ||
    launch.expiresAtMs <= Date.now()
  )
    throw new Error("Editor launch unavailable");
  const document = frame.ownerDocument,
    form = document.createElement("form");
  if (!frame.name) frame.name = `meri-office-${crypto.randomUUID()}`;
  frame.referrerPolicy = "no-referrer";
  form.method = "POST";
  form.action = launch.actionUrl;
  form.target = frame.name;
  form.hidden = true;
  for (const [name, value] of Object.entries(launch.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  try {
    HTMLFormElement.prototype.submit.call(form);
  } finally {
    form.replaceChildren();
    form.remove();
  }
}
