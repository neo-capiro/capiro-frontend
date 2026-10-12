"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import { canAdminister } from "@/shared/portfolio/auth/identity";
import { clientKey } from "@/features/portfolio/index/public";
import { assertProfileActor, type ProfileActor } from "./profile-access";
import { useProfileClient } from "./profile-read-queries";
import { profileSourceMatches } from "./profile-source";
import { writeProfileNotes } from "./notes-writer";

export function useProfileNotesEditor(
  clientId: string,
  actor: ProfileActor | undefined,
  onSaved: () => void,
) {
  const client = useProfileClient(clientId);
  const api = useApi();
  const cache = useQueryClient();
  const [draft, setDraft] = useState<string>();
  const [baseline, setBaseline] = useState<string>();
  const [pending, setPending] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);
  const saved = client.data?.intakeData?.profileNotes ?? "";
  if (client.source && draft === undefined) {
    setDraft(saved);
    setBaseline(saved);
  }
  const changed =
    baseline !== undefined && Boolean(client.data) && baseline !== saved;
  const editable = Boolean(actor && canAdminister(actor.role));
  const canSave =
    editable &&
    Boolean(client.source) &&
    draft !== undefined &&
    !changed &&
    !pending &&
    !unknown;
  async function save() {
    if (
      !canSave ||
      !actor ||
      !client.source ||
      draft === undefined ||
      request.current
    )
      return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    const source = client.source;
    try {
      const receipt = await writeProfileNotes(
        api,
        cache,
        { clientId, actor, source },
        draft,
        controller.signal,
      );
      if (!alive.current || controller.signal.aborted) return;
      assertProfileActor(cache, actor, true);
      if (!profileSourceMatches(cache, source)) {
        setUnknown(true);
        return;
      }
      cache.setQueryData(source.key, receipt);
      void cache.invalidateQueries({ queryKey: clientKey(clientId) });
      onSaved();
    } catch (cause) {
      if (!alive.current || controller.signal.aborted) return;
      setError(
        cause instanceof Error
          ? cause
          : new Error("Profile notes could not be saved."),
      );
      setUnknown(ambiguousClientWrite(cause));
    } finally {
      if (request.current === controller) request.current = null;
      if (alive.current) setPending(false);
    }
  }
  async function review() {
    setError(null);
    const result = await client.refetch();
    if (!alive.current || !result.isSuccess || result.error || !actor) return;
    try {
      assertProfileActor(cache, actor, true);
      setBaseline(result.data.intakeData?.profileNotes ?? "");
      setUnknown(false);
    } catch {
      /* A replacement session must load its own editor. */
    }
  }
  return {
    client,
    draft: draft ?? "",
    setDraft,
    pending,
    unknown,
    error,
    changed,
    editable,
    canSave,
    save,
    review,
  };
}
