import type {
  OutreachCampaign,
  OutreachGenerationReceipt,
  OutreachJob,
} from "../../../../shared/capiro/operations/outreach-campaign-schemas";
import { startOutreachGeneration } from "../../../../shared/meri-conversations/outreach-start";
import { bootstrapConversationSession } from "../../../../shared/meri-conversations/session";
import type { createCampaignApi } from "./campaign-api";
import { sameId } from "./campaign-model";
const terminal = new Set(["done", "held", "failed", "unknown", "canceled"]);
const pause = (signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 1500);
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
/** One active unit uses the normal Meri session owner; Core alone publishes immutable drafts. */
export async function runOutreachUnits(
  owner: ReturnType<typeof createCampaignApi>,
  campaign: OutreachCampaign,
  receipt: OutreachGenerationReceipt,
  signal: AbortSignal,
  onJob: (job: OutreachJob) => void,
) {
  let current = await owner.job(campaign.id, receipt.jobId, signal);
  signal.throwIfAborted();
  onJob(current);
  if (current.items.some((row) => row.status === "unknown"))
    throw new Error(
      "A generation outcome remains unknown. Check status; it will not be started again.",
    );
  for (const item of receipt.items) {
    signal.throwIfAborted();
    if (current.job.status === "canceled") return;
    const row = current.items.find((row) => sameId(row.id, item.id));
    if (!row) throw new Error("The generation unit is unavailable.");
    if (terminal.has(row.status)) continue;
    if (row.status !== "sdk_pending")
      throw new Error(
        "A draft is already running or its outcome is not confirmed. Check status instead of starting another run.",
      );
    const started = await startOutreachGeneration(
      { generationJobId: receipt.jobId, itemId: item.id },
      signal,
    );
    let session = started.session;
    const selected = session.context.selectedClientId,
      expected = campaign.state.clientId;
    if (
      (selected === null) !== (expected === null) ||
      (selected && expected && !sameId(selected, expected))
    )
      throw new Error("The generation session does not match this campaign.");
    let renewAt = Math.min(Date.now() + 120000, session.expiresAtMs - 60000);
    while (true) {
      await pause(signal);
      if (Date.now() >= renewAt) {
        const context = session.context;
        const renewed = await bootstrapConversationSession(
          {
            conversationId: context.conversationId,
            runId: context.runId,
            clientId: context.selectedClientId,
          },
          { tenantId: context.tenantId, actorId: context.actorId },
          signal,
        );
        if (
          renewed.initialRunRebind ||
          !sameId(renewed.context.runId, context.runId)
        )
          throw new Error(
            "Generation session changed. Check the current job before continuing.",
          );
        session = renewed;
        renewAt = Math.min(Date.now() + 120000, session.expiresAtMs - 60000);
      }
      current = await owner.job(campaign.id, receipt.jobId, signal);
      signal.throwIfAborted();
      onJob(current);
      if (current.job.status === "canceled") return;
      const status = current.items.find((row) =>
        sameId(row.id, item.id),
      )?.status;
      if (!status) throw new Error("The running draft is unavailable.");
      if (terminal.has(status)) {
        if (status === "unknown")
          throw new Error(
            "The generation result is not confirmed. Check saved drafts before starting another generation.",
          );
        break;
      }
    }
  }
}
