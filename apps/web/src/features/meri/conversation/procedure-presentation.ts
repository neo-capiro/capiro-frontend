import type { ProcedureSelector } from "../../../shared/capiro/operations/meri-procedures";

type BuiltinProcedureId = Extract<
  ProcedureSelector,
  { source: "builtin" }
>["id"];

/** The parts of one accepted catalog entry this file reads; an accepted catalog is deep-readonly. */
type ProcedureDisplay = {
  readonly selector: ProcedureSelector;
  readonly display: {
    readonly label: string;
    readonly purpose: string | null;
    readonly scopes: readonly string[];
  };
};

/**
 * The product's own names for the six closed built-in procedures.
 *
 * Core answers a built-in with its identifier as the display label, so the readable name is
 * presentation and belongs here. Nothing in this file is consulted for selection, eligibility,
 * access or authorization: the selector, its version and its digest remain the whole identity, and
 * an id this table does not name is still shown as words rather than as the raw token.
 */
const builtinNames: Readonly<Record<BuiltinProcedureId, string>> = {
  briefing: "Briefing",
  draft: "Draft",
  bill_analysis: "Bill analysis",
  hearing_prep: "Hearing preparation",
  coalition_letter: "Coalition letter",
  amendment_tracker: "Amendment tracker",
};

const words = (id: string) =>
  id.replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());

const listWords = (values: readonly string[]) =>
  values.length === 1
    ? values[0]!
    : `${values.slice(0, -1).join(", ")} and ${values.at(-1)!}`;

/**
 * The readable name of one procedure: our own name for a built-in, and Core's own label for a firm
 * procedure. A firm procedure with no label is named by what it is, never by its record id.
 */
export function procedureName(
  selector: ProcedureSelector,
  label?: string | null,
): string {
  if (selector.source === "builtin")
    return builtinNames[selector.id] ?? words(selector.id);
  return label?.trim() || "Your firm procedure";
}

/** The option text: the readable name, plus Core's scopes when it states any. */
export function procedureOptionLabel(entry: ProcedureDisplay): string {
  const name = procedureName(entry.selector, entry.display.label);
  return entry.display.scopes.length > 0
    ? `${name} · ${entry.display.scopes.join(", ")}`
    : name;
}

/**
 * The line under the choice: Core's own purpose for a firm procedure, and the scopes said plainly.
 * No record id, version, digest or exact selector is repeated here.
 */
export function procedureDetail(entry: ProcedureDisplay): string | undefined {
  const parts: string[] = [];
  if (entry.selector.source === "firm" && entry.display.purpose)
    parts.push(entry.display.purpose);
  if (entry.display.scopes.length > 0)
    parts.push(`Available for ${listWords(entry.display.scopes)}`);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
