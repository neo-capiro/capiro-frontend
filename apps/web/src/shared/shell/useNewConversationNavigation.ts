"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  beginNewChatIntent,
  newChatIntentEvent,
  type FirstChatScope,
} from "../meri-conversations/first-chat-intent";
import { productHref } from "../session/client-route";

/** Both explicit and default scope selection enter the same retained intent owner. */
export function useNewConversationNavigation(onNavigate?: () => void) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const start = (scope: FirstChatScope) => {
    try {
      beginNewChatIntent(scope, window.sessionStorage);
      setError(null);
      window.dispatchEvent(new Event(newChatIntentEvent));
      router.push(
        scope.clientId === null
          ? "/meri?scope=general"
          : productHref("meri", scope.clientId),
      );
      onNavigate?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The new conversation request could not be saved.",
      );
    }
  };
  return { start, error };
}
