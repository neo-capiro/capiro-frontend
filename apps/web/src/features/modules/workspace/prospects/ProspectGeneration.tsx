"use client";
import { useState } from "react";
import Link from "next/link";
import { conversationHref } from "@/shared/meri-conversations/conversation-navigation";
import type { SavedVersion } from "@/shared/capiro/operations/workspace-documents";
import { ActionButton, Field, TextArea } from "@/shared/module-ui";
import { SectionPreview } from "../rich-document/SectionPreview";
import type { ProspectWriter } from "./recovery-authority";
import type { ProspectDraftScope } from "./manual-draft";
import { prospectSavedSourceEligible } from "./saved-source";
import { useProspectGeneration } from "./useProspectGeneration";

export function ProspectGeneration({
  scope,
  actor,
  version,
  clean,
  onLoadSaved,
}: {
  scope: ProspectDraftScope;
  actor: ProspectWriter;
  version: SavedVersion;
  clean: boolean;
  onLoadSaved: () => void;
}) {
  const generation = useProspectGeneration(scope, actor);
  const [brief, setBrief] = useState(""),
    [selected, setSelected] = useState<string[]>([]);
  const names = version.snapshot?.config?.sections ?? [];
  const sources = selected.filter((name) => names.includes(name));
  const proposal = generation.proposal;
  const busy = generation.pending || Boolean(generation.retained);
  const unresolved = generation.state?.proposals.some(
    (p) =>
      p.status === "pending" &&
      ["prepared", "unknown", "approval-required"].includes(p.phase),
  );
  if (!generation.ready)
    return (
      <section aria-label="Prospect generation">
        <p role={generation.recoveryError ? "alert" : "status"}>
          {generation.recoveryError ?? "Checking generation and recovery…"}
        </p>
        {generation.recoveryError && (
          <ActionButton onClick={generation.retryAccess}>
            Retry generation access
          </ActionButton>
        )}
      </section>
    );
  return (
    <section aria-label="Prospect generation">
      <h3>Generate a proposal from this saved version</h3>
      <p>
        Select the saved sections to use as evidence and describe what to write.
        Generation proposes content for the document’s sections; accepting saves
        a draft version.
      </p>
      {generation.error && <p role="alert">{generation.error}</p>}
      {generation.message && <p role="status">{generation.message}</p>}
      {generation.pending && <p role="status">Checking the request…</p>}
      {generation.retained && (
        <div>
          <p>
            An earlier request is unconfirmed. Recovery uses that exact original
            request.
          </p>
          <ActionButton
            disabled={generation.pending}
            onClick={generation.recover}
          >
            Recover original generation request
          </ActionButton>
        </div>
      )}
      {!generation.state?.available && (
        <p>
          Generation is unavailable until the configured AI service is
          connected.
        </p>
      )}
      {!clean && (
        <p>
          Save your current edits before generating or accepting a proposal.
        </p>
      )}
      {!prospectSavedSourceEligible(version, generation.state?.stateHash) && (
        <p>Select a saved version that matches the current document.</p>
      )}
      <fieldset disabled={busy || !clean || !generation.state?.available}>
        <legend>Saved sections to use</legend>
        {names.map((name) => (
          <label key={name}>
            <input
              type="checkbox"
              checked={sources.includes(name)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current.filter((n) => n !== name), name]
                    : current.filter((n) => n !== name),
                )
              }
            />{" "}
            {name}
          </label>
        ))}
        <Field label="Writing brief" htmlFor="prospect-writing-brief">
          <TextArea
            id="prospect-writing-brief"
            value={brief}
            maxLength={4000}
            onChange={(event) => setBrief(event.target.value)}
          />
        </Field>
        <ActionButton
          disabled={
            Boolean(unresolved) ||
            !sources.length ||
            !brief.trim() ||
            new TextEncoder().encode(brief).byteLength > 4000 ||
            !prospectSavedSourceEligible(version, generation.state?.stateHash)
          }
          onClick={() => generation.generate(version, sources, brief)}
        >
          Generate proposal
        </ActionButton>
      </fieldset>
      {unresolved && (
        <p>
          A generation request is still unresolved. Open it below to check or
          retry the original request.
        </p>
      )}
      <h4>Recent proposals</h4>
      {generation.state?.proposals.length ? (
        <ul>
          {generation.state.proposals.map((p) => (
            <li key={p.proposalId}>
              <ActionButton
                disabled={generation.pending}
                onClick={() => generation.observe(p.proposalId)}
              >
                {new Date(p.createdAt).toLocaleString()} ·{" "}
                {p.status === "pending" ? p.phase : p.status}
              </ActionButton>
            </li>
          ))}
        </ul>
      ) : (
        <p>No generation proposals yet.</p>
      )}
      <ActionButton disabled={generation.pending} onClick={generation.refresh}>
        Refresh proposals
      </ActionButton>
      {proposal && (
        <article aria-label="Generated proposal">
          <h4>
            Proposal ·{" "}
            {proposal.status === "pending" ? proposal.phase : proposal.status}
          </h4>
          <p>Writing brief: {proposal.writingBrief}</p>
          <p>
            Source version: {proposal.source.sourceVersionId}. Selected
            sections: {proposal.selectedSections.join(", ")}.
          </p>
          {proposal.stale && (
            <p role="alert">
              The document has changed. This proposal cannot replace the newer
              saved work.
            </p>
          )}
          {proposal.phase === "failed" && (
            <p>
              {proposal.failureReason === "output-invalid"
                ? "The service returned unsupported or incomplete content. Nothing was saved."
                : "Generation failed. Nothing was saved."}
            </p>
          )}
          {proposal.phase === "approval-required" && (
            <p>
              The AI service is waiting for approval. Resolve it in the original
              conversation, then check again.
            </p>
          )}
          {proposal.createdById === actor.ownerId && (
            <Link href={conversationHref(null, proposal.conversationId)}>
              Open generation conversation
            </Link>
          )}
          {proposal.status === "pending" &&
            ["prepared", "unknown", "approval-required"].includes(
              proposal.phase,
            ) &&
            proposal.createdById === actor.ownerId && (
              <div>
                <ActionButton
                  disabled={busy}
                  onClick={() =>
                    generation.observe(proposal.proposalId, "reconcile")
                  }
                >
                  Check original generation
                </ActionButton>
                {proposal.phase !== "approval-required" && (
                  <ActionButton
                    disabled={busy}
                    onClick={() =>
                      generation.observe(proposal.proposalId, "retry")
                    }
                  >
                    Retry original generation
                  </ActionButton>
                )}
              </div>
            )}
          {proposal.output &&
            proposal.output.names.map((name) => (
              <section key={name}>
                <h5>{name}</h5>
                <SectionPreview value={proposal.output!.sections[name] ?? ""} />
              </section>
            ))}
          {proposal.phase === "ready" && proposal.status === "pending" && (
            <div>
              <ActionButton
                disabled={busy || !clean || proposal.stale}
                onClick={() => generation.decide("accept")}
              >
                Accept and save draft version
              </ActionButton>
              <ActionButton
                disabled={busy}
                onClick={() => generation.decide("reject")}
              >
                Reject proposal
              </ActionButton>
            </div>
          )}
          {proposal.status === "accepted" && (
            <ActionButton disabled={busy || !clean} onClick={onLoadSaved}>
              Load current saved document
            </ActionButton>
          )}
        </article>
      )}
    </section>
  );
}
