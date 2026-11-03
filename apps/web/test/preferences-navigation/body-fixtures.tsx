import { SettingsLayout } from "../../src/features/meri/screens/settings/SettingsLayout";
import { DataAccessScreen } from "../../src/features/meri/screens/settings/DataAccessScreen";
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
// The real Data access body so its own Connections / Connected services Next links are
// the navigation entry points under test; only its data is synthetic.
export function DataAccessHost({ chrome }: { chrome: SettingsChrome }) {
  return (
    <div data-testid="page-body" data-page="data-access">
      <DataAccessScreen
        chrome={chrome}
        page={
          {
            version: "synthetic",
            generalReads: true,
            checkedAt: "2026-11-03T00:00:00Z",
            families: [],
            relations: [],
          } as never
        }
        clientName="Synthetic General"
        connections={{ status: "ready", connections: [] } as never}
      />
    </div>
  );
}
export const UsageOverviewHost = body("usage");
export const UsageLimitsScreen = body("usage");
export const SkillsTemplatesScreen = body("skills");
export const NotificationsAccountScreen = body("updates");
export const MemoryRetentionPolicyHost = body("privacy");
export const HelpShortcutsScreen = body("help");
export const TenantModelSettings = () => null;
export const ProcedureGovernanceHost = () => null;
