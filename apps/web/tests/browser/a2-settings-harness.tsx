import { createRoot } from "react-dom/client";
import { useAuth } from "@clerk/nextjs";
import { SettingsScreen } from "@/features/settings/SettingsScreen";
import { PortfolioHarnessProviders } from "./portfolio-harness-providers";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function Harness() {
  const { userId, sessionId, orgId } = useAuth();
  const section = new URLSearchParams(location.search).get("section") ?? "team";
  // Same signed-in replacement boundary as the application, using synthetic Clerk only.
  return (
    <PortfolioHarnessProviders key={JSON.stringify([userId, sessionId, orgId])}>
      <main data-portfolio-root>
        <SettingsScreen section={section} meriPreferences={null} />
      </main>
    </PortfolioHarnessProviders>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
