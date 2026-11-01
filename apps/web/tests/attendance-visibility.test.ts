import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MeetingIdentity } from "../src/features/portfolio/calendar/MeetingIdentity";
import { MeetingDetail } from "../src/features/portfolio/calendar/MeetingDetail";
import { MeetingAttendance } from "../src/features/portfolio/calendar/attendance/MeetingAttendance";
import type { Meeting } from "../src/features/portfolio/calendar/contracts";

const state = vi.hoisted(() => ({
  readAllowed: true,
  allowed: true,
  pending: false,
  fetching: false,
  error: null as Error | null,
  session: null as { status: string; error: string | null } | null,
  dispatch: vi.fn(),
  meeting: null as Meeting | null,
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
  useMutation: () => ({ isPending: false, mutate: state.dispatch }),
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({ useApi: () => ({}) }));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({
    isSuccess: true,
    data: { tenant: { id: "synthetic" }, user: { id: "synthetic" } },
  }),
}));
vi.mock("../src/features/portfolio/calendar/queries", () => ({
  useMeeting: () => ({
    data: { meeting: state.meeting, unusablePreps: 0 },
    isSuccess: true,
  }),
}));
vi.mock("../src/features/portfolio/calendar/MeetingArtifacts", () => ({
  MeetingArtifacts: () => null,
}));
vi.mock("../src/features/portfolio/calendar/MeetingForm", () => ({
  MeetingForm: () => null,
}));
vi.mock("../src/features/portfolio/calendar/preparation/public", () => ({
  MeetingPreparation: () => null,
}));
vi.mock("../src/features/portfolio/calendar/library/public", () => ({
  MeetingAssignment: () => null,
}));
vi.mock("../src/features/portfolio/calendar/review/public", () => ({
  MeetingAttachmentApprovals: () => null,
}));
vi.mock("../src/features/portfolio/calendar/sharing/MeetingSharing", () => ({
  MeetingSharing: () => null,
}));
vi.mock("../src/shared/portfolio/ui/Dialog", () => ({ Dialog: () => null }));
vi.mock("../src/features/portfolio/calendar/attendance/SendMeriDialog", () => ({
  SendMeriDialog: () => null,
}));
vi.mock("../src/features/portfolio/calendar/useMeetingClock", () => ({
  useMeetingClock: () => Date.parse("2026-11-01T12:00:00Z"),
}));
vi.mock("../src/features/portfolio/calendar/attendance/queries", () => ({
  sessionKey: () => ["synthetic"],
  useAttendanceAccess: () => ({
    readAllowed: state.readAllowed,
    allowed: state.allowed,
    scope: "synthetic",
    guard: vi.fn(),
    identity: {
      isSuccess: true,
      isPending: false,
      isFetching: false,
      error: null,
    },
    capabilities: { isPending: false, error: null },
  }),
  useAttendanceSession: () => ({
    isSuccess: !state.pending && !state.error,
    isPending: state.pending,
    isFetching: state.fetching,
    error: state.error,
    data: state.session,
  }),
}));

const meeting: Meeting = {
  id: "synthetic-meeting",
  subject: "Synthetic meeting",
  startsAt: "2026-11-01T14:00:00Z",
  endsAt: "2026-11-01T15:00:00Z",
  status: "scheduled",
  description: null,
  location: null,
  joinLink: "https://meet.google.com/abc-defg-hij",
  visibility: "private",
  isVirtual: true,
  meri: null,
  client: null,
  attendees: [],
  preps: [],
};
function panel(current = meeting) {
  return renderToStaticMarkup(
    createElement(MeetingAttendance, {
      meeting: current,
      zone: "UTC",
      compact: true,
    }),
  );
}
function sendButton(html: string) {
  return html.match(/<button\b[^>]*>Send Meri<\/button>/)?.[0];
}
beforeEach(() => {
  Object.assign(state, {
    readAllowed: true,
    allowed: true,
    pending: false,
    fetching: false,
    error: null,
    session: null,
  });
  state.dispatch.mockClear();
  state.meeting = meeting;
});
describe("notetaker controls stay discoverable without bypassing admission", () => {
  it.each([
    "2026-11-01T13:00:00Z",
    "2026-11-01T14:30:00Z",
    "2026-11-01T16:00:00Z",
  ])(
    "renders one panel in the actual detail on lifecycle default at %s",
    (now) => {
      vi.spyOn(Date, "now").mockReturnValue(Date.parse(now));
      try {
        const html = renderToStaticMarkup(
          createElement(MeetingDetail, {
            id: meeting.id,
            onClose: vi.fn(),
            zone: "UTC",
            inline: true,
            destinations: {},
          }),
        );
        expect(
          html.match(/aria-label="Meri meeting attendance"/g),
        ).toHaveLength(1);
        expect(sendButton(html)).not.toContain("disabled");
        expect(state.dispatch).not.toHaveBeenCalled();
      } finally {
        vi.restoreAllMocks();
      }
    },
  );
  it.each([false, true])(
    "renders exactly one attendance action in the meeting header, inline=%s",
    (inline) => {
      const html = renderToStaticMarkup(
        createElement(MeetingIdentity, {
          meeting,
          zone: "UTC",
          inline,
          onEdit: vi.fn(),
          onAssign: vi.fn(),
          onShare: vi.fn(),
        }),
      );
      expect(html.match(/>Send Meri<\/button>/g)).toHaveLength(1);
      expect(sendButton(html)).not.toContain("disabled");
      expect(state.dispatch).not.toHaveBeenCalled();
    },
  );
  it("keeps a disabled action and readable failure when the session read fails", () => {
    state.error = new Error("Meri status unavailable");
    const html = panel();
    expect(sendButton(html)).toContain("disabled");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Meri status unavailable");
    expect(html).toContain("Refresh Meri status");
  });
  it("shows pending status rather than a blank compact surface", () => {
    state.pending = true;
    expect(sendButton(panel())).toContain("disabled");
    expect(panel()).toContain("Loading");
  });
  it("explains insufficient current authority without enabling dispatch", () => {
    state.readAllowed = false;
    state.allowed = false;
    expect(sendButton(panel())).toContain("disabled");
    expect(panel()).toContain(
      "Your current role or session cannot access meeting attendance.",
    );
  });
  it("keeps unavailable backend capability explicit", () => {
    state.allowed = false;
    expect(sendButton(panel())).toContain("disabled");
    expect(panel()).toContain(
      "Attendance actions are disabled in this environment.",
    );
  });
  it("shows current attendance and cancellation while a bot is joining", () => {
    state.session = { status: "joining", error: null };
    expect(sendButton(panel())).toContain("disabled");
    expect(panel()).toContain("Cancel Meri attendance");
    expect(panel()).toContain('role="status"');
    expect(state.dispatch).not.toHaveBeenCalled();
  });
  it.each(["cancelled", "canceled", "deleted"])(
    "does not enable a %s meeting",
    (status) => {
      expect(sendButton(panel({ ...meeting, status }))).toContain("disabled");
    },
  );
  it("does not enable a background session refresh", () => {
    state.fetching = true;
    expect(sendButton(panel())).toContain("disabled");
  });
});
