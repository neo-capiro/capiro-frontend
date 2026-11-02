"use client";

import { useIdentity } from "../../shared/portfolio/auth/identity";
import { QueryState } from "../../shared/portfolio/ui/QueryState";
import { useMeriCapabilities } from "../../shared/meri-resources/CapabilityContext";
import styles from "./home.module.css";
import { MeriConversationHost } from "./conversation/MeriConversationHost";
import { IntentApprovalsEnabled } from "./conversation/intents/approvals-enabled";
import { MeriClientSelector } from "./MeriClientSelector";
import { OfficeEditing } from "./office/OfficeEditing";

/** Ordinary Meri entry shows verified service data, never design fixture records. */
export function MeriHome({
  conversationEnabled = false,
  intentApprovalsEnabled = false,
  firstChatBootstrapEnabled = false,
  officeEnabled = false,
}: {
  conversationEnabled?: boolean;
  /** Server-decided (readIntentsConfig); approvals stay dark unless true. */
  intentApprovalsEnabled?: boolean;
  firstChatBootstrapEnabled?: boolean;
  /** Server-decided (readOfficeConfig); an applied Office proposal can reopen its version here only when true. */
  officeEnabled?: boolean;
}) {
  const capabilities = useMeriCapabilities();
  const conversationAvailable =
    conversationEnabled && capabilities.conversations.status === "on";
  const identity = useIdentity();
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const clientScope = current?.tenant?.id
    ? { tenantId: current.tenant.id, userId: current.user.id }
    : undefined;
  return (
    <div className={styles.chatHome}>
      {/* The page keeps one accessible name; the orb carries the visible Meri mark. */}
      <h1 className={styles.visuallyHidden}>Meri</h1>
      <QueryState
        pending={identity.isFetching}
        error={identity.error}
        retry={() => void identity.refetch()}
      />
      <div className={styles.hostSlot}>
        <IntentApprovalsEnabled.Provider
          value={
            intentApprovalsEnabled &&
            capabilities.conversationApprovals.status === "on"
          }
        >
          <OfficeEditing
            enabled={officeEnabled}
            account={
              current?.tenant?.id
                ? { tenantId: current.tenant.id, actorId: current.user.id }
                : null
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
              scopeControl={<MeriClientSelector scope={clientScope} />}
            />
          </OfficeEditing>
        </IntentApprovalsEnabled.Provider>
      </div>
    </div>
  );
}
