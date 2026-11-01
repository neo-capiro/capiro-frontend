import { createRoot } from "react-dom/client";
import { ApprovalInboxHost } from "@/features/meri/approvals/ApprovalInboxHost";
import { MeriCapabilitiesProvider } from "@/shared/meri-resources/CapabilityContext";
import { resolveMeriCapabilities } from "@/shared/meri-resources/capabilities";
import { PortfolioHarnessProviders } from "./portfolio-harness-providers";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

/** The live Approvals page body over the scripted Core account and a scripted Meri inbox. */
createRoot(document.getElementById("root")!).render(
  <PortfolioHarnessProviders>
    <MeriCapabilitiesProvider
      value={resolveMeriCapabilities({ conversations: true, approvals: true })}
    >
      <main style={{ maxWidth: 1200, margin: "2rem auto" }}>
        <ApprovalInboxHost enabled />
      </main>
    </MeriCapabilitiesProvider>
  </PortfolioHarnessProviders>,
);
