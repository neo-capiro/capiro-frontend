"use client";

import { Button } from "@capiro/ui/button";
import { DesignIcon } from "../../shared/shell/DesignIcon";
import Link from "next/link";
import { useIdentity } from "../../shared/portfolio/auth/identity";
import { QueryState } from "../../shared/portfolio/ui/QueryState";
import { useSelectedClient } from "../../shared/session/SelectedClient";
import { scopedHref } from "../../shared/session/client-route";
import styles from "./home.module.css";
import { MeriConversationHost } from "./conversation/MeriConversationHost";

/** Ordinary Meri entry shows verified service data, never design fixture records. */
export function MeriHome({
  conversationEnabled = false,
  firstChatBootstrapEnabled = false,
  firstChatBootstrapClientId,
}: {
  conversationEnabled?: boolean;
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
  return (
    <div className={styles.home}>
      <div className={styles.scopeRow}>
        <div className={styles.scope}>
          <Button
            type="button"
            variant="outline"
            className={styles.scopeButton}
            disabled
            title="Choose client scope from Portfolio"
          >
            <DesignIcon name="chevron" />
            {selected.state === "authorized-client"
              ? selected.client.name
              : "No client selected"}
          </Button>
        </div>
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
            <p>
              Choose a permitted client from Portfolio to work in its scope.
            </p>
          )}
          <Link href="/">Open Portfolio</Link>
        </section>
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
        <MeriWorkspaceLinks clientId={clientId} />
      </div>
    </div>
  );
}

/** Keep additional real workflows reachable without shifting the designed sidebar. */
function MeriWorkspaceLinks({ clientId }: { clientId?: string }) {
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
      <p>Each workspace reports its connection status when opened.</p>
    </section>
  );
}
