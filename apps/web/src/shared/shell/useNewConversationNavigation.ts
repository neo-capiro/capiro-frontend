"use client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  prepareNewConversation,
  type FirstChatScope,
} from "../meri-conversations/first-chat-intent";
import { productHref } from "../session/client-route";

/**
 * Both explicit and default scope selection open the scope without a conversation id. The stored
 * intent decides what that opening is: the still-empty conversation the person is already in, or
 * a new one. Focus leaves the control so the opened conversation's composer can take it.
 */
export function useNewConversationNavigation(onNavigate?: () => void) {
  const router = useRouter();
  const params = useSearchParams();
  return (scope: FirstChatScope) => {
    prepareNewConversation(
      scope,
      params.get("conversationId"),
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
