import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import {
  profileSubjectSchema,
  profileBuildKey,
  sameProfileSubject,
  ProfileBuildProgress,
  ProfileSourceList,
} from "../src/features/portfolio/profile-build/public";
import type { ProfileBuildTask } from "../src/features/portfolio/profile-build/build-progress";

const id = "a0000000-0000-4000-8000-000000000001";
const actor = { tenantId: "synthetic-tenant", userId: "synthetic-person" };
const task: ProfileBuildTask = {
  id,
  label: "Registration",
  status: "failed",
  attempt: 2,
  maxAttempts: 2,
  reportedError: true,
  retryAllowed: true,
};
afterEach(() => vi.unstubAllGlobals());

it("separates client/prospect and tenant/actor cache lifetimes even for the same id", () => {
  const client = profileSubjectSchema.parse({ kind: "client", id });
  const prospect = profileSubjectSchema.parse({ kind: "prospect", id });
  expect(sameProfileSubject(client, prospect)).toBe(false);
  expect(sameProfileSubject(client, { ...client })).toBe(true);
  const keys = [
    profileBuildKey(client, actor),
    profileBuildKey(prospect, actor),
    profileBuildKey(client, { ...actor, tenantId: "another-tenant" }),
    profileBuildKey(client, { ...actor, userId: "another-person" }),
  ].map((key) => JSON.stringify(key));
  expect(new Set(keys).size).toBe(4);
  expect(
    profileSubjectSchema.safeParse({ kind: "client", id, prospectId: id })
      .success,
  ).toBe(false);
  expect(
    profileSubjectSchema.safeParse({ kind: "organization", id }).success,
  ).toBe(false);
});

it.each(["running", "completed", "partial", "failed", "cancelled"] as const)(
  "renders durable %s status without changing it, starting research or guessing progress",
  (status) => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const tasks = [structuredClone(task)];
    const before = structuredClone(tasks);
    const retry = vi.fn(),
      cancel = vi.fn();
    const html = renderToStaticMarkup(
      createElement(ProfileBuildProgress, {
        status,
        tasks,
        busy: false,
        onRetry: retry,
        onCancel: cancel,
      }),
    );
    expect(html).toContain(status);
    expect(html).toContain("Registration");
    expect(html).toContain("Attempt 2 of 2");
    expect(html).not.toContain("100%");
    expect(html.includes("Cancel run")).toBe(status === "running");
    expect(tasks).toEqual(before);
    expect(fetcher).not.toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  },
);

it.each(["busy", "unsupported", "cancelled", "no-command"])(
  "keeps failed-source retry disabled when %s",
  (reason) => {
    const html = renderToStaticMarkup(
      createElement(ProfileBuildProgress, {
        status: reason === "cancelled" ? "cancelled" : "partial",
        tasks: [{ ...task, retryAllowed: reason !== "unsupported" }],
        busy: reason === "busy",
        onRetry: reason === "no-command" ? undefined : vi.fn(),
      }),
    );
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Retry task<\/button>/);
  },
);

it("retains source/date/excerpt metadata and never links unsafe evidence", () => {
  const evidence = [
    {
      label: "Synthetic official filing",
      url: "https://example.com/filing",
      excerpt: "Recorded evidence",
      observedAt: "2026-11-04T00:00:00Z",
      source: "Official filing",
      metadata: "original retained metadata",
    },
    { label: "Unsafe source", url: "javascript:alert(1)" },
    {
      label: "Credential source",
      url: "https://private:credential@example.com/",
    },
  ];
  const before = structuredClone(evidence);
  const html = renderToStaticMarkup(
    createElement(ProfileSourceList<(typeof evidence)[number]>, {
      evidence,
      details: (source: (typeof evidence)[number]) => source.metadata,
    }),
  );
  expect(html).toContain('href="https://example.com/filing"');
  for (const text of [
    "Recorded evidence",
    "2026-11-04T00:00:00Z",
    "Official filing",
    "original retained metadata",
    "Unsafe source",
    "Credential source",
  ])
    expect(html).toContain(text);
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("private:credential");
  expect(evidence).toEqual(before);
});

it("reports absent source evidence without fabricating citations", () => {
  const html = renderToStaticMarkup(
    createElement(ProfileSourceList, { evidence: [] }),
  );
  expect(html).toContain("No source evidence was supplied.");
  expect(html).not.toContain("href=");
});
