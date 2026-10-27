import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { CalendarHeader } from "../src/features/modules/calendar/CalendarControls";
import { CalendarScreen } from "../src/features/modules/calendar/CalendarScreen";
import type { SelectedClient } from "../src/shared/session/SelectedClient";

const fixture = vi.hoisted(() => ({
  scope: { state: "no-selection" } as SelectedClient,
  query: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("date=2026-10-27&view=month"),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => fixture.scope,
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (...args: unknown[]) => fixture.query(...args),
}));
vi.mock("../src/features/modules/calendar/useAgendaSources", () => ({
  useAgendaSources: () => ({ items: [], warnings: [], loading: false }),
}));
vi.mock("../src/features/modules/calendar/CalendarGrid", () => ({
  CalendarGrid: () => null,
}));
vi.mock("../src/shared/meetings/CreateMeeting", () => ({
  CreateMeeting: () => null,
}));
vi.mock("../src/shared/meetings/MeetingDetail", () => ({
  MeetingDetail: () => null,
}));

vi.mock("../src/shared/shell/ModuleBreadcrumb", () => ({
  ModuleBreadcrumb: () => null,
}));

it.each([
  { clientId: "", clientName: "Master view", title: "Master calendar" },
  {
    clientId: "synthetic-client",
    clientName: "Synthetic client",
    title: "Synthetic client calendar",
  },
  {
    clientId: "",
    clientName: "An earlier selection",
    title: "Master calendar",
  },
])(
  "titles the current resolved scope as $title",
  ({ clientId, clientName, title }) => {
    const html = renderToStaticMarkup(
      createElement(CalendarHeader, {
        clients: clientId
          ? [
              {
                id: clientId,
                name: clientName,
                status: "active",
                profileStatus: "ACTIVE",
              },
            ]
          : [],
        clientId,
        clientName,
        disabled: false,
        canCreate: false,
        onClient: vi.fn(),
        onCreate: vi.fn(),
      }),
    );
    expect(html).toContain(`<h1>${title}</h1>`);
    expect(html).toContain(`<summary>${title}</summary>`);
    expect(html).toContain('aria-label="Calendar client scope"');
    expect(html).toMatch(/<button[^>]*disabled/);
  },
);

it.each([false, true])(
  "keeps header, region and meetings query on the verified scope when picker read fails (client=%s)",
  (clientSelected) => {
    const client = {
      id: "synthetic-client",
      name: "Verified synthetic client",
      status: "active",
      profileStatus: "ACTIVE" as const,
    };
    fixture.scope = clientSelected
      ? { state: "authorized-client", requestedId: client.id, client }
      : { state: "no-selection" };
    fixture.query.mockReset().mockImplementation((operation: string) => ({
      data: operation === "me.read" ? { role: "standard_user" } : undefined,
      error: operation === "me.read" ? null : new Error("Service unavailable"),
      loading: false,
      reload: vi.fn(),
    }));
    const html = renderToStaticMarkup(createElement(CalendarScreen));
    const title = clientSelected
      ? "Verified synthetic client calendar"
      : "Master calendar";
    expect(html).toContain(`<h1>${title}</h1>`);
    expect(html).toContain(`<summary>${title}</summary>`);
    expect(html).toContain(`aria-label="${title}"`);
    expect(html).toMatch(/aria-label="Calendar client scope"[^>]*disabled/);
    if (clientSelected)
      expect(html).toContain(
        `value="${client.id}" selected="">${client.name}</option>`,
      );
    const meetings = fixture.query.mock.calls.find(
      ([operation]) => operation === "engagement.meetings",
    )?.[1];
    expect(meetings.query).toHaveProperty("from");
    expect(meetings.query).toHaveProperty("to");
    if (clientSelected) expect(meetings.query.clientId).toBe(client.id);
    else expect(meetings.query).not.toHaveProperty("clientId");
    expect(html).toContain("Service unavailable");
  },
);
