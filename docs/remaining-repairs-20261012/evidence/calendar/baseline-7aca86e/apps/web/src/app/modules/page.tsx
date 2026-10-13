import { ConnectedModule } from "../../shared/shell/ConnectedModule";
import { ModuleHub } from "../../features/modules/hub/ModuleHub";
export const dynamic = "force-dynamic";

export default function ModulesPage() {
  return (
    <ConnectedModule active="hub">
      <ModuleHub />
    </ConnectedModule>
  );
}
