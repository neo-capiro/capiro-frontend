import { SettingsLayout } from "../../src/features/meri/screens/settings/SettingsLayout";
import type { SettingsChrome } from "../../src/features/meri/screens/settings/settings-view";

function body(id: string) {
  return function SyntheticBody({ chrome }: { chrome: SettingsChrome }) {
    return (
      <div data-testid="page-body" data-page={id}>
        <SettingsLayout
          chrome={chrome}
          heading={{ title: id, description: "Synthetic navigation fixture" }}
          primary={<p>Explicit synthetic {id} page body</p>}
          supporting={null}
        />
      </div>
    );
  };
}

export const UserPreferencesHost = body("personal");
export const PersonalPreferencesScreen = body("personal");
export const ConnectorAccountsHost = body("connections");
export const ConnectorLibraryHost = body("connected-services");
export const DataAccessHost = body("data-access");
export const UsageOverviewHost = body("usage");
export const UsageLimitsScreen = body("usage");
export const SkillsTemplatesScreen = body("skills");
export const NotificationsAccountScreen = body("updates");
export const MemoryRetentionPolicyHost = body("privacy");
export const HelpShortcutsScreen = body("help");
export const TenantModelSettings = () => null;
export const ProcedureGovernanceHost = () => null;
