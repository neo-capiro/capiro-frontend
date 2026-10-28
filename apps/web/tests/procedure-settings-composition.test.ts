import { afterEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import SettingsPage from "../src/app/settings/[section]/page";

// Exercise the actual server entry's capability selection without executing
// client effects or a browser. Core account/role behavior reuses the accepted
// ProcedureGovernanceHost tests and mounted evidence.
vi.mock("../src/shared/shell/ConnectedModule", () => ({
  ConnectedModule: () => null,
}));
vi.mock("../src/features/settings", () => ({ SettingsScreen: () => null }));
vi.mock("../src/features/meri/screens/settings/MeriPreferencesPanel", () => ({
  MeriPreferencesPanel: () => null,
}));
vi.mock("../src/features/settings/SupportRequestForm", () => ({
  SupportRequestForm: () => null,
}));
afterEach(() => vi.unstubAllEnvs());

for (const [flag, enabled] of [
  [undefined, true],
  ["false", true],
  ["true", false],
] as const) {
  it(`preserves the actual Settings read-only boundary when the flag is ${String(flag)}`, async () => {
    vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", flag);
    const result = await SettingsPage({
      params: Promise.resolve({ section: "preferences" }),
    });
    const settings = result.props.children as ReactElement<{
      readOnlyPreview: boolean;
      meriPreferences: ReactElement<{ procedureGovernanceEnabled: boolean }>;
    }>;
    expect(settings.props.readOnlyPreview).toBe(!enabled);
    expect(
      settings.props.meriPreferences.props.procedureGovernanceEnabled,
    ).toBe(enabled);
  });
}
