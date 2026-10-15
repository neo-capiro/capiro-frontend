import { ConnectedModule } from "../../../shared/shell/ConnectedModule";
import { SettingsScreen } from "../../../features/settings";
import { MeriPreferencesPanel } from "../../../features/meri/screens/settings/MeriPreferencesPanel";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return (
    <ConnectedModule settings>
      <SettingsScreen
        section={section}
        meriPreferences={<MeriPreferencesPanel />}
      />
    </ConnectedModule>
  );
}
