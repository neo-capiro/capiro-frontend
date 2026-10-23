import { expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { skillCatalog } from "@capiro/meri-contracts/skill-catalog";
import {
  requireCatalogPin,
  receiveSkillDraft,
  selectSkillDraft,
  skillDraftJournal,
  skillDraftSubmission,
  type SkillWindow,
} from "../src/shared/meri-conversations/skill-draft";
import {
  conversationIntentJournal,
  storedSubmission,
  submissionIdentity,
} from "../src/shared/meri-conversations/query-journal";
import {
  syncMeriTabIdentity,
  clearMeriConversationScope,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import {
  requestedWindow,
  windowFields,
} from "../src/features/meri/skills/skill-window";

// Synthetic local drafts and canonical parsers. No availability receipt, model or runtime call.
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scope = {
  tenantId: id(1),
  actorId: id(2),
  clientId: id(3),
  conversationId: id(4),
};
const context = { ...scope, selectedClientId: scope.clientId, runId: id(5) };
function memoryStorage() {
  const data = new Map<string, string>();
  const storage = {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  } satisfies TabStorage;
  syncMeriTabIdentity(JSON.stringify([scope.tenantId, scope.actorId]), storage);
  return storage;
}
const windows: Record<SkillWindow["basis"], SkillWindow> = {
  "calendar-week": {
    basis: "calendar-week",
    offset: -1,
    timezone: "America/New_York",
    weekStartsOn: "sunday",
  },
  "calendar-month": {
    basis: "calendar-month",
    offset: 0,
    timezone: "Pacific/Auckland",
  },
  "calendar-year": { basis: "calendar-year", offset: -1, timezone: "UTC" },
  "relative-duration": {
    basis: "relative-duration",
    days: 7,
    anchorAt: "2026-03-09T00:00:00Z",
    timezone: "America/New_York",
  },
  explicit: {
    basis: "explicit",
    startInclusive: "2026-03-08T06:30:00Z",
    endExclusive: "2026-03-08T07:30:00Z",
    timezone: "America/New_York",
  },
  "fiscal-year": {
    basis: "fiscal-year",
    year: 2027,
    calendarId: "us-federal",
    stage: "appropriated",
    revisionId: "synthetic-reviewed-revision",
    timezone: "America/New_York",
  },
  unbounded: { basis: "unbounded" },
};

it("uses all 14 canonical identities and every exact published version without granting availability", () => {
  expect(new Set(skillCatalog.skills.map((row) => row.skillId)).size).toBe(14);
  expect(skillCatalog.skills).toHaveLength(15);
  expect(skillCatalog.skills.every((row) => row.available === false)).toBe(
    true,
  );
});

for (const entry of skillCatalog.skills) {
  for (const basis of entry.windowBases) {
    it(`${entry.skillId}@${entry.skillVersion}/${basis} retains original bytes across draft reload and uncertain command recovery`, () => {
      const storage = memoryStorage(),
        windowRequest = windows[basis as SkillWindow["basis"]];
      const draft = receiveSkillDraft({
        ...selectSkillDraft(entry),
        windowRequest,
      });
      skillDraftJournal(scope, storage).write(draft);
      const recovered = skillDraftJournal(scope, storage).read()!;
      expect(recovered).toEqual(draft);
      expect(Object.isFrozen(recovered.skill)).toBe(true);
      const input = skillDraftSubmission(recovered, {
        requestId: id(6),
        prompt: "A synthetic unsent goal",
      });
      expect(input).toEqual({
        requestId: id(6),
        prompt: "A synthetic unsent goal",
        skill: { skillId: entry.skillId, skillVersion: entry.skillVersion },
        windowRequest,
      });
      const first = new QueryClient(),
        second = new QueryClient();
      try {
        conversationIntentJournal(first, context, storage).write({
          submit: { ...input, workflow: "initial", state: "pending" },
        });
        const retained = conversationIntentJournal(
          second,
          context,
          storage,
        ).read().submit!;
        expect(retained).toEqual({
          ...input,
          workflow: "initial",
          state: "unknown",
        });
        const stored = {
          ...input,
          skill: draft.skill,
          windowRequest,
          window: null,
        };
        expect(submissionIdentity(storedSubmission(stored))).toBe(
          submissionIdentity(input),
        );
        expect(requestedWindow(windowFields(windowRequest))).toEqual(
          windowRequest,
        );
      } finally {
        first.clear();
        second.clear();
      }
    });
  }
  it(`${entry.skillId}@${entry.skillVersion} refuses pin substitution and unsupported windows`, () => {
    const draft = selectSkillDraft(entry);
    for (const key of [
      "skillId",
      "skillVersion",
      "manifestSha256",
      "proseSha256",
      "catalogSha256",
    ] as const)
      expect(() =>
        receiveSkillDraft({
          ...draft,
          skill: { ...draft.skill, [key]: "substituted" },
        }),
      ).toThrow();
    const unsupported = Object.keys(windows).find(
      (basis) => !entry.windowBases.includes(basis),
    );
    if (unsupported)
      expect(() =>
        receiveSkillDraft({
          ...draft,
          windowRequest: windows[unsupported as SkillWindow["basis"]],
        }),
      ).toThrow();
    expect(() =>
      skillDraftSubmission(draft, { requestId: id(6), prompt: "unsent" }),
    ).toThrow();
  });
}

it("scope changes never transplant a draft; revoked conversation and replaced identity retire old handles", () => {
  const storage = memoryStorage(),
    owner = skillDraftJournal(scope, storage),
    draft = selectSkillDraft(skillCatalog.skills[0]!);
  owner.write(draft);
  for (const other of [
    { ...scope, clientId: id(9) },
    { ...scope, clientId: null },
    { ...scope, conversationId: id(9) },
    { ...scope, actorId: id(9) },
    { ...scope, tenantId: id(9) },
  ])
    expect(skillDraftJournal(other, storage).read()).toBeUndefined();
  clearMeriConversationScope(scope, storage);
  expect(() => owner.write(draft)).toThrow();
  const reopened = skillDraftJournal(scope, storage);
  reopened.write(draft);
  syncMeriTabIdentity("another-current-actor", storage);
  expect(() => reopened.read()).toThrow();
  expect(() => reopened.write(draft)).toThrow();
});

it("does not silently replace the older bill-watch version with the newer version", () => {
  const old = skillCatalog.skills.find(
    (row) =>
      row.skillId === "quick_skill.bill_watch" && row.skillVersion === "1.0.0",
  )!;
  expect(requireCatalogPin(selectSkillDraft(old).skill)).toBe(old);
  expect(() =>
    requireCatalogPin({
      ...selectSkillDraft(old).skill,
      skillVersion: "1.0.1",
    }),
  ).toThrow();
});

it("rejects malformed and incomplete window input and preserves explicit DST and fiscal revision requests", () => {
  const entry = skillCatalog.skills.find(
    (row) => row.skillId === "quick_skill.commitments_audit",
  )!;
  const selected = selectSkillDraft(entry);
  for (const windowRequest of [
    undefined,
    { basis: "calendar-week", offset: 0, timezone: "America/New_York" },
    { ...windows.explicit, unexpected: true },
    requestedWindow({ basis: "calendar-month", offset: "", timezone: "UTC" }),
  ])
    expect(() => receiveSkillDraft({ ...selected, windowRequest })).toThrow();
  expect(requestedWindow(windowFields(windows.explicit))).toEqual(
    windows.explicit,
  );
  expect(requestedWindow(windowFields(windows["fiscal-year"]))).toEqual(
    windows["fiscal-year"],
  );
});
