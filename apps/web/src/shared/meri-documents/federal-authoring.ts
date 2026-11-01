import {
  applyDecodedXmlEdit,
  decodeXmlTextRun,
  type FederalCompilerSource,
  type FederalDraftOperationEcfa206F,
} from "@capiro/meri-contracts/federal-workbench";
import { federalTextHash } from "./federal-workbench";

/** One amendment the user is authoring, before its exact hashes are derived. */
type TextAmendmentInput = Readonly<{
  id: string;
  kind: "replace" | "insert" | "delete";
  scopeId: string;
  expectedText: string;
  text?: string;
  position?: "before" | "after";
  textMode?: "decoded-xml";
}>;
export type AuthoredInput =
  | TextAmendmentInput
  | Readonly<{ id: string; kind: "remove_source_text" }>;
export type AuthoredOperation = FederalDraftOperationEcfa206F;
export type AuthoredScope = Readonly<{
  id: string;
  label: string;
  current: string;
  decoded?: string | null;
  changedBy: readonly string[];
  invalidated: boolean;
}>;
export type Authoring = Readonly<{
  operations: readonly AuthoredOperation[];
  scopes: readonly AuthoredScope[];
  refusal: string | null;
}>;

const UNKNOWN = "Choose an exact source section.";
const INVALIDATED =
  "An amendment consumed the text that identifies this section. Remove that amendment to author here again.";
const INTERLEAVED =
  "This section changes as part of another section's amendment, so its exact intermediate hash can only come from the compiler. Prepare the current amendments first.";
const MISSING = "The exact text is not in the selected section.";
const AMBIGUOUS =
  "The exact text appears more than once in the selected section.";
const UNCHANGED = "The replacement is identical to the exact text to find.";
const EMPTY =
  "Use the explicit whole-source removal action to propose an empty consolidated result.";
const BLANK = "Enter the exact text to find.";

type ScopeState = {
  id: string;
  label: string;
  start: number;
  end: number;
  ancestors: readonly string[];
  current: string;
  runKind?: "text" | "cdata";
  changedBy: string[];
  invalidated: boolean;
};

function decodedCurrent(scope: ScopeState) {
  if (!scope.runKind) return undefined;
  try {
    return decodeXmlTextRun(scope.current, scope.runKind).decoded;
  } catch {
    return null;
  }
}

/** Text outside every declared scope cannot be amended, so it also has to be
 * empty before a set of amendments can remove the complete source. */
function gapFree(source: Readonly<FederalCompilerSource>) {
  const ordered = [...source.scopes].sort(
    (left, right) => left.start - right.start,
  );
  let cursor = 0;
  for (const scope of ordered) {
    if (source.text.slice(cursor, scope.start).length) return false;
    cursor = Math.max(cursor, scope.end);
  }
  return source.text.slice(cursor).length === 0;
}

/** The exact-text faults the canonical compiler refuses, reported before the
 * request so the author sees them while editing. */
function refusalFor(
  scopes: readonly ScopeState[],
  target: ScopeState,
  input: TextAmendmentInput,
) {
  if (
    target.invalidated ||
    target.ancestors.some(
      (id) => scopes.find((scope) => scope.id === id)?.invalidated,
    )
  )
    return INVALIDATED;
  if (
    scopes.some(
      (other) =>
        other.id !== target.id &&
        other.changedBy.length > 0 &&
        (other.ancestors.includes(target.id) ||
          target.ancestors.includes(other.id)),
    )
  )
    return INTERLEAVED;
  if (!input.expectedText.length) return BLANK;
  const current =
    input.textMode === "decoded-xml" ? decodedCurrent(target) : target.current;
  if (current === undefined)
    return "Decoded editing requires a declared XML text run.";
  if (current === null)
    return "This text run no longer maps to decoded text. Remove the raw XML amendment before editing decoded text here.";
  const at = current.indexOf(input.expectedText);
  if (at < 0) return MISSING;
  if (current.indexOf(input.expectedText, at + 1) >= 0) return AMBIGUOUS;
  if (input.kind === "replace" && input.text === input.expectedText)
    return UNCHANGED;
  return null;
}

function splice(input: TextAmendmentInput, current: string) {
  const at = current.indexOf(input.expectedText);
  const start =
    input.kind === "insert" && input.position === "after"
      ? at + input.expectedText.length
      : at;
  const end = input.kind === "insert" ? start : at + input.expectedText.length;
  const replacement = input.kind === "delete" ? "" : (input.text ?? "");
  return current.slice(0, start) + replacement + current.slice(end);
}

/** Only locally admitted, disjoint changed scopes participate. Ancestor/child
 * interleaving has already refused; gaps and unedited bytes remain verbatim. */
