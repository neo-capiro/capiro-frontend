import type {
  FederalCompilerSource,
  FederalDraftOperationEcfa206F,
} from "@capiro/meri-contracts/federal-workbench";
import { federalTextHash } from "./federal-workbench";

/** One amendment the user is authoring, before its exact hashes are derived. */
export type AuthoredInput = Readonly<{
  id: string;
  kind: "replace" | "insert" | "delete";
  scopeId: string;
  expectedText: string;
  text?: string;
  position?: "before" | "after";
}>;
export type AuthoredOperation = FederalDraftOperationEcfa206F;
export type AuthoredScope = Readonly<{
  id: string;
  label: string;
  current: string;
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
  "Removing the complete source is not supported: the retained export contract has no typed empty result.";
const BLANK = "Enter the exact text to find.";

type ScopeState = {
  id: string;
  label: string;
  start: number;
  end: number;
  ancestors: readonly string[];
  current: string;
  changedBy: string[];
  invalidated: boolean;
};

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
  input: AuthoredInput,
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
  const at = target.current.indexOf(input.expectedText);
  if (at < 0) return MISSING;
  if (target.current.indexOf(input.expectedText, at + 1) >= 0) return AMBIGUOUS;
  if (input.kind === "replace" && input.text === input.expectedText)
    return UNCHANGED;
  return null;
}

function splice(input: AuthoredInput, current: string) {
  const at = current.indexOf(input.expectedText);
  const start =
    input.kind === "insert" && input.position === "after"
      ? at + input.expectedText.length
      : at;
  const end = input.kind === "insert" ? start : at + input.expectedText.length;
  const replacement = input.kind === "delete" ? "" : (input.text ?? "");
  return current.slice(0, start) + replacement + current.slice(end);
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
    const target = scopes.find((scope) => scope.id === input.scopeId);
    if (!target) return answer(UNKNOWN);
    const refusal = refusalFor(scopes, target, input);
    if (refusal) return answer(refusal);
    const next = splice(input, target.current);
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
  return operations.map((operation) => ({
    id: operation.id,
    kind: operation.kind,
    scopeId: operation.scopeId,
    expectedText: operation.expectedText,
    ...(operation.text === undefined ? {} : { text: operation.text }),
    ...(operation.position === undefined
      ? {}
      : { position: operation.position }),
  }));
}
