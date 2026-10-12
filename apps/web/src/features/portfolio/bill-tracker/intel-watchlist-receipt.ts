import {
  intelWatchlistForClient,
  type Topic,
  type Watchlist,
  type toIntelWatchlist,
} from "./watchlist-contracts";

type Submitted = ReturnType<typeof toIntelWatchlist>;
type Receipt = Watchlist & { version: number };
const labelKey = (value: string) => value.trim().toLowerCase();
const termKey = (term: Topic["terms"][number]) =>
  JSON.stringify([term.termType, term.value.trim().toLowerCase()]);
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

/** Receipt validation for the published Intel projection, never an endpoint or authority grant.
 * Source: capirov2@4be13b0, TrackerWatchlistService.putWatchlist / term-validation.
 * Rejection metadata must explain a submitted entry; it cannot excuse arbitrary loss.
 */
function explainedTerms(submitted: Submitted, record: Receipt) {
  const rejected = new Set<string>();
  const counts = new Map<string, number>();
  for (const entry of record.rejected?.terms ?? []) {
    const topic = submitted.topics.find(
      (topic) => topic.label.trim() === entry.topicLabel,
    );
    const term = topic?.terms.find(
      (term) =>
        term.termType === entry.termType && term.value.trim() === entry.value,
    );
    if (!term || !term.value || !entry.termType) return null;
    const value = entry.value;
    const shortIdentifier =
      /\d|[./+\-]/.test(value) || /^[A-Z]{2,}$/.test(value);
    const tooShort = value.length < (shortIdentifier ? 2 : 3);
    const reasonMatches = !value
      ? entry.reason === "Term cannot be empty."
      : entry.reason === "Term too short" ||
        entry.reason.startsWith(`"${value}" is too short to match safely.`);
    const key = JSON.stringify([entry.topicLabel, termKey(term)]);
    const count = (counts.get(key) ?? 0) + 1;
    const submittedCount = topic!.terms.filter(
      (candidate) =>
        candidate.termType === entry.termType &&
        candidate.value.trim() === value,
    ).length;
    if (!tooShort || !reasonMatches || count > submittedCount) return null;
    counts.set(key, count);
    rejected.add(key);
  }
  return rejected;
}

function acceptedTopics(
  submitted: Submitted,
  previous: Watchlist,
  record: Receipt,
): Topic[] | null {
  const rejectedTerms = explainedTerms(submitted, record);
  if (!rejectedTerms) return null;
  const live = new Map(
    previous.topics.map((topic) => [labelKey(topic.label), topic]),
  );
  const expected = new Map<string, Topic>();
  const protectedLabels = new Set<string>();
  const seen = new Set<string>();
  const rejections = record.rejected?.topics ?? [];
  const used = new Set<number>();
  for (const [index, topic] of submitted.topics.entries()) {
    const label = topic.label.trim(),
      key = labelKey(label);
    const from = topic.renameFrom?.trim();
    const source = from ? live.get(labelKey(from)) : undefined;
    const collision = Boolean(
      source && labelKey(from!) !== key && live.has(key),
    );
    const reason = !label
      ? "A tag needs a name."
      : seen.has(key) || collision
        ? "Duplicate tag name."
        : key === "hearing terms" && !live.has(key)
          ? '"Hearing terms" is a reserved name.'
          : undefined;
    const rejectionIndex = rejections.findIndex(
      (entry) => entry.index === index,
    );
    if (reason) {
      const rejection = rejections[rejectionIndex];
      if (
        !rejection ||
        rejection.label !== (label || topic.label) ||
        rejection.reason !== reason
      )
        return null;
      used.add(rejectionIndex);
      if (collision && !seen.has(key)) {
        protectedLabels.add(labelKey(from!));
        protectedLabels.add(key);
      }
    } else {
      if (rejectionIndex !== -1) return null;
      const persisted = source ?? live.get(key);
      const terms = new Map<string, Topic["terms"][number]>();
      for (const term of topic.terms) {
        if (!term.value) continue;
        const normalized = { ...term, value: term.value.trim() };
        const rejectedKey = JSON.stringify([label, termKey(normalized)]);
        if (!rejectedTerms.has(rejectedKey) && !terms.has(termKey(normalized)))
          terms.set(termKey(normalized), normalized);
      }
      const accepted = {
        ...topic,
        id: persisted?.id,
        label,
        terms: [...terms.values()],
      };
      expected.set(key, accepted);
      if (source && labelKey(from!) !== key) live.delete(labelKey(from!));
      live.set(key, accepted);
    }
    if (label) seen.add(key);
  }
  if (used.size !== rejections.length) return null;
  for (const key of protectedLabels)
    if (!expected.has(key)) expected.set(key, live.get(key)!);
  return [...expected.values()];
}

function sameTopics(expected: Topic[], actual: Topic[]) {
  if (
    expected.length !== actual.length ||
    new Set(actual.map((topic) => labelKey(topic.label))).size !== actual.length
  )
    return false;
  return expected.every((topic) => {
    const saved = actual.find((item) => item.label === topic.label);
    if (!saved || (topic.id && topic.id !== saved.id)) return false;
    const projection = (item: Topic) => [
      item.label,
      item.issueArea,
      item.position,
      item.priority,
      item.terms
        .map((term) => JSON.stringify([term.termType, term.value]))
        .sort(),
    ];
    return same(projection(topic), projection(saved));
  });
}
export function intelWatchlistReceipt(
  clientId: string,
  submitted: Submitted,
  previous: Watchlist,
) {
  return intelWatchlistForClient(clientId).refine((record) => {
    if (
      record.version !== submitted.expectedVersion + 1 ||
      !same(record.issueAreas, submitted.issueAreas) ||
      !same(
        record.jurisdictions,
        submitted.jurisdictions.map((value) => value.toUpperCase()),
      )
    )
      return false;
    const expected = acceptedTopics(submitted, previous, record);
    return expected !== null && sameTopics(expected, record.topics);
  }, "The returned targeting does not confirm the accepted submitted fields and explicit rejections.");
}
