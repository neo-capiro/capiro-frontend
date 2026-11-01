import { createRoot } from "react-dom/client";
import { DataAccessHost } from "@/features/meri/screens/settings/DataAccessHost";
import { preferencePages } from "@/features/meri/screens/settings/preferences-unavailable";
import type { SettingsChrome } from "@/features/meri/screens/settings/settings-view";
import { SelectedClientProvider } from "@/shared/session/SelectedClient";
import { PortfolioHarnessProviders } from "./portfolio-harness-providers";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

const chrome: SettingsChrome = {
  nav: preferencePages.map((page) => ({
    ...page,
    current: page.id === "data-access",
  })),
  select: () => undefined,
  embedded: true,
  notice: { title: "Data access", detail: "Synthetic harness." },
  unavailable: "",
  localDrafts: false,
  headerOverlays: false,
};
const requestedId =
  new URLSearchParams(location.search).get("clientId") ?? undefined;

/** Preferences → Data access over the scripted Core account/client and a scripted Meri data-access read. */
createRoot(document.getElementById("root")!).render(
  <PortfolioHarnessProviders>
    <SelectedClientProvider
      {...(requestedId === undefined ? {} : { requestedId })}
    >
      <main style={{ maxWidth: 1200, margin: "2rem auto" }}>
        <DataAccessHost chrome={chrome} />
      </main>
    </SelectedClientProvider>
  </PortfolioHarnessProviders>,
);
