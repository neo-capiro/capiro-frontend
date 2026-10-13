import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readDocumentConfig } from "../../../shared/meri-documents/config";
import { MeriFilesHost } from "./MeriFilesHost";

export default function MeriFilesPage() {
  const config = readDocumentConfig(process.env);
  return (
    <ProductShell documentWorkflow>
      <RequireSession>
        <MeriFilesHost
          enabled={config.enabled}
          operation={config.operation ?? "create_word"}
        />
      </RequireSession>
    </ProductShell>
  );
}
