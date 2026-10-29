import { useState } from "react";
import { createRoot } from "react-dom/client";
import { AiSettingsOverlay } from "@/features/onboard/pages/setup/AiSettingsOverlay";
import { PortfolioHarnessProviders } from "./portfolio-harness-providers";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "@/features/onboard/onboard.css";
import "./test-font.css";

function Harness() {
  const [open, setOpen] = useState(true);
  const [completed, setCompleted] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open firm setup</button>
      <p role="status">{completed ? "Setup completed" : "Setup incomplete"}</p>
      {open && (
        <AiSettingsOverlay
          orgName="Synthetic firm"
          onClose={() => setOpen(false)}
          onComplete={() => {
            setCompleted(true);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <PortfolioHarnessProviders>
    <Harness />
  </PortfolioHarnessProviders>,
);
