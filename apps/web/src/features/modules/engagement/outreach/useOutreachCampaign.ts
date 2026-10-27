"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import type {
  OutreachCampaign,
  OutreachCampaignState,
  OutreachDraftArtifact,
  OutreachGenerationReceipt,
  OutreachJob,
  OutreachSendIntent,
} from "../../../../shared/capiro/operations/outreach-campaign-schemas";
import { outreachCampaignState } from "../../../../shared/capiro/operations/outreach-campaign-schemas";
import { createCampaignApi } from "./campaign-api";
import {
  newCampaign,
  readReceipt,
  routeReceipt,
  campaignProblem,
  campaignUnits,
  sameCampaignContent,
  savedEnvelope,
  sameEnvelope,
  sendUnits,
  recoveredCampaignStep,
  canFinishTest,
  navigateCampaign,
} from "./campaign-model";
import {
  sendingMailboxesSchema,
  type SendingMailbox,
} from "../../../portfolio/relationships/public";
import { runOutreachUnits } from "./generation-runner";

export function useOutreachCampaign(id: string | undefined, clientId: string) {
  const api = useCapiro();
  const owner = useMemo(() => createCampaignApi(api), [api]);
  const [saved, setSaved] = useState<OutreachCampaign | null>(null);
  const [state, setState] = useState<OutreachCampaignState>(() =>
    newCampaign(clientId),
  );
  const [drafts, setDrafts] = useState<OutreachDraftArtifact[]>([]);
  const [receipt, setReceipt] = useState<OutreachGenerationReceipt | null>(
    null,
  );
  const [job, setJob] = useState<OutreachJob | null>(null);
  const [send, setSend] = useState<OutreachSendIntent | null>(null);
  const [pending, setPending] = useState<"save" | "generation" | "send" | null>(
    null,
  );
  const [loading, setLoading] = useState(
    Boolean(id || readReceipt("campaignRequest")),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const active = useRef(false);
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    const abort = new AbortController();
    lifetime.current = abort;
    const load = async () => {
      try {
        const key = readReceipt("campaignRequest");
        const record = id
          ? await owner.read(id, abort.signal)
          : key
            ? await owner.recover(key, abort.signal)
            : null;
        if (abort.signal.aborted) return;
        if (record) {
          if (
            clientId &&
            record.state.clientId?.toLowerCase() !== clientId.toLowerCase()
          )
            throw new Error("The campaign does not match the selected client.");
          setSaved(record);
          setState(
            recoveredCampaignStep(
              record.state,
              !!readReceipt("generationRequest"),
              !!readReceipt("sendRequest"),
            ),
          );
          const loadedDrafts = await owner.drafts(record.id, abort.signal);
          abort.signal.throwIfAborted();
          setDrafts(loadedDrafts);
          const generationKey = readReceipt("generationRequest");
          if (generationKey) {
            setPending("generation");
            const result = await api.request(
              "engagement.campaign.generationRequest",
              {
                params: { id: record.id },
                query: { requestKey: generationKey },
              },
              { signal: abort.signal },
            );
            if (!abort.signal.aborted) {
              setReceipt(result);
              if (result) {
                const loadedJob = await owner.job(
                  record.id,
                  result.jobId,
                  abort.signal,
                );
                abort.signal.throwIfAborted();
                setJob(loadedJob);
              }
            }
          }
          const sendKey = readReceipt("sendRequest");
          if (sendKey) {
            setPending("send");
            setState({ ...record.state, lastStep: 7 });
            const loadedSend = await owner.sendRequest(
              record.id,
              sendKey,
              abort.signal,
            );
            abort.signal.throwIfAborted();
            setSend(loadedSend);
          }
        } else if (key) {
          setPending("save");
          setError(
            "The saved result is not available yet. Check this request before creating another campaign.",
          );
        }
      } catch (caught) {
        if (!abort.signal.aborted)
          setError(
            caught instanceof Error ? caught.message : "Campaign unavailable.",
          );
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => abort.abort();
  }, [api, owner, id, clientId]);
  const readOnly = !!saved && saved.status !== "draft";
  const requireEditable = () => {
    if (readOnly)
      throw new Error(
        "This campaign is read-only. Saved copies and delivery status remain available.",
      );
  };
  const dirty = !saved || !sameCampaignContent(saved.state, state);
  const action = async (work: (signal: AbortSignal) => Promise<void>) => {
    if (active.current || lifetime.current.signal.aborted) return;
    active.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await work(lifetime.current.signal);
    } catch (caught) {
      if (!lifetime.current.signal.aborted)
        setError(
          caught instanceof Error
            ? caught.message
            : "The outcome could not be confirmed. Check status before trying again.",
        );
    } finally {
      active.current = false;
      if (!lifetime.current.signal.aborted) setBusy(false);
    }
  };
  const persist = async (signal: AbortSignal) => {
    requireEditable();
    if (!outreachCampaignState.safeParse(state).success)
      throw new Error(
        "Check the campaign name and captured fields before saving.",
      );
    if (pending)
      throw new Error("Check the pending result before saving changes.");
    const key = readReceipt("campaignRequest") ?? crypto.randomUUID();
    if (!saved) routeReceipt("campaignRequest", key);
    setPending("save");
    const record = await owner.save(saved, state, key, signal);
    signal.throwIfAborted();
    setSaved(record);
    setState(record.state);
    setPending(null);
    return record;
  };
  const refresh = () =>
    action(async (signal) => {
      const record = saved
        ? await owner.read(saved.id, signal)
        : readReceipt("campaignRequest")
          ? await owner.recover(readReceipt("campaignRequest")!, signal)
          : null;
      if (!record)
        throw new Error(
          "No result is available for this request yet. It has not been sent again.",
        );
      signal.throwIfAborted();
      setSaved(record);
      // Explicit reload adopts the server's current state; never declares an uncertain mutation failed.
      const loadedDrafts = await owner.drafts(record.id, signal);
      signal.throwIfAborted();
      setState(
        recoveredCampaignStep(
          record.state,
          !!readReceipt("generationRequest"),
          !!readReceipt("sendRequest"),
        ),
      );
      setDrafts(loadedDrafts);
      if (pending === "generation" || readReceipt("generationRequest")) {
        const key = readReceipt("generationRequest");
        if (key) {
          const found = await api.request(
            "engagement.campaign.generationRequest",
            { params: { id: record.id }, query: { requestKey: key } },
            { signal },
          );
          signal.throwIfAborted();
          setReceipt(found);
          if (found) {
            const loadedJob = await owner.job(record.id, found.jobId, signal);
            signal.throwIfAborted();
            setJob(loadedJob);
          } else
            throw new Error(
              "Generation has no readable result yet. It has not been started again.",
            );
        }
      } else if (pending === "send" || readReceipt("sendRequest")) {
        const found = await owner.sendRequest(
          record.id,
          readReceipt("sendRequest")!,
          signal,
        );
        signal.throwIfAborted();
        setSend(found);
        if (!found)
          throw new Error(
            "Delivery has no readable result yet. It has not been sent again.",
          );
      } else setPending(null);
    });
  const generate = (
    keys: string[],
    mode: "generate" | "regenerate" | "improve",
    instruction?: string,
  ) =>
    action(async (signal) => {
      requireEditable();
      const problem = campaignProblem(state);
      if (problem) throw new Error(problem);
      if (pending)
        throw new Error(
          "Check the current request before starting another generation.",
        );
      const record = dirty ? await persist(signal) : saved!;
      const requestKey = crypto.randomUUID();
      routeReceipt("generationRequest", requestKey);
      setPending("generation");
      const result = await api.request(
        "engagement.campaign.generate",
        {
          params: { id: record.id },
          body: {
            expectedRevision: record.revision,
            requestKey,
            generationKeys: keys,
            mode,
            ...(instruction ? { instruction } : {}),
          },
        },
        { signal },
      );
      signal.throwIfAborted();
      setReceipt(result);
      await runOutreachUnits(owner, record, result, signal, setJob);
      const loadedDrafts = await owner.drafts(record.id, signal);
      signal.throwIfAborted();
      setDrafts(loadedDrafts);
    });
  const continueGeneration = () =>
    action(async (signal) => {
      requireEditable();
      if (!saved || !receipt) return;
      await runOutreachUnits(owner, saved, receipt, signal, setJob);
      const loadedDrafts = await owner.drafts(saved.id, signal);
      signal.throwIfAborted();
      setDrafts(loadedDrafts);
    });
  const finishGeneration = () => {
    if (
      job?.job.status === "canceled" ||
      job?.items.every((item) =>
        ["done", "held", "failed", "canceled"].includes(item.status),
      )
    ) {
      setPending(null);
      routeReceipt("generationRequest", null);
      setReceipt(null);
      setJob(null);
    }
  };
  const sendDrafts = (
    testMode: boolean,
    reviewedMailbox: SendingMailbox,
    previewKey?: string,
  ) =>
    action(async (signal) => {
      requireEditable();
      if (!saved || dirty || pending)
        throw new Error(
          "Save and finish the current request before reviewing delivery.",
        );
      if (!state.sender.connectionId)
        throw new Error("Choose a connected sending mailbox.");
      const current = await owner.drafts(saved.id, signal);
      const units = sendUnits(campaignUnits(state), testMode, previewKey);
      const mailboxes = sendingMailboxesSchema.parse(
        await api.request("engagement.newsletter.mailboxes", {}, { signal }),
      );
      const mailbox = mailboxes.find(
        (row) => row.id === state.sender.connectionId,
      );
      if (
        !mailbox ||
        JSON.stringify(mailbox) !== JSON.stringify(reviewedMailbox)
      )
        throw new Error("The sending mailbox changed. Review it again.");
      for (const unit of units) {
        const artifact = current.find((row) => row.generationKey === unit.key),
          reviewed = drafts.find((row) => row.generationKey === unit.key);
        const envelope = artifact
          ? savedEnvelope(artifact.recipientSnapshot)
          : null;
        if (
          !artifact?.current ||
          !reviewed?.current ||
          artifact.current.id !== reviewed.current.id ||
          !envelope ||
          !sameEnvelope(unit, envelope) ||
          JSON.stringify(artifact.recipientSnapshot) !==
            JSON.stringify(reviewed.recipientSnapshot)
        )
          throw new Error(
            "A saved draft or destination changed. Refresh and review before sending.",
          );
      }
      const versions = units.map(
        (unit) =>
          current.find((row) => row.generationKey === unit.key)?.current,
      );
      if (versions.some((version) => !version?.sendable))
        throw new Error("Every message must have a sendable saved draft.");
      if (state.attachmentIds.length > 25)
        throw new Error("A send can include at most 25 attachments.");
      const key = crypto.randomUUID();
      routeReceipt("sendRequest", key);
      setPending("send");
      const result = await api.request(
        "engagement.campaign.send",
        {
          body: {
            outreachRecordId: saved.id,
            requestKey: key,
            senderConnectionId: state.sender.connectionId,
            draftVersionIds: versions.map((version) => version!.id),
            attachmentIds: state.attachmentIds,
            testMode,
          },
        },
        { signal },
      );
      const loadedSend = await owner.sendStatus(
        saved.id,
        result.intentId,
        key,
        signal,
      );
      signal.throwIfAborted();
      setSend(loadedSend);
    });
  return {
    saved,
    state,
    drafts,
    receipt,
    job,
    send,
    pending,
    loading,
    busy,
    error,
    dirty,
    readOnly,
    navigate: (step: number) => {
      if (!active.current)
        setState((value) => navigateCampaign(value, step, !!pending));
    },
    update: (patch: Partial<OutreachCampaignState>) => {
      if (!active.current && !pending && !readOnly)
        setState((value) => ({ ...value, ...patch }));
    },
    save: () =>
      action(async (signal) => {
        await persist(signal);
      }),
    refresh,
    generate,
    continueGeneration,
    finishGeneration,
    sendDrafts,
    editDraft: (
      artifact: OutreachDraftArtifact,
      subject: string,
      body: string,
    ) =>
      action(async (signal) => {
        requireEditable();
        if (!saved || pending)
          throw new Error("Finish the current request before editing.");
        setPending("save");
        const loadedDrafts = await owner.edit(
          saved.id,
          artifact,
          subject,
          body,
          signal,
        );
        signal.throwIfAborted();
        setDrafts(loadedDrafts);
        setPending(null);
      }),
    cancelGeneration: async () => {
      if (!receipt || !saved) return;
      try {
        const signal = lifetime.current.signal;
        await api.request(
          "engagement.campaign.cancelGeneration",
          { params: { id: receipt.jobId } },
          { signal },
        );
        const loadedJob = await owner.job(saved.id, receipt.jobId, signal);
        signal.throwIfAborted();
        setJob(loadedJob);
      } catch (caught) {
        if (!lifetime.current.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Cancellation could not be confirmed. Check status.",
          );
      }
    },
    cancelSend: () =>
      action(async (signal) => {
        if (send && saved) {
          await api.request(
            "engagement.campaign.cancelSend",
            { params: { id: send.id } },
            { signal },
          );
          const loadedSend = await owner.sendStatus(
            saved.id,
            send.id,
            send.requestKey,
            signal,
          );
          signal.throwIfAborted();
          setSend(loadedSend);
        }
      }),
    finishTest: () => {
      if (canFinishTest(send)) {
        setPending(null);
        setSend(null);
        routeReceipt("sendRequest", null);
      }
    },
  };
}
