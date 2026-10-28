"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Destinations } from "@/shared/portfolio/config/config";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
import { useProfileCapacity } from "@/features/portfolio/billing/public";
import { useClients } from "@/shared/portfolio/api/clients";
import {
  continueProfileStarter,
  profileStarterPreflight,
  profileStarterPreflightProblem,
  profileStarterPreflightUnresolved,
  profileStarterProblem,
  writeStarterDraft,
  type ProfileStarterSeed,
} from "@/shared/meri-starters";
import { requireMeriTabStorage } from "@/shared/meri-conversations/tab-journal";
import { firstChatV2OperationKey } from "@/shared/capiro/operations/meri-first-chat";
import { conversationHref } from "@/shared/meri-conversations/conversation-navigation";

export interface MeriProfileStarterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinations: Destinations;
  onCloseAutoFocus?: (event: Event) => void;
}

export function MeriProfileStarterDialog(props: MeriProfileStarterDialogProps) {
  return props.open ? <ProfileStarterSession {...props} /> : null;
}

function ProfileStarterSession({
  onOpenChange,
  destinations,
  onCloseAutoFocus,
}: MeriProfileStarterDialogProps) {
  const router = useRouter();
  const api = useCapiro();
  const identity = useIdentity();
  const capacity = useProfileCapacity(true);
  const clients = useClients({ enabled: true });
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const inflight = useRef<AbortController | undefined>(undefined);

  // Closing the dialog cancels the pending conversation request; it never cancels service work.
  useEffect(() => () => inflight.current?.abort(), []);

  const role = identity.data?.role;
  const preflight = profileStarterPreflight({
    permitted: role === "standard_user" || canAdminister(role),
    capacity,
    clients: clients.data,
    website,
  });
  const seed: ProfileStarterSeed = {
    ...(website.trim() ? { website: website.trim() } : {}),
    ...(notes.trim() ? { notes: notes.trim() } : {}),
  };
  const seedProblem = profileStarterProblem(seed);
  const preflightProblem = profileStarterPreflightProblem(preflight);
  // An unresolved preflight is shown as `unknown` and blocks the handoff instead of passing as clear.
  const preflightPending = profileStarterPreflightUnresolved(preflight);
  const disabled =
    busy ||
    !destinations.meri ||
    Boolean(seedProblem) ||
    Boolean(preflightProblem) ||
    preflightPending;

  const continueInMeri = async () => {
    if (disabled) return;
    setBusy(true);
    setProblem(undefined);
    const controller = new AbortController();
    inflight.current = controller;
    try {
      const storage = requireMeriTabStorage();
      if (!storage) throw new Error("This tab cannot hold the draft.");
      const tenantId = identity.data?.tenant?.id;
      const actorId = identity.data?.user?.id;
      if (!tenantId || !actorId) throw new Error("Your session is not ready.");
      const scope = {
        tenantId,
        actorId,
        clientId: null,
        scopeKind: "general" as const,
      };
      const { conversationId } = await continueProfileStarter({
        seed,
        preflight,
        scope,
        storage,
        signal: controller.signal,
        createOrReuse: (body, signal) =>
          api.request(firstChatV2OperationKey, { body }, { signal }),
        editDraft: (id, message) =>
          writeStarterDraft({
            scope: { tenantId, actorId, clientId: null, conversationId: id },
            draft: message,
            storage,
          }),
      });
      onOpenChange(false);
      router.push(conversationHref(null, conversationId));
    } catch (error) {
      if (!controller.signal.aborted)
        setProblem(
          error instanceof Error
            ? error.message
            : "The profile draft could not be handed to Meri.",
        );
    } finally {
      if (inflight.current === controller) inflight.current = undefined;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title="Create with Meri"
      description="Share a website or notes. Meri drafts a reviewable profile proposal; nothing is created until you review and approve it in the conversation."
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <p className="status">
        This hands an unsent draft to Meri. You still review and approve the
        prepared proposal.
      </p>
      <label>
        Website
        <input
          type="url"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          placeholder="acme.com"
          disabled={busy}
        />
      </label>
      <label>
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What should Meri know about this client?"
          rows={5}
          disabled={busy}
        />
      </label>
      <dl>
        <dt>Role</dt>
        <dd>
          {preflight.role === "permitted" ? "Permitted" : "Not permitted"}
        </dd>
        <dt>Capacity</dt>
        <dd>{preflight.capacity}</dd>
        <dt>Duplicate</dt>
        <dd>{preflight.duplicate}</dd>
      </dl>
      {preflightPending && !seedProblem && !preflightProblem && !problem && (
        <p className="status">
          Checking your plan and the client roster before this draft can
          continue.
        </p>
      )}
      {(seedProblem || preflightProblem || problem) && (
        <p role="alert">{problem ?? seedProblem ?? preflightProblem}</p>
      )}
      <div className="row">
        <button
          type="button"
          className="button primary"
          disabled={disabled}
          onClick={() => void continueInMeri()}
        >
          {busy ? "Preparing conversation…" : "Continue in Meri"}
        </button>
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
