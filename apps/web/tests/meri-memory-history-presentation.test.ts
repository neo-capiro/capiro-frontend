import { expect, it } from "vitest";
import {
  historyTime,
  historyVersionTitle,
} from "../src/features/meri/memory-review/history-presentation";
import { receiveOwnerHistory } from "../src/features/meri/memory-review/owner-history";

it("uses each historical title or a status fallback without borrowing the current label", () => {
  const reference = {
    kind: "item" as const,
    id: "10000000-0000-4000-8000-000000000007",
  };
  const revision = "2026-11-02T09:00:00.123456Z";
  const result = receiveOwnerHistory(
    {
      schemaVersion: 1,
      anchor: { ...reference, revision },
      availability: "available",
      entries: [
        {
          id: reference.id,
          revision,
          createdAt: revision,
          title: "user:synthetic:briefing-preference",
          status: "current",
          content: {
            availability: "available",
            text: "Synthetic history text.",
          },
        },
      ],
      nextCursor: null,
    },
    reference,
    "versions",
  );
  const entry = result.entries[0]!;
  expect(historyVersionTitle(entry)).toBe("Current version");
  expect(historyVersionTitle({ ...entry, status: "superseded" })).toBe(
    "Superseded version",
  );
  expect(
    historyVersionTitle({ ...entry, title: "Earlier briefing preference" }),
  ).toBe("Earlier briefing preference");
  expect(historyTime(entry.createdAt)).toBe("Nov 2, 2026, 9:00 AM UTC");
  expect(entry.createdAt).toBe(revision);
  expect(entry.revision).toBe(revision);
  expect(result.anchor.revision).toBe(revision);
});
