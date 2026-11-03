/**
 * Focused behavior for the procedure presentation added for VQA-002: a readable name that keeps a
 * name Core authored, a catalog name that applies only to the exact selector it was reported for,
 * and the applied chip that shows it. Selector values, the journal and the sent request are asserted
 * elsewhere and are unchanged here.
 */
import { expect, it } from "vitest";
import { composerChips } from "../src/features/meri/conversation/composer-chips";
import {
  currentProcedureLabel,
  procedureName,
  procedureOptionLabel,
} from "../src/features/meri/conversation/procedure-presentation";
import {
  selectorIdentity,
  type ProcedureSelector,
} from "../src/shared/capiro/operations/meri-procedures";
import type { ConversationSkillSelection } from "../src/shared/meri-conversations/query-journal";

const digest = (seed: string) => seed.repeat(64).slice(0, 64);
const builtin = (id: string, version = 1) =>
  ({
    source: "builtin",
    id,
    version,
    manifestDigest: digest("a"),
  }) as unknown as ProcedureSelector;
const firm = (version = 3) =>
  ({
    source: "firm",
    recordId: "0b7f0e2c-1a44-4c9b-9d2f-2a7b5c1e6f30",
    version,
    manifestDigest: digest("b"),
  }) as unknown as ProcedureSelector;

it("keeps a name Core authored and only replaces the raw identifier", () => {
  expect(procedureName(builtin("bill_analysis"), "bill_analysis")).toBe(
    "Bill analysis",
  );
  expect(procedureName(builtin("bill_analysis"), "BILL_ANALYSIS")).toBe(
    "Bill analysis",
  );
  expect(procedureName(builtin("hearing_prep"), "Executive briefing")).toBe(
    "Executive briefing",
  );
  expect(procedureName(builtin("briefing"))).toBe("Briefing");
  // The same name reaches the option text, with Core's scopes beside it.
  const entry = {
    selector: builtin("hearing_prep"),
    display: { label: "Executive briefing", purpose: null, scopes: ["client"] },
  };
  expect(procedureOptionLabel(entry)).toBe("Executive briefing · client");
});

it("keeps a firm procedure's own label and never shows its record id", () => {
  expect(procedureName(firm(), "Case brief")).toBe("Case brief");
  const unnamed = procedureName(firm(), null);
  expect(unnamed).toBe("Your firm procedure");
  expect(unnamed).not.toContain("0b7f0e2c");
});

it("applies a catalog name only to the exact selector it was reported for", () => {
  const identity = selectorIdentity(firm());
  expect(currentProcedureLabel(firm(), { identity, text: "Case brief" })).toBe(
    "Case brief",
  );
  // A new version or a new digest is a different procedure: the old name does not stand.
  expect(
    currentProcedureLabel(firm(4), { identity, text: "Case brief" }),
  ).toBeUndefined();
  expect(
    currentProcedureLabel(
      { ...firm(), manifestDigest: digest("c") } as ProcedureSelector,
      { identity, text: "Case brief" },
    ),
  ).toBeUndefined();
});

it("names the applied chip from the catalog, and removal still drops only the procedure", () => {
  const selection: ConversationSkillSelection = {
    procedure: firm(),
    work: {
      entry: "start-work",
      jobKind: "research",
      deliverables: [],
      dependencies: [],
    },
  };
  const procedureChip = (label?: string) =>
    composerChips(selection, () => undefined, label).find(
      (candidate) => candidate.key === "procedure",
    )!;
  expect(procedureChip("Case brief").label).toBe("Procedure · Case brief");
  // Without a current catalog name the chip says what it is, never a record id.
  expect(procedureChip().label).toBe("Procedure · Your firm procedure");
  const applied: ConversationSkillSelection[] = [];
  composerChips(selection, (next) => applied.push(next), "Case brief")
    .find((candidate) => candidate.key === "procedure")!
    .onRemove?.();
  expect(applied).toHaveLength(1);
  expect(applied[0]!.procedure).toBeUndefined();
  expect(applied[0]!.work).toEqual(selection.work);
});
