/** Owned browser request lifetime. StrictMode remount gets a fresh signal;
 * cleanup captures its own generation and cannot abort a later mount.
 */
export function createRequestLifetime() {
  let controller = new AbortController();
  return {
    signal: () => controller.signal,
    abort: () => controller.abort(),
    mount: () => {
      if (controller.signal.aborted) controller = new AbortController();
      const mounted = controller;
      return () => mounted.abort();
    },
  };
}
