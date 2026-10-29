export interface SelectedTabPort {
  postMessage(message: string): void;
  disconnect(): void;
  onMessage: {
    addListener(listener: (message: unknown) => void): void;
    removeListener(listener: (message: unknown) => void): void;
  };
  onDisconnect: {
    addListener(listener: () => void): void;
    removeListener(listener: () => void): void;
  };
}
export type SelectedTabConnector = (extensionId: string) => SelectedTabPort;
export const validSelectedTabExtension = (value: unknown): value is string =>
  typeof value === "string" && /^[a-p]{32}$/.test(value);

/** Chrome establishes the peer extension identity; no window message bridge or
 * caller-supplied URL can replace this native connection. */
export const connectSelectedTab: SelectedTabConnector = (extensionId) => {
  if (
    !validSelectedTabExtension(extensionId) ||
    typeof window === "undefined" ||
    window.top !== window.self
  )
    throw Error("Selected-tab sharing is unavailable in this browser");
  const browser = window as Window & {
    chrome?: {
      runtime?: {
        connect(id: string, options: { name: string }): SelectedTabPort;
        lastError?: unknown;
      };
    };
  };
  const runtime = browser.chrome?.runtime;
  if (!runtime || typeof runtime.connect !== "function")
    throw Error("Selected-tab extension is unavailable");
  const port = runtime.connect(extensionId, { name: "meri.selected-tab/1" });
  // Reading lastError consumes Chrome's disconnected/missing-extension notice.
  port.onDisconnect.addListener(() => {
    void runtime.lastError;
  });
  return port;
};
