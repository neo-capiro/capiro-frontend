import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readTaskCommandConfig } from "../../../shared/meri-task-commands/config";
import { MeriTaskUpdateHost } from "./MeriTaskUpdateHost";

export default function MeriTaskUpdatesPage() {
  return (
    <ProductShell>
      <RequireSession>
        <MeriTaskUpdateHost
          enabled={readTaskCommandConfig(process.env).enabled}
        />
      </RequireSession>
    </ProductShell>
  );
}
