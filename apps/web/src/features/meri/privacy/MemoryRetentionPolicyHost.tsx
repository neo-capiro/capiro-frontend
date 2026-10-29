"use client";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { PrivacyDeletionScreen } from "../screens/settings/PrivacyDeletionScreen";
import type { SettingsChrome } from "../screens/settings/settings-view";
import { memoryPrivacyView } from "./retention-policy-view";
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
          "Privacy export, deletion and individual retention-status services are not connected here.",
      }}
      view={memoryPrivacyView(read)}
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
