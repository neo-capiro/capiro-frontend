import { CodeFrameChannel, submitCodeLaunch } from "./code-frame";
import type { OfficeFrame } from "./editor-controller";
import type { OfficeLaunch } from "@capiro/meri-contracts/office-application";

/** The mounted frame is removed whenever its channel ends. No launch form is retained. */
export class OfficeFrameHost implements OfficeFrame {
  private frame: HTMLIFrameElement | null = null;
  private channel: CodeFrameChannel | null = null;
  constructor(
    private readonly options: {
      container: () => HTMLElement | null;
      callbacks: ConstructorParameters<typeof CodeFrameChannel>[0]["callbacks"];
    },
  ) {}
  launch(value: OfficeLaunch) {
    this.dispose();
    const container = this.options.container();
    if (!container?.isConnected)
      throw new Error("Editor container unavailable");
    const frame = container.ownerDocument.createElement("iframe");
    frame.title = "Private Office draft editor";
    frame.name = `meri-office-${crypto.randomUUID()}`;
    frame.referrerPolicy = "no-referrer";
    frame.allow = "fullscreen";
    container.append(frame);
    this.frame = frame;
    try {
      if (!frame.contentWindow) throw new Error("Editor frame unavailable");
      const channel = new CodeFrameChannel({
        origin: value.editorOrigin,
        frame: frame.contentWindow,
        events: container.ownerDocument.defaultView!,
        expiresAtMs: value.expiresAtMs,
        callbacks: this.options.callbacks,
      });
      this.channel = channel;
      frame.onload = () => {
        if (this.channel === channel) channel.handshake();
      };
      submitCodeLaunch(frame, value);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  renew(value: OfficeLaunch) {
    if (!this.channel) throw new Error("Editor frame unavailable");
    this.channel.renew(value);
  }
  save(signal: AbortSignal) {
    return (
      this.channel?.requestSave(signal) ??
      Promise.reject(new Error("Editor frame unavailable"))
    );
  }
  dispose() {
    const channel = this.channel,
      frame = this.frame;
    this.channel = null;
    this.frame = null;
    if (frame) {
      frame.onload = null;
      frame.remove();
    }
    channel?.dispose();
  }
}
