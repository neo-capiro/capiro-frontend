import { createRoot } from "react-dom/client";
import { PortfolioHarnessProviders } from "./portfolio-harness-providers";
import { SelectedClientProvider } from "@/shared/session/SelectedClient";
import { MeriConversationHost } from "@/features/meri/conversation/MeriConversationHost";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

const params = new URLSearchParams(location.search);
const requestedId = params.get("clientId") ?? undefined;

createRoot(document.getElementById("root")!).render(
  <PortfolioHarnessProviders>
    <SelectedClientProvider requestedId={requestedId}>
      <main
        className="page"
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <MeriConversationHost
          enabled
          account={{
            tenantId: "11111111-1111-4111-8111-111111111111",
            actorId: "22222222-2222-4222-8222-222222222222",
          }}
          firstChatBootstrapEnabled
        />
      </main>
    </SelectedClientProvider>
  </PortfolioHarnessProviders>,
);
