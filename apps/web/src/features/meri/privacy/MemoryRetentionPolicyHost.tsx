"use client";
import { useCapiroQuery } from "@/shared/capiro/queries";
import Link from "next/link";
import { conversationSearchHref } from "@/shared/meri-conversations/conversation-navigation";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { PrivacyDeletionScreen } from "../screens/settings/PrivacyDeletionScreen";
import type { SettingsChrome } from "../screens/settings/settings-view";
import { memoryPrivacyView } from "./retention-policy-view";
import { ConversationDeletionRequests } from "./ConversationDeletionRequests";
import ui from "../ui/meri-ui.module.css";

export function MemoryRetentionPolicyHost({
  chrome,
}: {
  chrome: SettingsChrome;
}) {
  const query = useCapiroQuery("memory.retentionPolicy.read", {});
  const read = !query.loading && !query.error ? query.data : undefined;
  return (
    <PrivacyDeletionScreen
      chrome={{
        ...chrome,
        notice: {
          title: "Privacy and retention",
          detail:
            "Read the installed memory policy for your current account. Other data stores and request actions retain their own availability.",
        },
        unavailable:
          "Individual memory deletion requests are not connected here.",
      }}
      view={memoryPrivacyView(read)}
      deletionRequests={<ConversationDeletionRequests />}
      conversationActions={
        <div>
          <Link className={ui.outline} href={conversationSearchHref(undefined)}>
            Choose a conversation to export or delete
          </Link>
          <p>
            Export saved prompts and assistant messages after a fresh access
            check. Deleting a conversation requires confirmation and moves it to
            Trash; this does not confirm permanent deletion of held records or
            other data.
          </p>
        </div>
      }
      policyState={
        <div className={ui.row}>
          <QueryState
            pending={query.loading}
            error={query.error}
            retry={query.reload}
          />
          <button
            className={ui.outline}
            disabled={query.loading}
            onClick={query.reload}
          >
            Refresh policy
          </button>
        </div>
      }
    />
  );
}
