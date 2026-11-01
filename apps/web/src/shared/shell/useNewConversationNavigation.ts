"use client";
import { useRouter } from "next/navigation";
import type { FirstChatScope } from "../meri-conversations/first-chat-intent";
import { productHref } from "../session/client-route";

/**
 * Both explicit and default scope selection open the scope without a conversation id; the host
 * then reopens the scope's still-empty conversation or starts a new one.
 */
export function useNewConversationNavigation(onNavigate?: () => void) {
  const router = useRouter();
  return (scope: FirstChatScope) => {
    router.push(
      scope.clientId === null
        ? "/meri?scope=general"
        : productHref("meri", scope.clientId),
    );
    onNavigate?.();
  };
}
