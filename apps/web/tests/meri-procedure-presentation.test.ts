/**
 * Focused behavior for the procedure presentation added for VQA-002: a readable name that keeps a
 * name Core authored, a catalog name that applies only to the exact selector it was reported for,
 * and the applied chip that shows it. Selector values, the journal and the sent request are asserted
 * elsewhere and are unchanged here.
 */
import { expect, it } from "vitest";
import { CONVERSATION_SKILLS } from "@capiro/meri-contracts/conversation-application";
import { composerChips } from "../src/features/meri/conversation/composer-chips";
import {
  currentProcedureLabel,
  procedureName,
  procedureOptionLabel,
  rememberedProcedureLabel,
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

it("keeps every label Core answered except the raw identifier itself", () => {
  // The raw id in another case or separator is still the id: the product's name is shown.
  expect(procedureName(builtin("bill_analysis"), "bill_analysis")).toBe(
    "Bill analysis",
  );
  expect(procedureName(builtin("bill_analysis"), "BILL_ANALYSIS")).toBe(
    "Bill analysis",
  );
  expect(procedureName(builtin("briefing"), "briefing")).toBe("Briefing");
  // Any other name is Core's, including one lowercase word and a multiword name.
  expect(procedureName(builtin("briefing"), "overview")).toBe("overview");
  expect(procedureName(builtin("hearing_prep"), "Executive briefing")).toBe(
    "Executive briefing",
  );
  // An absent or blank label falls back to the product's own name.
  expect(procedureName(builtin("briefing"))).toBe("Briefing");
  expect(procedureName(builtin("briefing"), "   ")).toBe("Briefing");
  // The same words reach the option text, with Core's scopes beside them.
  expect(
    procedureOptionLabel({
      selector: builtin("briefing"),
      display: { label: "overview", purpose: null, scopes: ["general"] },
    }),
  ).toBe("overview · general");
  expect(
    procedureOptionLabel({
      selector: builtin("briefing"),
      display: { label: "briefing", purpose: null, scopes: [] },
    }),
  ).toBe("Briefing");
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

it("resolves the name against the effective selection, not a local draft", () => {
  const owner = { draft: "first" };
  const remembered = {
    owner,
    identity: selectorIdentity(firm()),
    text: "Case brief",
  };
  const local: ConversationSkillSelection = { procedure: firm() };
  // A fresh draft has no local selection; the session composes the saved accepted request instead,
  // and that effective selection still finds the name the picker reported.
  const accepted: ConversationSkillSelection = { procedure: firm() };
  expect(rememberedProcedureLabel(accepted, owner, remembered)).toBe(
    "Case brief",
  );
  // A local selection of the same procedure resolves the same way.
  expect(rememberedProcedureLabel(local, owner, remembered)).toBe("Case brief");
  // Clearing the procedure leaves no name to show.
  expect(rememberedProcedureLabel({}, owner, remembered)).toBeUndefined();
  // A replaced draft owner (scope switch, expiry, discard) never resurrects the old name.
  expect(
    rememberedProcedureLabel(accepted, { draft: "second" }, remembered),
  ).toBeUndefined();
  // A different version or digest is a different procedure.
  expect(
    rememberedProcedureLabel({ procedure: firm(4) }, owner, remembered),
  ).toBeUndefined();
  // A skill-only selection carries no procedure name.
  expect(
    rememberedProcedureLabel(
      {
        skill: {
          skillId: CONVERSATION_SKILLS[0]!.skillId,
          skillVersion: CONVERSATION_SKILLS[0]!.version,
        },
      },
      owner,
      remembered,
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
