"use client";
import { MeriPreferencesPanel } from "../../../src/features/meri/screens/settings/MeriPreferencesPanel";

export default function ClientPane() {
  return (
    <>
      <header>
        <label>
          Persistent header input
          <input aria-label="Persistent header input" defaultValue="" />
        </label>
      </header>
      <h1>Local preferences keyboard focus fixture</h1>
      <p>
        Synthetic page bodies; the real preferences panel, Settings navigation
        and SegmentedTabs run against the local Next App Router. No application
        service is involved.
      </p>
      <MeriPreferencesPanel />
      <footer>
        <label>
          Persistent footer input
          <input aria-label="Persistent footer input" defaultValue="" />
        </label>
      </footer>
    </>
  );
}
