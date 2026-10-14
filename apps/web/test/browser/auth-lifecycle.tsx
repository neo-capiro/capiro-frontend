import { createRoot } from "react-dom/client";
import { useSearchParams } from "next/navigation";
import { ApplicationBoundary } from "../../src/shared/session/ApplicationBoundary";
import { RequireSession } from "../../src/shared/session/SessionContext";
import { useCapiroQuery } from "../../src/shared/capiro/queries";
import { useAuth as useFixtureSession } from "./clerk";

function IdentityProbe() {
  const identity = useCapiroQuery("me.read", {});
  const view = useSearchParams().get("view") ?? "overview";
  return (
    <main>
      <h1>Synthetic authenticated view: {view}</h1>
      {identity.loading && <p role="status">Loading backend identity.</p>}
      {identity.error && <p role="alert">{identity.error.message}</p>}
      {identity.data && (
        <p data-testid="identity">{identity.data.tenant.name}</p>
      )}
    </main>
  );
}

function Fixture() {
  const session = useFixtureSession();
  return (
    <>
      <output data-testid="fixture-readiness">
        {`${session.providerStatus}:${session.providerLoaded}:${session.isLoaded}`}
      </output>
      <ApplicationBoundary publishableKey="pk_test_YQ==">
        <RequireSession>
          <IdentityProbe />
        </RequireSession>
      </ApplicationBoundary>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
