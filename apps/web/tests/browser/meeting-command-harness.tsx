import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { MeetingForm } from "@/features/portfolio/calendar/MeetingForm";
import { MeetingArtifacts } from "@/features/portfolio/calendar/MeetingArtifacts";
import { MeetingSharing } from "@/features/portfolio/calendar/sharing/MeetingSharing";
import { commandMeeting } from "./meeting-command-data";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";
function Harness() {
  const [open, setOpen] = useState(true);
  const mode = new URLSearchParams(location.search).get("mode");
  return (
    <main>
      <h1>Synthetic durable meeting action</h1>
      {!open && <p>Action acknowledged</p>}
      {mode === "artifact" ? (
        <MeetingArtifacts meeting={commandMeeting} kind="notes" />
      ) : mode === "sharing" ? (
        open && (
          <MeetingSharing
            meeting={commandMeeting}
            onClose={() => setOpen(false)}
          />
        )
      ) : (
        <MeetingForm
          open={open}
          onOpenChange={setOpen}
          clientId={commandMeeting.client.id}
          zone="UTC"
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <Harness />
  </DataProvider>,
);
