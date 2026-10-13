import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { AttemptStatus, PendingFields } from "../../ui/AttemptStatus";
import { routeForState } from "../../lib/funnel-routes";
// 1.8 Client Import Preference — F1Import (prototype/02-flow1.jsx). The
// self-service copy reflects the real LDA-filings import (not CSV/CRM).
import React from "react";
import { useNavigate } from "../../navigation";
import {
  Btn,
  FunnelShell,
  OptionCard,
  ScreenTitle,
  Tag,
} from "../../ui/primitives";
import {
  useAdvanceSession,
  useFunnelApi,
  useFunnelSession,
  type FunnelSession,
  type ImportMode,
} from "../../lib/funnel";
import { ErrorText, errorMessage } from "./shared";

export function ClientsPage() {
  const session = useFunnelSession();
  if (!session.data) return null;
  return <F1Import session={session.data} />;
}

function F1Import({ session }: { session: FunnelSession }) {
  const navigate = useNavigate();
  const api = useFunnelApi();
  const write = useOnboardAttempt(api, "import-preference");
  const advanceSession = useAdvanceSession();
  const [importMode, setImportMode] = React.useState<ImportMode | null>(
    session.importMode ?? null,
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (!importMode || busy) return;
    if (write.blocked()) return;
    setBusy(true);
    setError(null);
    try {
      await write.run("Save the reviewed import-preference", async (guard) => {
        await guard.wait(() => api.setImportPref(importMode));
        const current = await guard.wait(() => advanceSession(guard));
        navigate(routeForState(current.state));
      });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const checkCurrent = async () => {
    const guard = write.guard();
    try {
      const current = await guard.wait(() => advanceSession(guard));
      // An unresolved prior write remains blocked; route only from this read.
      navigate(routeForState(current.state));
    } catch (err) {
      if (guard.current()) setError(errorMessage(err));
    }
  };

  return (
    <FunnelShell step={6} maxWidth={720}>
      <AttemptStatus record={write.record} check={() => void checkCurrent()} />
      <PendingFields disabled={write.locked}>
        <ScreenTitle title="How would you like to bring in your clients?" />
        <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
          <OptionCard
            disabled={write.locked}
            selected={importMode === "self"}
            onClick={() => setImportMode("self")}
            title="Self-service"
          >
            Import your clients straight from your firm&apos;s LDA filings —
            each lands with its federal data pre-linked. Available immediately
            in your setup dashboard.
          </OptionCard>
          <OptionCard
            disabled={write.locked}
            selected={importMode === "managed"}
            onClick={() => setImportMode("managed")}
            title="Capiro-managed"
            badge={<Tag tone="blue">White-glove</Tag>}
          >
            Our team handles it for you. We&apos;ll reach out within one
            business day to collect your portfolio.
          </OptionCard>
        </div>
        {error && <ErrorText style={{ textAlign: "right" }}>{error}</ErrorText>}
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}
        >
          <Btn
            variant="primary"
            disabled={!importMode || busy}
            onClick={() => void submit()}
          >
            Continue
          </Btn>
        </div>
      </PendingFields>
    </FunnelShell>
  );
}
