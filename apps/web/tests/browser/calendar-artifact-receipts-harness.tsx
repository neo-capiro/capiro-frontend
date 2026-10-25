import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { MeetingArtifacts } from "@/features/portfolio/calendar/MeetingArtifacts";
import type { Meeting } from "@/features/portfolio/calendar/contracts";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function Harness() {
  const [clientId, setClient] = useState(
    "10000000-0000-4000-8000-000000000001",
  );
  const [visible, setVisible] = useState(true);
  const kind =
    new URLSearchParams(location.search).get("kind") === "debriefs"
      ? "debriefs"
      : "notes";
  const meeting: Meeting = {
    id: "91000000-0000-4000-8000-000000000001",
    updatedAt: "2026-10-10T13:00:00.000Z",
    subject: "Synthetic receipt review",
    description: null,
    location: null,
    startsAt: "2026-10-10T14:00:00Z",
    endsAt: "2026-10-10T15:00:00Z",
    status: "scheduled",
    joinLink: null,
    visibility: "private",
    isVirtual: false,
    meri: null,
    client: { id: clientId, name: clientId },
    attendees: [],
    preps: [],
  };
  return (
    <main style={{ padding: 24 }}>
      <h1>Synthetic artifact receipt review</h1>
      <button
        onClick={() =>
          setClient(
            clientId === "10000000-0000-4000-8000-000000000001"
              ? "10000000-0000-4000-8000-000000000002"
              : "10000000-0000-4000-8000-000000000001",
          )
        }
      >
        Replace client
      </button>
      <button onClick={() => setVisible(!visible)}>Toggle artifacts</button>
      <p>Current client: {clientId}</p>
      {visible && <MeetingArtifacts meeting={meeting} kind={kind} />}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <Harness />
  </DataProvider>,
);
