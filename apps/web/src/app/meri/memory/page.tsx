import { MemoryOwnerInbox } from "../../../features/meri/memory-review/MemoryOwnerInbox";
import { MemoryCorrectionComposer } from "../../../features/meri/memory-review/MemoryCorrectionComposer";
import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";

/** Figma 05.04 recall first; pending owner decisions (06.02) follow on the same route. */
export default function MeriMemoryPage() {
  const enabled = process.env.MERI_MEMORY_OWNER_REVIEW_ENABLED === "true";
  return (
    <ProductShell section="memory" designTarget="1064:147042">
      <RequireSession>
        <MemoryCorrectionComposer enabled={enabled} />
        <MemoryOwnerInbox enabled={enabled} />
      </RequireSession>
    </ProductShell>
  );
}
