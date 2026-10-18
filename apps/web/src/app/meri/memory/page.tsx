import { MemoryOwnerInbox } from "../../../features/meri/memory-review/MemoryOwnerInbox";
import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";

export default function MeriMemoryPage() {
  return (
    <ProductShell section="memory">
      <RequireSession>
        <MemoryOwnerInbox
          enabled={process.env.MERI_MEMORY_OWNER_REVIEW_ENABLED === "true"}
        />
      </RequireSession>
    </ProductShell>
  );
}
