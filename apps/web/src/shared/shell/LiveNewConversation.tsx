"use client";

import { useContext } from "react";
import { useSearchParams } from "next/navigation";
import { researchRoute } from "../meri-conversations/research-context";
import { useIdentity } from "../portfolio/auth/identity";
import { SessionContext } from "../session/SessionContext";
import { useSelectedClient } from "../session/SelectedClient";
import { unavailableTitle } from "../meri-resources/unavailable";
import { DesignIcon } from "./DesignIcon";
import { UnavailableControlReason } from "./UnavailableControlReason";
import { DefaultConversationStart } from "./DefaultConversationStart";
import { useNewConversationNavigation } from "./useNewConversationNavigation";

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
    <UnavailableControlReason
      label="New conversation"
      reason={disabled ? title : undefined}
    >
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
    </UnavailableControlReason>
  );
}

function VerifiedNewConversation(props: Props) {
  const identity = useIdentity();
  const selected = useSelectedClient();
  const params = useSearchParams();
  const research = researchRoute(params);
  const general = params.get("scope") === "general" && !params.has("clientId");
  const invalidScope =
    (params.has("scope") &&
      (!general || params.getAll("scope").length !== 1)) ||
    params.getAll("clientId").length > 1;
  const start = useNewConversationNavigation(props.onNavigate);
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const client =
    selected.state === "authorized-client" ? selected.client : null;
  const unavailable = research
    ? "Open or start the Research conversation in the Research panel."
    : invalidScope
      ? "The conversation scope is invalid."
      : !general && !client
        ? "Choose General or a visible client to start a conversation."
        : !general && client?.status === "archived"
          ? "This client is archived."
          : !current?.tenant?.id || !current.user.id
            ? "A verified account is required to start a conversation."
            : undefined;
  const explicitStart = () => {
    if (unavailable || (!general && !client) || !current?.tenant?.id) return;
    start(
      general
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
          },
    );
  };
  return (
    <>
      {current?.tenant?.id &&
      current.user.id &&
      selected.state === "no-selection" &&
      !research &&
      !params.has("scope") &&
      !params.has("clientId") ? (
        <DefaultConversationStart
          key={`${current.tenant.id}:${current.user.id}`}
          owner={{ tenantId: current.tenant.id, actorId: current.user.id }}
          start={(clientId) =>
            start({
              tenantId: current.tenant!.id,
              actorId: current.user.id,
              clientId,
            })
          }
        >
          {(control) => <NewConversationButton {...props} {...control} />}
        </DefaultConversationStart>
      ) : (
        <NewConversationButton
          {...props}
          disabled={Boolean(unavailable)}
          title={unavailable}
          onClick={explicitStart}
        />
      )}
    </>
  );
}
