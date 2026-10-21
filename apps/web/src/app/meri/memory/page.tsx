import { MemoryOwnerInbox } from "../../../features/meri/memory-review/MemoryOwnerInbox";
import { MemoryCorrectionComposer } from "../../../features/meri/memory-review/MemoryCorrectionComposer";
import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";

export default function MeriMemoryPage() {
  const enabled = process.env.MERI_MEMORY_OWNER_REVIEW_ENABLED === "true";
  return (
    <ProductShell section="memory">
      <RequireSession>
        <MemoryOwnerInbox enabled={enabled} />
        <MemoryCorrectionComposer enabled={enabled} />
      </RequireSession>
    </ProductShell>
  );
}
