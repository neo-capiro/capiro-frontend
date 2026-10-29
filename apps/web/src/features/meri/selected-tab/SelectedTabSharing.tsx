"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@capiro/ui/button";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import type { CapiroMe } from "../../../shared/capiro/operations/settings-schemas";
import type { ConversationContext } from "../../../shared/meri-conversations/session";
import type { SelectedTabAccess } from "../../../shared/meri-selected-tab/access";
import { validSelectedTabExtension } from "../../../shared/meri-selected-tab/chrome-port";
import ui from "../ui/meri-ui.module.css";
import styles from "./selected-tab.module.css";

type Props = {
  access: SelectedTabAccess;
  context: ConversationContext;
  scope: string;
};
/** The deployment names its installed extension; unconfigured environments do
 * not advertise an unavailable device operation. No extension ID is a secret. */
export function SelectedTabSharing(props: Props) {
  const extensionId = process.env.NEXT_PUBLIC_MERI_SELECTED_TAB_EXTENSION_ID;
  return validSelectedTabExtension(extensionId) ? (
    <ConnectedTabSharing {...props} extensionId={extensionId} />
  ) : null;
}
function ConnectedTabSharing({
  access,
  context,
  scope,
  extensionId,
}: Props & { extensionId: string }) {
  const identity = useCapiroQuery("me.read", {});
  const state = useSyncExternalStore(
    access.subscribe,
    access.getSnapshot,
    access.getSnapshot,
  );
  const current =
    !!identity.data &&
    !identity.loading &&
    !identity.error &&
    identity.data.user.id === context.actorId &&
    identity.data.tenant.id === context.tenantId;
  useEffect(() => {
    if (!current) access.revoke();
  }, [access, current]);
  useEffect(() => () => access.revoke(), [access]);
  const paired = ["connecting", "connected", "active", "paused"].includes(
    state.state,
  );
  const labels = current ? selectedTabLabels(identity.data!, scope) : null;
  return (
    <details className={styles.control}>
      <summary>Share a browser tab</summary>
      <div className={styles.panel}>
        <p className={ui.muted}>
          Connect the Capiro extension, then choose a source tab and preview its
          text before sharing. It becomes an attachment in this chat.
        </p>
        <p role="status">
          {current
            ? `Connection: ${state.state}`
            : "Verifying the current account…"}
        </p>
        {state.message && <p className={ui.muted}>{state.message}</p>}
        {labels && (
          <p className={ui.muted}>
            {labels.account} · {labels.conversation}
          </p>
        )}
        <div className={styles.actions}>
          {!paired && (
            <Button
              type="button"
              variant="outline"
              disabled={!labels}
              onClick={() => {
                if (labels) void access.connect(extensionId, labels);
              }}
            >
              Connect extension
            </Button>
          )}
          {state.state === "active" && (
            <Button type="button" variant="outline" onClick={access.pause}>
              Pause sharing
            </Button>
          )}
          {paired && (
            <Button type="button" variant="outline" onClick={access.revoke}>
              Disconnect
            </Button>
          )}
        </div>
        {state.state === "paused" && (
          <p className={ui.muted}>Resume from the extension popup.</p>
        )}
      </div>
    </details>
  );
}

function selectedTabLabels(identity: CapiroMe, scope: string) {
  const label = (value: string, cap: number) =>
    value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, cap);
  const user =
    identity.user.email ??
    ([identity.user.firstName, identity.user.lastName]
      .filter(Boolean)
      .join(" ") ||
      "Signed-in user");
  return {
    account: label(`${user} \u00b7 ${identity.tenant.name}`, 128),
    conversation: label(`Current chat \u00b7 ${scope}`, 256),
  };
}
