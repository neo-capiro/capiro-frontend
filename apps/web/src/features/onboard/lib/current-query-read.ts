import type { QueryClient } from "@tanstack/react-query";

/** Existing canonical query lifecycle for explicit reads with caller cancellation fencing. */
export function refreshCurrentQuery<T>(
  cache: QueryClient,
  key: readonly unknown[],
  request: () => Promise<T>,
) {
  // Cancellation updates query state synchronously and prevents the old promise
  // from publishing even when a transport cannot physically stop its read.
  void cache.cancelQueries({ queryKey: key, exact: true }, { silent: true });
  let dispatchedSignal: AbortSignal | undefined;
  return cache
    .fetchQuery({
      queryKey: key,
      queryFn: ({ signal }) => {
        dispatchedSignal ??= signal;
        return request();
      },
      retry: false,
      staleTime: 0,
    })
    .then((value) => {
      // TanStack silent cancellation may adopt the replacement retryer's promise.
      // Only this reader's original non-aborted dispatch may continue its caller.
      if (!dispatchedSignal || dispatchedSignal.aborted)
        throw new DOMException("This current read was replaced.", "AbortError");
      return value;
    });
}
