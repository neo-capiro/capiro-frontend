"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { useApi } from "@/shared/portfolio/api/provider";
import { identitySchema, useIdentity } from "@/shared/portfolio/auth/identity";
import { clientSchema, type Client } from "@/shared/session/client-contract";
import { useSelectedClient } from "@/shared/session/SelectedClient";
import { useMeriCapabilities } from "@/shared/meri-resources/CapabilityContext";
import { clientHandoff } from "@/shared/meri-conversations/client-handoff";

/** The entry is reviewed here, then stays unsent in Meri under fresh current-client authority. */
export function ClientMeriHandoffDialog({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const identity = useIdentity(),
    selected = useSelectedClient(),
    capability = useMeriCapabilities();
  const api = useApi(),
    router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const pending = useRef<AbortController | null>(null);
  const account =
    identity.isSuccess &&
    !identity.isFetching &&
    !identity.error &&
    identity.data.tenant
      ? { tenantId: identity.data.tenant.id, actorId: identity.data.user.id }
      : undefined;
  const available =
    !!account &&
    selected.state === "authorized-client" &&
    selected.client.id === client.id &&
    selected.client.status !== "archived" &&
    capability.conversations.status === "on" &&
    capability.newConversation.status === "on";
  useEffect(
    () => () => pending.current?.abort(),
    [client.id, account?.tenantId, account?.actorId, available],
  );
  const open = async () => {
    if (!available || !account || pending.current || !draft.trim()) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError(undefined);
    try {
      // Direct current reads avoid treating the profile's cached header as authority.
      const [freshIdentity, freshClient] = await Promise.all([
        api.request("core", "me", identitySchema, {
          signal: controller.signal,
        }),
        api.request(
          "core",
          `clients/${encodeURIComponent(client.id)}`,
          clientSchema,
          { signal: controller.signal },
        ),
      ]);
      controller.signal.throwIfAborted();
      if (
        freshIdentity.tenant?.id !== account.tenantId ||
        freshIdentity.user.id !== account.actorId ||
        freshClient.id !== client.id ||
        freshClient.status === "archived"
      )
        throw Error("Client changed");
      clientHandoff(account).write({ clientId: freshClient.id, draft });
      router.push(`/meri?${new URLSearchParams({ clientId: freshClient.id })}`);
      onClose();
    } catch {
      if (!controller.signal.aborted)
        setError(
          "This client could not be verified. Refresh the profile and try again.",
        );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title="Ask Meri about this client"
      description={`Selected client: ${client.name}`}
    >
      <p>
        Review an initial message. Meri will recheck this client and let you
        edit the draft before sending.
      </p>
      <label>
        Your initial message
        <textarea
          value={draft}
          maxLength={32_000}
          disabled={busy || !available}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {!available && (
        <p role="status">
          A current active client and enabled Meri conversation are required.
        </p>
      )}
      <button
        className="button"
        type="button"
        disabled={busy || !available || !draft.trim()}
        onClick={() => void open()}
      >
        {busy ? "Verifying client…" : "Open draft in Meri"}
      </button>
    </Dialog>
  );
}
