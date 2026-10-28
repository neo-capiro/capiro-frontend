/**
 * Usage-overview host fixture: the production session boundary, the shared synthetic capability
 * profile and the production usage host. Only the external boundaries (identity HTTP, client HTTP
 * and the tenant-usage read HTTP) are supplied by Playwright route interception in the adjacent
 * spec. Nothing here replaces the host, its current-read hook or its access lifetime, and the URL
 * is a `/settings/...` path so the production client-scoping rule is the one under test.
 */
import { createRoot } from "react-dom/client";
import { ApplicationBoundary } from "../../../src/shared/session/ApplicationBoundary";
import { UsageOverviewHost } from "../../../src/features/meri/usage-overview/UsageOverviewHost";
import type { SettingsChrome } from "../../../src/features/meri/screens/settings/settings-view";
import { SyntheticMeriCapabilities } from "../../browser/meri-capability-profile";

const chrome: SettingsChrome = {
  nav: [],
  embedded: true,
  notice: { title: "Workspace usage", detail: "" },
  unavailable: "Runs access is unavailable",
  localDrafts: false,
  headerOverlays: false,
};

createRoot(document.getElementById("root")!).render(
  <ApplicationBoundary publishableKey="pk_test_YQ==">
    <SyntheticMeriCapabilities>
      <UsageOverviewHost chrome={chrome} />
    </SyntheticMeriCapabilities>
  </ApplicationBoundary>,
);
