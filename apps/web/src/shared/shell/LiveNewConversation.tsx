"use client";

import { useContext, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIdentity } from "../portfolio/auth/identity";
import {
  beginNewChatIntent,
  newChatIntentEvent,
  type FirstChatScope,
} from "../meri-conversations/first-chat-intent";
import { SessionContext } from "../session/SessionContext";
import { useSelectedClient } from "../session/SelectedClient";
import { productHref } from "../session/client-route";
import { unavailableTitle } from "../meri-resources/unavailable";
import { DesignIcon } from "./DesignIcon";

type Props = {
  assetSet: "home" | "cited-answer";
  className?: string | undefined;
  conversationEnabled: boolean;
  firstChatBootstrapEnabled: boolean;
  onNavigate?: () => void;
};

/** The shell renders before sign-in; only a signed-in child may read identity. */
export function LiveNewConversation(props: Props) {
  const session = useContext(SessionContext);
  if (
    session !== "signed-in" ||
    !props.conversationEnabled ||
    !props.firstChatBootstrapEnabled
  )
    return (
      <NewConversationButton
        {...props}
        disabled
        title={unavailableTitle("newConversation")}
      />
    );
  return <VerifiedNewConversation {...props} />;
}

function NewConversationButton({
  assetSet,
  className,
  disabled,
  title,
  onClick,
}: Props & { disabled: boolean; title?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      <DesignIcon name="plus" assetSet={assetSet} />
      New conversation
    </button>
  );
}

function VerifiedNewConversation(props: Props) {
  const identity = useIdentity();
  const selected = useSelectedClient();
  const router = useRouter();
  const params = useSearchParams();
  const general = params.get("scope") === "general" && !params.has("clientId");
  const invalidScope =
    (params.has("scope") &&
      (!general || params.getAll("scope").length !== 1)) ||
    params.getAll("clientId").length > 1;
  const [error, setError] = useState<string | null>(null);
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const client =
    selected.state === "authorized-client" ? selected.client : null;
  const unavailable = invalidScope
    ? "The conversation scope is invalid."
    : !general && !client
      ? "Choose General or a visible client to start a conversation."
      : !general && client?.status === "archived"
        ? "This client is archived."
        : !current?.tenant?.id || !current.user.id
          ? "A verified account is required to start a conversation."
          : undefined;
  const start = () => {
    if (unavailable || (!general && !client) || !current?.tenant?.id) return;
    const scope: FirstChatScope = general
      ? {
          tenantId: current.tenant.id,
          actorId: current.user.id,
          scopeKind: "general",
          clientId: null,
        }
      : {
          tenantId: current.tenant.id,
          actorId: current.user.id,
          clientId: client!.id,
        };
    try {
      beginNewChatIntent(scope, window.sessionStorage);
      setError(null);
      window.dispatchEvent(new Event(newChatIntentEvent));
      router.push(
        general ? "/meri?scope=general" : productHref("meri", client!.id),
      );
      props.onNavigate?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The new conversation request could not be saved.",
      );
    }
  };
  return (
    <>
      <NewConversationButton
        {...props}
        disabled={Boolean(unavailable)}
        title={unavailable}
        onClick={start}
      />
      {error && <p role="alert">{error}</p>}
    </>
  );
}
