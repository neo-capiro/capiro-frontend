import type { EngagementMeeting } from "../capiro/operations/engagement";
const labels = { prep: "Prep", notes: "Notes", debrief: "Debrief" };
/** Historical library qualification is distinct from currently approved material. */
export function meetingMaterials(meeting: EngagementMeeting) {
  const qualification = meeting.libraryQualifiedBy;
  if (qualification) {
    const current = qualification
      .filter((item) => item.current)
      .map((item) => labels[item.kind]);
    if (current.length) return current.join(" · ");
    const historical = qualification.map((item) => labels[item.kind]);
    return historical.length
      ? `${historical.join(" · ")} (approved previously)`
      : "No approved materials";
  }
  const current = [
    meeting.preps?.some((prep) => prep.status === "approved") ? "Prep" : null,
    meeting.notesApproved ||
    meeting.notes?.some((note) => note.status === "approved")
      ? "Notes"
      : null,
    meeting.debriefs?.some((debrief) => debrief.status === "approved")
      ? "Debrief"
      : null,
  ].filter(Boolean);
  return current.join(" · ") || "No approved materials";
}
