import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));

// Synthetic keyboard focus fixture: the real preferences panel, SettingsLayout,
// SettingsNav and SegmentedTabs run against the real installed Next App Router;
// only the page bodies the panel imports from its own directory are replaced,
// so no application service or provider is reachable.
const config = {
  experimental: { externalDir: true },
  webpack(config, { webpack }) {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /(?:UserPreferencesHost|TenantModelSettings|ConnectorAccountsHost|ConnectorLibraryHost|DataAccessHost|HelpShortcutsScreen|NotificationsAccountScreen|PersonalPreferencesScreen|MemoryRetentionPolicyHost|SkillsTemplatesScreen|UsageLimitsScreen|UsageOverviewHost|ProcedureGovernanceHost)$/,
        (resource) => {
          // Windows and POSIX separators both have to select the panel's own directory.
          if (
            /features[\\/]meri[\\/]screens[\\/]settings$/.test(resource.context)
          )
            resource.request = path.join(directory, "body-fixtures.tsx");
        },
      ),
    );
    return config;
  },
};

export default config;
