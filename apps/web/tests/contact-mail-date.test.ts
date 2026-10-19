import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactMail } from "../src/features/portfolio/relationships/ContactMail";
import type { MailThread } from "../src/features/portfolio/relationships/email";

const state = vi.hoisted(() => ({
  data: undefined as MailThread[] | undefined,
  isSuccess: false,
  isPending: false,
  isFetching: false,
  error: null as Error | null,
}));
vi.mock("../src/features/portfolio/relationships/email", () => ({
  useContactThreads: () => ({ ...state, refetch: vi.fn() }),
  useMailThread: () => ({
    isSuccess: false,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock("../src/features/portfolio/relationships/MailCompose", () => ({
  MailCompose: () => null,
}));
vi.mock("../src/shared/portfolio/ui/Dialog", () => ({ Dialog: () => null }));

const message: MailThread["messages"][number] = {
  id: "60000000-0000-4000-8000-000000000001",
  subject: "Synthetic stored message",
  fromEmail: "sender@example.test",
  fromName: "Synthetic sender",
  toRecipients: [{ email: "contact@example.test" }],
  ccRecipients: [],
  bodyText: "Stored message body is not part of the history summary",
  sentAt: null,
  receivedAt: "2026-10-08T14:24:00Z",
  createdAt: "2026-10-08T14:25:00Z",
};
const thread: MailThread = {
  id: "70000000-0000-4000-8000-000000000001",
  clientId: "80000000-0000-4000-8000-000000000001",
  subject: "Synthetic funding review",
  snippet: "Synthetic saved summary",
  connectionEmail: "mailbox@example.test",
  participants: [{ email: "contact@example.test" }],
  messages: [message],
};
const render = (email: string | null = "contact@example.test") =>
  renderToStaticMarkup(
    createElement(ContactMail, {
      clientId: thread.clientId!,
      person: { name: "Synthetic contact", title: null, email },
    }),
  );
const dates = (html: string) =>
  Array.from(html.matchAll(/<time dateTime="([^"]+)"/g), ([, value]) => value);

beforeEach(() => {
  Object.assign(state, {
    data: [thread],
    isSuccess: true,
    isPending: false,
    isFetching: false,
    error: null,
  });
});

describe("Contact message history date", () => {
  it("renders the latest returned effective instant beneath its snippet without reordering threads or messages", () => {
    const messages = [
      { ...message, sentAt: "2026-10-09T08:00:00Z" },
      {
        ...message,
        id: "received",
        receivedAt: "2026-10-09T09:30:00-04:00",
      },
      { ...message, id: "older", receivedAt: "2026-10-09T12:00:00Z" },
    ];
    const before = JSON.stringify(messages);
    state.data = [
      { ...thread, messages },
      { ...thread, id: "other", subject: "Second saved thread" },
    ];
    const html = render();
    expect(dates(html)).toEqual([
      "2026-10-09T09:30:00-04:00",
      "2026-10-08T14:24:00Z",
    ]);
    expect(html.indexOf(thread.snippet!)).toBeLessThan(html.indexOf("<time"));
    expect(html.indexOf("<time")).toBeLessThan(
      html.indexOf("Second saved thread"),
    );
    expect(html).toContain("Latest available message date");
    expect(html).toContain(" · ");
    expect(html).not.toContain(message.bodyText);
    expect(JSON.stringify(messages)).toBe(before);
  });

  it("keeps sent, received, then stored creation timestamp precedence", () => {
    state.data = [
      {
        ...thread,
        messages: [{ ...message, sentAt: "2026-10-07T12:00:00Z" }],
      },
      { ...thread, id: "received" },
      {
        ...thread,
        id: "created",
        messages: [{ ...message, receivedAt: null }],
      },
    ];
    expect(dates(render())).toEqual([
      "2026-10-07T12:00:00Z",
      "2026-10-08T14:24:00Z",
      "2026-10-08T14:25:00Z",
    ]);
  });

  it("does not invent a date for an empty or malformed message projection", () => {
    state.data = [
      { ...thread, messages: [] },
      {
        ...thread,
        id: "invalid",
        messages: [{ ...message, receivedAt: "invalid", createdAt: "invalid" }],
      },
    ];
    const html = render();
    expect(dates(html)).toEqual([]);
    expect(html.match(/Date unavailable/g)).toHaveLength(2);
    expect(html).not.toContain("Invalid Date");
  });

  it("ignores unusable instants when an available message has a valid date", () => {
    state.data = [
      {
        ...thread,
        messages: [
          { ...message, receivedAt: "invalid" },
          { ...message, id: "valid" },
        ],
      },
    ];
    expect(dates(render())).toEqual(["2026-10-08T14:24:00Z"]);
  });

  it("preserves explicit empty and no-email states without message dates", () => {
    state.data = [];
    expect(render()).toContain("No accessible messages for this contact.");
    state.data = [thread];
    const noEmail = render(null);
    expect(noEmail).toContain(
      "Add an email address to view mail for this contact.",
    );
    expect(dates(noEmail)).toEqual([]);
    expect(noEmail).not.toContain(thread.subject);
  });

  it("does not expose dates from a previous successful history during loading or a failed current read", () => {
    Object.assign(state, { isSuccess: false, isPending: true });
    expect(render()).toContain('role="status"');
    expect(dates(render())).toEqual([]);
    Object.assign(state, {
      isSuccess: true,
      isPending: false,
      error: new Error("Synthetic current mailbox read failed"),
    });
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).toContain("Synthetic current mailbox read failed");
    expect(dates(html)).toEqual([]);
    expect(html).not.toContain(thread.subject);
  });
});
