"use client";
import { useState } from "react";
import type { Attachment } from "./contracts";

type Arrival = {
  clientId: string;
  requestedId?: string;
  readerScope?: string;
  status: "waiting" | "open" | "unavailable" | "consumed";
};
const newArrival = (clientId: string, requestedId?: string): Arrival => ({
  clientId,
  requestedId,
  status: requestedId ? "waiting" : "consumed",
});

/** One URL arrival selects from the canonical current list; it owns no read or file action. */
export function useLinkedFileArrival(
  clientId: string,
  requestedId: string | undefined,
  query: {
    readerScope: string;
    isEnabled: boolean;
    isSuccess: boolean;
    isFetching: boolean;
    error: Error | null;
    data?: Attachment[];
  },
) {
  const [arrival, setArrival] = useState(() =>
    newArrival(clientId, requestedId),
  );
  let next =
    arrival.requestedId === requestedId
      ? arrival
      : newArrival(clientId, requestedId);
  const file =
    query.isSuccess && !query.error
      ? query.data?.find((item) => item.id === requestedId)
      : undefined;
  if (next.status !== "consumed") {
    if (
      next.clientId !== clientId ||
      query.error ||
      (next.readerScope && next.readerScope !== query.readerScope)
    ) {
      next = { ...next, status: "consumed" };
    } else if (query.isEnabled && next.status !== "unavailable") {
      next = {
        ...next,
        readerScope: query.readerScope,
        status:
          query.isSuccess && !query.isFetching
            ? file
              ? "open"
              : "unavailable"
            : next.status,
      };
    }
  }
  // Adjust only this component's captured intent before rendering its children.
  // A routine file refetch is not a new URL arrival or reader identity.
  if (
    next.clientId !== arrival.clientId ||
    next.requestedId !== arrival.requestedId ||
    next.readerScope !== arrival.readerScope ||
    next.status !== arrival.status
  ) {
    setArrival(next);
  }
  return {
    file: next.status === "open" ? file : undefined,
    unavailable:
      next.status === "unavailable" && query.isSuccess && !query.error,
    dismiss: () => setArrival({ ...next, status: "consumed" }),
  };
}
