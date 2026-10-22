import { createRoot } from "react-dom/client";
import { SettingsDialog } from "@/features/settings/components";
import { CreateTenant } from "@/features/settings/hq/TenantDialogs";
import { PortfolioHarnessProviders } from "./portfolio-harness-providers";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

declare global {
  interface Window {
    __settingsForm: { closeCalls: number; refreshCalls: number };
  }
}

// Observe real component callbacks; do not replace dialog or mutation behavior.
const calls = { closeCalls: 0, refreshCalls: 0 };
window.__settingsForm = calls;
const onClose = () => {
  calls.closeCalls += 1;
};
const refresh = () => {
  calls.refreshCalls += 1;
};
const busyDialog = new URLSearchParams(location.search).has("busy-dialog");

createRoot(document.getElementById("root")!).render(
  <PortfolioHarnessProviders>
    {busyDialog ? (
      <SettingsDialog open busy title="Delete" onClose={onClose}>
        Target
      </SettingsDialog>
    ) : (
      <CreateTenant open onClose={onClose} refresh={refresh} />
    )}
  </PortfolioHarnessProviders>,
);
