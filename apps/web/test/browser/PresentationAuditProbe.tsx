import type { ActionQueryResponse } from "@capiro/meri-contracts/action-application";
import { MemoryReviewDetail } from "../../src/features/settings/memory/review/MemoryReviewDetail";
import { RecommendationList } from "../../src/features/meri/actions/RecommendationList";
import { recommendationPage } from "../../src/shared/meri-actions/projection";
import wire from "../../tests/fixtures/meri-actions/query.json";

/** Local synthetic display fixture; no production route or action transport. */
export function PresentationAuditProbe({
  reviewId,
}: {
  reviewId: string | null;
}) {
  const query = structuredClone(
    wire.response,
  ) as unknown as ActionQueryResponse;
  const result = query.observation.result;
  result.actions = [];
  result.returned = result.total = result.coverage.returnedCount = 0;
  return (
    <div style={{ padding: 24, minWidth: 0 }}>
      <p>Explicit synthetic presentation fixture</p>
      {reviewId ? (
        <MemoryReviewDetail requestId={reviewId} />
      ) : (
        <RecommendationList
          page={recommendationPage(query, () => ({}))}
          selected={null}
          disabled={false}
          onSelect={() => {
            throw new Error("Empty recommendations cannot be selected");
          }}
        />
      )}
    </div>
  );
}
