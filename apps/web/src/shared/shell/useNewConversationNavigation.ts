"use client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  prepareNewConversation,
  type FirstChatScope,
} from "../meri-conversations/first-chat-intent";
import { productHref } from "../session/client-route";

/**
 * The conversation the address shows for this scope, or null when the address is another page
 * or another scope: only a different conversation of the same scope leaves the scope's still-empty
 * one behind.
 */
export function currentConversationIn(
  scope: FirstChatScope,
  params: Pick<URLSearchParams, "get" | "has">,
) {
  const sameScope =
    scope.clientId === null
      ? params.get("scope") === "general" && !params.has("clientId")
      : params.get("clientId") === scope.clientId;
  return sameScope ? params.get("conversationId") : null;
}

/**
 * Both explicit and default scope selection open the scope without a conversation id. The stored
 * intent decides what that opening is: the scope's still-empty conversation, or a new one. Focus
 * leaves the control so the opened conversation's composer can take it.
 */
export function useNewConversationNavigation(onNavigate?: () => void) {
  const router = useRouter();
  const params = useSearchParams();
  return (scope: FirstChatScope) => {
    prepareNewConversation(
      scope,
      currentConversationIn(scope, params),
      window.sessionStorage,
    );
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    router.push(
      scope.clientId === null
        ? "/meri?scope=general"
        : productHref("meri", scope.clientId),
    );
    onNavigate?.();
  };
}
