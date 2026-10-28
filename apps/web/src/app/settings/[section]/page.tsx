import { ConnectedModule } from "../../../shared/shell/ConnectedModule";
import { SettingsScreen } from "../../../features/settings";
import { MeriPreferencesPanel } from "../../../features/meri/screens/settings/MeriPreferencesPanel";
import { SupportRequestForm } from "../../../features/settings/SupportRequestForm";
import { readConversationConfig } from "../../../shared/meri-conversations/config";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const readOnlyPreview =
    process.env.CAPIRO_PREVIEW_READ_ONLY !== undefined &&
    process.env.CAPIRO_PREVIEW_READ_ONLY !== "false";
  return (
    <ConnectedModule settings readOnlyPreview={readOnlyPreview}>
      <SettingsScreen
        readOnlyPreview={readOnlyPreview}
        section={section === "preferences" ? "meri-preferences" : section}
        memoryReviewEnabled={
          process.env.MERI_MEMORY_OWNER_REVIEW_ENABLED === "true"
        }
        meriPreferences={
          <MeriPreferencesPanel
            usageEnabled={readConversationConfig(process.env).enabled}
            tenantSettingsEnabled={
              process.env.MERI_TENANT_SETTINGS_ENABLED === "true"
            }
            reportContent={readOnlyPreview ? undefined : <SupportRequestForm />}
            userPreferencesEnabled={
              process.env.MERI_USER_PREFERENCES_ENABLED === "true"
            }
          />
        }
      />
    </ConnectedModule>
  );
}
