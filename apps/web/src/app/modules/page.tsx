import { ConnectedModule } from "../../shared/shell/ConnectedModule";
import { ModuleHub } from "../../features/modules/hub/ModuleHub";
import { isQualifiedCorePreviewReadEnabled } from "../../shared/preview/read-config.server";
export const dynamic = "force-dynamic";

export default function ModulesPage() {
  return (
    <ConnectedModule active="hub">
      <ModuleHub
        previewCoreReadOnly={isQualifiedCorePreviewReadEnabled(process.env)}
      />
    </ConnectedModule>
  );
}
