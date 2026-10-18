"use client";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";
import { useSelectedClient } from "@/shared/session/SelectedClient";

/** Objective links are explicit. Validate them before mounting Calendar's reads. */
export function ObjectiveMeetingDestination({
  expectedClientId,
  children,
}: {
  expectedClientId: string;
  children: ReactNode;
}) {
  const params = useSearchParams();
  const selected = useSelectedClient();
  if (!params.has("objectiveMeeting")) return children;

  const meeting = params.get("meeting");
  const valid =
    params.getAll("objectiveMeeting").length === 1 &&
    params.get("objectiveMeeting") === "1" &&
    params.getAll("meeting").length === 1 &&
    !params.has("clientId") &&
    z.uuid().safeParse(expectedClientId).success &&
    z.uuid().safeParse(meeting).success;
  if (!valid) return <p role="alert">This meeting link is invalid.</p>;
  if (selected.state === "loading")
    return <p role="status">Verifying selected client.</p>;
  if (
    selected.state !== "authorized-client" ||
    selected.requestedId !== expectedClientId ||
    selected.client.id !== expectedClientId
  )
    return (
      <p role="alert">
        This meeting is unavailable in the selected client scope.
      </p>
    );
  return children;
}
