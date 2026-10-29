import { createRoot } from "react-dom/client";
import { MemoryDraftEditor } from "@/features/settings/memory/drafts/MemoryDraftEditor";
import { PortfolioHarnessProviders } from "./portfolio-harness-providers";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";
createRoot(document.getElementById("root")!).render(
  <PortfolioHarnessProviders>
    <main style={{ maxWidth: 920, margin: "2rem auto" }}>
      <h1>Synthetic private memory drafts</h1>
      <MemoryDraftEditor
        type="firm-soul"
        slug="firm"
        reviewEnabled
        readOnly={new URLSearchParams(location.search).has("read-only")}
      />
    </main>
  </PortfolioHarnessProviders>,
);
