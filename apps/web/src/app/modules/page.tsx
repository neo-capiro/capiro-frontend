import { ConnectedModule } from "../../shared/shell/ConnectedModule";
import { ModuleHub } from "../../features/modules/hub/ModuleHub";
import { isQualifiedCorePreviewReadEnabled } from "../../shared/preview/read-config.server";
export const dynamic = "force-dynamic";

export default function ModulesPage() {
  const previewCoreReadOnly = isQualifiedCorePreviewReadEnabled(process.env);
  return (
    <ConnectedModule active="hub" readOnlyPreview={previewCoreReadOnly}>
      <ModuleHub previewCoreReadOnly={previewCoreReadOnly} />
    </ConnectedModule>
  );
}
