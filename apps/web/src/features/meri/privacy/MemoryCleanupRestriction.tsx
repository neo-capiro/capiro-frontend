"use client";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { SettingsCard } from "../screens/settings/SettingsCard";
import { cleanupRestrictionNotice } from "./retention-policy-view";
import ui from "../ui/meri-ui.module.css";

export function MemoryCleanupRestriction() {
  const query = useCapiroQuery("memory.retentionPolicy.cleanupRestriction", {});
  const current = !query.loading && !query.error ? query.data : undefined;
  const notice = cleanupRestrictionNotice(current);
  return (
    <SettingsCard title="Memory cleanup restriction">
      <QueryState
        pending={query.loading}
        error={query.error}
        retry={query.reload}
      />
      <p role="status">{notice}</p>
      {current ? (
        <p>
          Checked at{" "}
          <time dateTime={current.observedAt}>{current.observedAt}</time>.
        </p>
      ) : null}
      <p>
        This checks legacy submission records only. Legal holds, retained
        history and other stores may still prevent deletion. It does not submit
        a request or confirm deletion.
      </p>
      <button
        type="button"
        className={ui.outline}
        disabled={query.loading}
        onClick={query.reload}
      >
        Refresh cleanup restriction
      </button>
    </SettingsCard>
  );
}
