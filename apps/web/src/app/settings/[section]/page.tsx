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
        section={section === "preferences" ? "meri-preferences" : section}
        meriPreferences={
          <MeriPreferencesPanel
            userPreferencesEnabled={
              process.env.MERI_USER_PREFERENCES_ENABLED === "true"
            }
          />
        }
      />
    </ConnectedModule>
  );
}
