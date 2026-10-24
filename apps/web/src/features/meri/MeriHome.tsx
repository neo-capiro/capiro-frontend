"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useIdentity } from "../../shared/portfolio/auth/identity";
import { QueryState } from "../../shared/portfolio/ui/QueryState";
import { useSelectedClient } from "../../shared/session/SelectedClient";
import { scopedHref } from "../../shared/session/client-route";
import { useMeriCapabilities } from "../../shared/meri-resources/CapabilityContext";
import { meriCapabilityHref } from "../../shared/meri-resources/capabilities";
import { Button } from "@capiro/ui/button";
import styles from "./home.module.css";
import { MeriConversationHost } from "./conversation/MeriConversationHost";
import { IntentApprovalsEnabled } from "./conversation/intents/approvals-enabled";
import { MeriClientSelector } from "./MeriClientSelector";

/** Ordinary Meri entry shows verified service data, never design fixture records. */
export function MeriHome({
  conversationEnabled = false,
  intentApprovalsEnabled = false,
  memoryReviewEnabled = false,
  firstChatBootstrapEnabled = false,
}: {
  conversationEnabled?: boolean;
  /** Server-decided (readIntentsConfig); approvals stay dark unless true. */
  intentApprovalsEnabled?: boolean;
  /** Server-decided (MERI_MEMORY_OWNER_REVIEW_ENABLED); the memory link stays hidden unless true. */
  memoryReviewEnabled?: boolean;
  firstChatBootstrapEnabled?: boolean;
}) {
  const capabilities = useMeriCapabilities();
  const conversationAvailable =
    conversationEnabled && capabilities.conversations.status === "on";
  const identity = useIdentity();
  const selected = useSelectedClient();
  const params = useSearchParams();
  const general = params.get("scope") === "general" && !params.has("clientId");
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const clientId =
    !general && selected.state === "authorized-client"
      ? selected.client.id
      : undefined;
  const clientScope = current?.tenant?.id
    ? { tenantId: current.tenant.id, userId: current.user.id }
    : undefined;
  return (
    <div className={styles.home}>
      <div className={styles.scopeRow}>
        <MeriClientSelector scope={clientScope} />
        <span className={styles.meriWordmark} role="img" aria-label="Meri" />
      </div>
      <div
        className={`${styles.welcomeGroup} ${conversationAvailable ? styles.connectedGroup : ""}`}
      >
        <div className={styles.welcome}>
          <h1>Meri</h1>
        </div>
        <QueryState
          pending={identity.isFetching}
          error={identity.error}
          retry={() => void identity.refetch()}
        />
        {current && (
          <p>
            {current.user.firstName
              ? `Welcome, ${current.user.firstName}.`
              : "Welcome."}
          </p>
        )}
        <section aria-label="Current client">
          {general ? (
            <p>Selected scope: General</p>
          ) : selected.state === "authorized-client" ? (
            <p>Selected client: {selected.client.name}</p>
          ) : (
            <p>Choose a permitted client above to work in its scope.</p>
          )}
          <Link href="/">Open Portfolio</Link>
        </section>
        <IntentApprovalsEnabled.Provider
          value={
            intentApprovalsEnabled &&
            capabilities.conversationApprovals.status === "on"
          }
        >
          <MeriConversationHost
            enabled={conversationAvailable}
            firstChatBootstrapEnabled={
              firstChatBootstrapEnabled &&
              capabilities.newConversation.status === "on"
            }
            account={
              current?.tenant?.id
                ? { tenantId: current.tenant.id, actorId: current.user.id }
                : undefined
            }
          />
        </IntentApprovalsEnabled.Provider>
        <MeriWorkspaceLinks
          clientId={clientId}
          memoryReviewEnabled={memoryReviewEnabled}
        />
      </div>
    </div>
  );
}

/** Keep additional real workflows reachable without shifting the designed sidebar. */
function MeriWorkspaceLinks({
  clientId,
  memoryReviewEnabled,
}: {
  clientId?: string;
  memoryReviewEnabled: boolean;
}) {
  const capabilities = useMeriCapabilities();
  return (
    <section aria-label="Available Meri workspaces">
      {(
        [
          ["files", "Open document files"],
          ["actions", "Open recommendation actions"],
          ["taskUpdates", "Open task updates"],
          ...(memoryReviewEnabled
            ? ([["memory", "Review personal memory"]] as const)
            : []),
        ] as const
      ).map(([id, label]) => {
        const href = meriCapabilityHref(id, capabilities);
        return href ? (
          <Link key={id} href={scopedHref(href, clientId)}>
            {label}{" "}
          </Link>
        ) : (
          <Button
            key={id}
            type="button"
            variant="ghost"
            disabled
            title={capabilities[id].reason}
          >
            {label}
          </Button>
        );
      })}
      <p>
        Some workspaces are not available yet. Disabled controls explain why.
      </p>
    </section>
  );
}
