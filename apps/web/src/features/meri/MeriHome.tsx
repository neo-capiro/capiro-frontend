"use client";

import Link from "next/link";
import { useIdentity } from "../../shared/portfolio/auth/identity";
import { QueryState } from "../../shared/portfolio/ui/QueryState";
import { useSelectedClient } from "../../shared/session/SelectedClient";
import { scopedHref } from "../../shared/session/client-route";
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
  firstChatBootstrapClientId,
}: {
  conversationEnabled?: boolean;
  /** Server-decided (readIntentsConfig); approvals stay dark unless true. */
  intentApprovalsEnabled?: boolean;
  /** Server-decided (MERI_MEMORY_OWNER_REVIEW_ENABLED); the memory link stays hidden unless true. */
  memoryReviewEnabled?: boolean;
  firstChatBootstrapEnabled?: boolean;
  firstChatBootstrapClientId?: string;
}) {
  const identity = useIdentity();
  const selected = useSelectedClient();
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : undefined;
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
        className={`${styles.welcomeGroup} ${conversationEnabled ? styles.connectedGroup : ""}`}
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
          {selected.state === "authorized-client" ? (
            <p>Selected client: {selected.client.name}</p>
          ) : (
            <p>Choose a permitted client above to work in its scope.</p>
          )}
          <Link href="/">Open Portfolio</Link>
        </section>
        <IntentApprovalsEnabled.Provider value={intentApprovalsEnabled}>
          <MeriConversationHost
            enabled={conversationEnabled}
            firstChatBootstrapEnabled={firstChatBootstrapEnabled}
            firstChatBootstrapClientId={firstChatBootstrapClientId}
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
  return (
    <section aria-label="Available Meri workspaces">
      <Link href={scopedHref("/meri/files", clientId)}>
        Open document files
      </Link>{" "}
      <Link href={scopedHref("/meri/actions", clientId)}>
        Open recommendation actions
      </Link>{" "}
      <Link href={scopedHref("/meri/task-updates", clientId)}>
        Open task updates
      </Link>
      {memoryReviewEnabled ? (
        <>
          {" "}
          <Link href="/meri/memory">Review personal memory</Link>
        </>
      ) : null}
      <p>Each workspace reports its connection status when opened.</p>
    </section>
  );
}