function currentSourceText(
  source: Readonly<FederalCompilerSource>,
  scopes: readonly ScopeState[],
) {
  let cursor = 0,
    text = "";
  for (const scope of scopes
    .filter((item) => item.changedBy.length)
    .sort((a, b) => a.start - b.start)) {
    text += source.text.slice(cursor, scope.start) + scope.current;
    cursor = scope.end;
  }
  return text + source.text.slice(cursor);
}

/** Derives the exact current-scope hash, exact-text hash and dependency closure
 * for each authored amendment in order. This is an authoring projection, not a
 * second compiler: it never produces operative, consolidated or redline text and
 * it refuses the same exact-text faults early so the user sees them before the
 * canonical compiler answers. Operations on a section whose text another
 * section's amendment already changed are refused here because only the remote
 * compiler may decide nested intermediate text. */
export async function authoredOperations(
  source: Readonly<FederalCompilerSource>,
  inputs: readonly AuthoredInput[],
): Promise<Authoring> {
  const scopes: ScopeState[] = source.scopes.map((scope) => ({
    id: scope.id,
    label: scope.label,
    start: scope.start,
    end: scope.end,
    ancestors: "ancestorPath" in scope ? scope.ancestorPath : [],
    current: source.text.slice(scope.start, scope.end),
    ...(source.parserVersion === "federal-uslm-xml/3" &&
    "textRun" in scope &&
    scope.textRun
      ? { runKind: scope.textRun.kind }
      : {}),
    changedBy: [],
    invalidated: false,
  }));
  const operations: AuthoredOperation[] = [];
  const answer = (refusal: string | null): Authoring => ({
    operations: Object.freeze(operations),
    scopes: Object.freeze(
      scopes.map((scope) => ({
        id: scope.id,
        label: scope.label,
        current: scope.current,
        ...(scope.runKind ? { decoded: decodedCurrent(scope) } : {}),
        changedBy: Object.freeze([...scope.changedBy]),
        invalidated: scope.invalidated,
      })),
    ),
    refusal,
  });
  const gaps = gapFree(source);
  if (new Set(inputs.map((input) => input.id)).size !== inputs.length)
    return answer("Each amendment must have a unique identity.");
  for (const input of inputs) {
    if (input.kind === "remove_source_text") {
      if (input !== inputs.at(-1))
        return answer(
          "Whole-source removal must be the final amendment. Remove it before adding another amendment.",
        );
      if (!source.coverage.complete)
        return answer(
          "Whole-source removal requires complete source coverage.",
        );
      operations.push({
        id: input.id,
        kind: input.kind,
        expectedSourceSha256: source.sha256,
        expectedTextSha256: await federalTextHash(
          currentSourceText(source, scopes),
        ),
        dependsOn: operations.map((operation) => operation.id),
      });
      return answer(null);
    }
    const target = scopes.find((scope) => scope.id === input.scopeId);
    if (!target) return answer(UNKNOWN);
    const refusal = refusalFor(scopes, target, input);
    if (refusal) return answer(refusal);
    let next: string;
    try {
      next =
        input.textMode === "decoded-xml" && target.runKind
          ? applyDecodedXmlEdit(target.current, target.runKind, {
              ...input,
              ...(input.kind === "insert"
                ? { position: input.position ?? "after" }
                : {}),
            }).text
          : splice(input, target.current);
    } catch {
      return answer(
        "The decoded edit cannot be mapped to this exact XML text run. Check the text and character boundaries.",
      );
    }
    const emptied =
      gaps &&
      scopes.every(
        (scope) => (scope.id === target.id ? next : scope.current) === "",
      );
    if (emptied) return answer(EMPTY);
    operations.push({
      id: input.id,
      kind: input.kind,
      scopeId: input.scopeId,
      expectedScopeSha256: await federalTextHash(target.current),
      expectedText: input.expectedText,
      expectedTextSha256: await federalTextHash(input.expectedText),
      ...(input.textMode === undefined ? {} : { textMode: input.textMode }),
      dependsOn: [...target.changedBy],
      ...(input.kind === "delete" ? {} : { text: input.text ?? "" }),
      ...(input.kind === "insert"
        ? { position: input.position ?? "after" }
        : {}),
    });
    target.invalidated = !next.length;
    target.current = next;
    target.changedBy.push(input.id);
  }
  return answer(null);
}

/** Re-reads the exact operations a saved review already carries, so the author
 * continues from the compiler's own hashes rather than a derived guess. */
export function authoredFrom(
  operations: readonly AuthoredOperation[],
): readonly AuthoredInput[] {
  return operations.map((operation) =>
    operation.kind === "remove_source_text"
      ? {
          id: operation.id,
          kind: operation.kind,
        }
      : {
          id: operation.id,
          kind: operation.kind,
          scopeId: operation.scopeId,
          expectedText: operation.expectedText,
          ...(operation.textMode === undefined
            ? {}
            : { textMode: operation.textMode }),
          ...(operation.text === undefined ? {} : { text: operation.text }),
          ...(operation.position === undefined
            ? {}
            : { position: operation.position }),
        },
  );
}
