import { ConnectedModule } from "../../../shared/shell/ConnectedModule";
import { SettingsScreen } from "../../../features/settings";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return (
    <ConnectedModule settings>
      <SettingsScreen section={section} />
    </ConnectedModule>
  );
}
