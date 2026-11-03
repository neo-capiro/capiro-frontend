import {
  selectorIdentity,
  type ProcedureSelector,
} from "../../../shared/capiro/operations/meri-procedures";

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
 * A label that is only a machine token rather than a name: lower-case words joined by separators, or
 * the same words spelled as the raw id ("Bill analysis", "BILL ANALYSIS", "bill.analysis").
 */
const machineName = /^[a-z0-9]+(?:[_.:-][a-z0-9]+)*$/;
const asId = (value: string) => value.toLowerCase().replace(/[\s_.:-]+/g, "_");

/**
 * The readable name of one procedure.
 *
 * A firm procedure keeps Core's own label, which is the firm's name for it, and never falls back to
 * its record id. A built-in keeps Core's label as well whenever that label is a real name rather than
 * the raw identifier — "Executive briefing" survives, while briefing, bill_analysis and BILL_ANALYSIS
 * all read as the raw id and fall back to the product's own name. A label is presentation only: no
 * selector, eligibility or authority is ever derived from it.
 */
export function procedureName(
  selector: ProcedureSelector,
  label?: string | null,
): string {
  const stated = label?.trim();
  if (selector.source === "firm") return stated || "Your firm procedure";
  if (stated && !machineName.test(stated) && asId(stated) !== selector.id)
    return stated;
  return builtinNames[selector.id] ?? words(selector.id);
}

/**
 * The name to show for an applied procedure: the name the current catalog reported, but only while
 * it belongs to exactly this selector — same source, id or record id, version and digest. A refreshed
 * catalog that changed any of those cannot leave an old name standing, and the caller falls back to
 * the readable name the selector itself carries.
 */
export function currentProcedureLabel(
  selector: ProcedureSelector,
  reported?: { readonly identity: string; readonly text: string },
): string | undefined {
  return reported && selectorIdentity(selector) === reported.identity
    ? reported.text
    : undefined;
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
