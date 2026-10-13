import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readActionConfig } from "../../../shared/meri-actions/config";
import { MeriActionHost } from "./MeriActionHost";

export default function MeriActionsPage() {
  return (
    <ProductShell actionWorkflow>
      <RequireSession>
        <MeriActionHost enabled={readActionConfig(process.env).enabled} />
      </RequireSession>
    </ProductShell>
  );
}
