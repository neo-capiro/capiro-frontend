import { useState } from "react";
import { createRoot } from "react-dom/client";
import { skipToken, useQuery } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { MeetingForm } from "@/features/portfolio/calendar/MeetingForm";
import type { Meeting } from "@/features/portfolio/calendar/contracts";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";
import { clientId } from "./fixtures";
const meeting: Meeting = {
  id: "meeting-one",
  subject: "Synthetic meeting",
  description: null,
  location: "Old location",
  startsAt: "2026-10-10T14:00:00Z",
  endsAt: "2026-10-10T15:00:00Z",
  status: "scheduled",
  joinLink: null,
  visibility: "private",
  isVirtual: false,
  meri: null,
  client: { id: "client-one", name: "Synthetic" },
  attendees: [],
  preps: [],
};
function Harness() {
  const [open, setOpen] = useState(true);
  const mode = new URLSearchParams(location.search).get("mode");
  const currentMeeting =
    mode === "create"
      ? undefined
      : mode === "clear"
        ? { ...meeting, client: { id: clientId, name: "Synthetic" } }
        : meeting;
  // This receipt-only harness starts from an already confirmed meeting read.
  useQuery({
    queryKey: ["meeting", meeting.id],
    queryFn: skipToken,
    initialData: currentMeeting,
    enabled: false,
  });
  return (
    <main>
      <h1>Synthetic meeting receipt review</h1>
      <MeetingForm
        open={open}
        onOpenChange={setOpen}
        clientId={
          mode === "clear" || mode === "create" ? undefined : "client-one"
        }
        zone="UTC"
        meeting={currentMeeting}
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <Harness />
  </DataProvider>,
);
