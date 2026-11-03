import Link from "next/link";
import { SettingsLayout } from "../../src/features/meri/screens/settings/SettingsLayout";
import type { SettingsChrome } from "../../src/features/meri/screens/settings/settings-view";

// Synthetic page bodies for the keyboard focus fixture: each one renders the real
// SettingsLayout, so the real Settings navigation and SegmentedTabs tab list mount
// and unmount exactly as they do when the preferences panel switches pages.
// A focusable editor and an in-page Next link give the fixture unrelated targets
// whose focus must not be taken by the tab list.
function body(id: string) {
  return function SyntheticBody({ chrome }: { chrome: SettingsChrome }) {
    return (
      <div data-testid="page-body" data-page={id}>
        <SettingsLayout
          chrome={chrome}
          heading={{
            title: id,
            description: "Synthetic keyboard focus fixture",
          }}
          primary={
            <input
              data-testid="page-editor"
              aria-label={`${id} editor`}
              defaultValue=""
            />
          }
          supporting={
            <Link href="/settings/preferences?page=connections">
              Open connections page
            </Link>
          }
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
