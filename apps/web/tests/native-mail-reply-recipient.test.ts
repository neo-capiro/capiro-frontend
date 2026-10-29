import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { NativeMailReply } from "../src/features/portfolio/relationships/thread/NativeMailReply";
import { fullThread } from "./thread-mail-fixture";
const state = vi.hoisted(() => ({ to: [] as { email: string }[] }));
vi.mock("@/shared/portfolio/api/provider", () => ({ useApi: () => ({}) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    isSuccess: true,
    isFetching: false,
    isError: false,
    error: null,
    data: {
      messages: [
        {
          replyContext: { supported: true, operation: "reply", to: state.to },
          replyAllContext: {
            supported: true,
            operation: "reply_all",
            to: state.to,
          },
        },
      ],
    },
  }),
}));
vi.mock("../src/features/portfolio/relationships/MailCompose", () => ({
  MailCompose: () => null,
}));
vi.mock(
  "../src/features/portfolio/relationships/thread/IncomingMailFiles",
  () => ({ IncomingMailFiles: () => null }),
);
beforeEach(() => {
  state.to = [];
});
const props = {
  thread: fullThread,
  busy: false,
  scope: {
    tenantId: fullThread.tenantId,
    userId: "synthetic-owner",
    threadId: fullThread.id,
    clientId: fullThread.clientId!,
  },
  clientId: fullThread.clientId!,
};
it("does not dereference or enable a reply when a supported context lacks a canonical To recipient", () => {
  const html = renderToStaticMarkup(createElement(NativeMailReply, props));
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Reply<\/button>/);
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Reply all<\/button>/);
});
it("labels a verified recipient without relying on the relationship contact", () => {
  state.to = [{ email: "verified@example.test" }];
  const html = renderToStaticMarkup(
    createElement(NativeMailReply, {
      ...props,
      person: {
        name: "Unrelated contact",
        email: "contact@example.test",
        title: null,
      },
    }),
  );
  expect(html).toContain("Reply to verified@example.test");
  expect(html).not.toContain("Reply to Unrelated contact");
});
