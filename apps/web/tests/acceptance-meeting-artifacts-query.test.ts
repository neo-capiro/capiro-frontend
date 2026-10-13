import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ApiClient } from "../src/shared/portfolio/api/http";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { useMeetingNotes } from "../src/features/portfolio/calendar/queries";
import { acceptanceArtifact } from "./browser/acceptance-meeting-artifacts-data";

type Query = {
  queryFn: (context: { signal: AbortSignal }) => Promise<unknown>;
};
const observed = vi.hoisted(() => ({
  api: undefined as ApiClient | undefined,
  query: undefined as Query | undefined,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (query: Query) => {
    observed.query = query;
    return {};
  },
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => observed.api,
}));

beforeEach(() => {
  observed.query = undefined;
  observed.api = undefined;
});
function MeetingNotesQueryProbe({ kind }: { kind: "notes" | "debriefs" }) {
  useMeetingNotes("meeting-one", kind);
  return null;
}
function queryRows(kind: "notes" | "debriefs", rows: unknown[]) {
  const calls: string[] = [];
  observed.api = createApiClient(async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  });
  renderToStaticMarkup(createElement(MeetingNotesQueryProbe, { kind }));
  if (!observed.query)
    throw new Error("The real list hook did not register its query.");
  return {
    calls,
    result: observed.query.queryFn({ signal: new AbortController().signal }),
  };
}
for (const kind of ["notes", "debriefs"] as const) {
  describe(`${kind} actual list query response admission`, () => {
    it("reads only the requested parent route and accepts native saved text", async () => {
      const item = acceptanceArtifact(kind);
      const { result, calls } = queryRows(kind, [item]);
      await expect(result).resolves.toEqual([
        expect.objectContaining({ id: item.id, body: item.body }),
      ]);
      expect(calls).toEqual([
        `/api/backend/core/engagement/meetings/meeting-one/${kind}`,
      ]);
    });
    it.each(["foreign-parent", "duplicate"] as const)(
      "rejects %s before returning saved text",
      async (invalid) => {
        const item = acceptanceArtifact(kind);
        const rows =
          invalid === "duplicate"
            ? [item, { ...item }]
            : [{ ...item, meetingId: "another-meeting" }];
        await expect(queryRows(kind, rows).result).rejects.toThrow();
      },
    );
    it("accepts omitted optional parent echoes on the requested native list route", async () => {
      const item = acceptanceArtifact(kind);
      const rows = [
        {
          id: item.id,
          body: item.body,
          restricted: false,
          confidential: false,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
      ];
      const { result, calls } = queryRows(kind, rows);
      await expect(result).resolves.toEqual(rows);
      expect(calls).toEqual([
        `/api/backend/core/engagement/meetings/meeting-one/${kind}`,
      ]);
    });
    it("keeps actual empty data distinct from malformed success", async () => {
      await expect(queryRows(kind, []).result).resolves.toEqual([]);
      await expect(
        queryRows(kind, [{ id: "incomplete" }]).result,
      ).rejects.toThrow();
    });
  });
}
