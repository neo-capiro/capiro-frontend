"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCapiro } from "./CapiroBoundary";
import type { OperationRequest, OperationResponse } from "./contracts";
import { CapiroApiError } from "./http";
import type { CapiroUploadFile } from "./multipart";
import { capiroOperations } from "./registry";

type OperationKey = keyof typeof capiroOperations & string;
type QueryState<Data> = { data?: Data; error?: Error; loading: boolean };

/** Aborts replaced reads and never admits results from a superseded input/scope. */
export function useCapiroQuery<Key extends OperationKey>(
  key: Key,
  input: OperationRequest<(typeof capiroOperations)[Key]>,
  options: { enabled?: boolean } = {},
) {
  const api = useCapiro();
  const enabled = options.enabled ?? true;
  const serializedInput = JSON.stringify(input);
  const [revision, setRevision] = useState(0);
  const requestId = `${key}:${serializedInput}:${revision}`;
  const [state, setState] = useState<
    QueryState<OperationResponse<(typeof capiroOperations)[Key]>> & {
      requestId?: string;
    }
  >({ loading: enabled });
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const [previousRequest, setPreviousRequest] = useState({ api, requestId, enabled });
  if (previousRequest.api !== api || previousRequest.requestId !== requestId || previousRequest.enabled !== enabled) {
    setPreviousRequest({ api, requestId, enabled });
    setState({ loading: enabled, requestId });
  }
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const requestInput = JSON.parse(serializedInput) as OperationRequest<
      (typeof capiroOperations)[Key]
    >;
    api.request(key, requestInput, { signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted)
          setState({ data, loading: false, requestId });
      },
      (error) => {
        if (!controller.signal.aborted)
          setState({
            error:
              error instanceof Error ? error : new Error("The request failed."),
            loading: false,
            requestId,
          });
      },
    );
    return () => controller.abort();
  }, [api, key, serializedInput, enabled, revision, requestId]);
  const visible: QueryState<OperationResponse<(typeof capiroOperations)[Key]>> =
    enabled && state.requestId === requestId ? state : { loading: enabled };
  return {
    data: visible.data,
    error: visible.error,
    loading: visible.loading,
    reload,
  };
}

/** One user action at a time; writes are never automatically retried or replayed. */
export function useCapiroMutation<Key extends OperationKey>(key: Key) {
  const api = useCapiro();
  type Data = OperationResponse<(typeof capiroOperations)[Key]>;
  type Input = OperationRequest<(typeof capiroOperations)[Key]>;
  const active = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const [state, setState] = useState<{
    pending: boolean;
    error?: Error;
    data?: Data;
  }>({ pending: false });
  useEffect(
    () => () => {
      generation.current += 1;
      active.current?.abort();
      active.current = null;
    },
    [api, key],
  );
  const run = useCallback(
    async (
      input: Input,
      files?: readonly CapiroUploadFile[],
    ): Promise<Data> => {
      if (active.current)
        throw new CapiroApiError(409, "This action is already in progress.");
      const controller = new AbortController();
      const current = generation.current;
      active.current = controller;
      setState({ pending: true });
      try {
        const data = files
          ? await api.upload(key, input, files, { signal: controller.signal })
          : await api.request(key, input, { signal: controller.signal });
        if (controller.signal.aborted || current !== generation.current)
          throw new DOMException(
            "The view changed. Reload to confirm the result.",
            "AbortError",
          );
        setState({ data, pending: false });
        return data;
      } catch (caught) {
        const error =
          caught instanceof Error
            ? caught
            : new Error("The action could not be completed.");
        if (!controller.signal.aborted && current === generation.current)
          setState({ error, pending: false });
        throw error;
      } finally {
        if (active.current === controller) active.current = null;
      }
    },
    [api, key],
  );
  const reset = useCallback(() => {
    if (!active.current) setState({ pending: false });
  }, []);
  return { ...state, run, reset };
}
