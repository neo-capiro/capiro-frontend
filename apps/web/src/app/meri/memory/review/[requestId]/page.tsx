import { MemoryReviewDetail } from "../../../../../features/meri/memory-review/MemoryReviewDetail";
import { ProductShell } from "../../../../../shared/shell/ProductShell";
import { RequireSession } from "../../../../../shared/session/SessionContext";

export default async function MemoryReviewPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  return (
    <ProductShell section="memory">
      <RequireSession>
        <MemoryReviewDetail requestId={requestId} />
      </RequireSession>
    </ProductShell>
  );
}
