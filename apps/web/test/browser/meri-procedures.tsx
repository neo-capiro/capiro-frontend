/**
 * Mounted qualification page for the 09.04 firm procedure governance surface.
 *
 * It mounts the REAL ProcedureGovernanceHost inside the REAL application provider stack
 * (ApplicationBoundary -> AuthenticationProvider -> SessionData -> DataProvider -> CapiroDataProvider),
 * so an account replacement — the harness's own `test:session` event — disposes queries, drafts and
 * pending writes exactly as it does in the product, and the account itself still comes from the
 * authenticated Core `me` read rather than from the session hint.
 *
 * TEST-ONLY REGISTRY COMPOSITION. The shared registry (`src/shared/capiro/registry.ts`) is the gateway
 * allowlist and is composed by the parent; the reviewed leaf operations are deliberately not spread in
 * by this lane. `createCapiroApi` resolves an operation key from the registry object at request time,
 * so this page composes the reviewed leaf over that object in the browser only. No file under `src/` is
 * modified, and the served application does not receive this composition. The spec asserts the keys
 * were absent before the override, so the override cannot be mistaken for the parent's registry change.
 */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ApplicationBoundary } from "../../src/shared/session/ApplicationBoundary";
import { ProcedureGovernanceHost } from "../../src/features/meri/procedures/ProcedureGovernanceHost";
import { capiroOperations } from "../../src/shared/capiro/registry";
import {
  meriFirmSkillOperationKeys,
  meriFirmSkillOperations,
} from "../../src/shared/capiro/operations/meri-firm-skills";
import "../../src/app/globals.css";
import "./font.css";

const registry = capiroOperations as unknown as Record<string, unknown>;
const missingBefore = meriFirmSkillOperationKeys.filter(
  (key) => !Object.hasOwn(registry, key),
);
Object.assign(registry, meriFirmSkillOperations);
Object.assign(window as unknown as Record<string, unknown>, {
  procedureRegistryFixture: {
    missingBefore: [...missingBefore],
    registered: meriFirmSkillOperationKeys.filter((key) =>
      Object.hasOwn(registry, key),
    ),
  },
});

function Fixture() {
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <output data-testid="surface-state">
        {mounted ? "mounted" : "unmounted"}
      </output>
      <button type="button" onClick={() => setMounted((value) => !value)}>
        {mounted ? "Unmount surface" : "Mount surface"}
      </button>
      {mounted ? <ProcedureGovernanceHost /> : null}
    </>
  );
}

// StrictMode is the default here: the development server is the only build in which React replays
// effects, and the strict-effects case is what the lifecycle fence has to survive. `?strict=0`
// mounts the same page without the replay, for a one-read baseline.
const replay = new URLSearchParams(location.search).get("strict") !== "0";
const surface = (
  <ApplicationBoundary publishableKey="pk_test_YQ==">
    <Fixture />
  </ApplicationBoundary>
);
createRoot(document.getElementById("root")!).render(
  replay ? <StrictMode>{surface}</StrictMode> : surface,
);
