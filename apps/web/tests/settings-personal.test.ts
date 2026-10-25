import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CapiroMe } from "../src/shared/capiro/operations/settings-schemas";
import { PersonalSettings } from "../src/features/settings/PersonalSettings";

const state = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: true,
  locked: false,
  openUserProfile: vi.fn(),
  buttons: [] as Array<{
    children?: unknown;
    disabled?: boolean;
    onClick?: () => void;
  }>,
}));
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => state,
  useUser: () => state,
}));
vi.mock("../src/features/settings/useSettingsMutation", () => ({
  useSettingsMutation: () => ({
    api: {},
    action: { busy: state.locked },
    locked: state.locked,
  }),
}));
vi.mock("../src/features/settings/SignatureSettings", () => ({
  EmailSignature: () => null,
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({
    state: "authorized-client",
    client: { id: "synthetic-client" },
  }),
}));
vi.mock("../src/features/settings/components", async (original) => ({
  ...(await original<typeof import("../src/features/settings/components")>()),
  SettingsButton: (props: {
    children?: unknown;
    disabled?: boolean;
    onClick?: () => void;
  }) => {
    state.buttons.push(props);
    return createElement(
      "button",
      { disabled: props.disabled },
      String(props.children),
    );
  },
}));
const identity = {
  user: { id: "actor", title: "Title" },
  tenant: { slug: "synthetic" },
  role: "user_admin",
} as CapiroMe;
const render = () =>
  renderToStaticMarkup(
    createElement(PersonalSettings, { identity, refresh: () => {} }),
  );
beforeEach(() => {
  state.isLoaded = state.isSignedIn = true;
  state.locked = false;
  state.buttons = [];
  state.openUserProfile.mockReset();
});
describe("Settings account and client navigation", () => {
  it("opens the signed-in Clerk profile with no client or tenant identity arguments", () => {
    render();
    const opener = state.buttons.find(
      (button) => button.children === "Manage profile and security",
    )!;
    expect(opener.disabled).toBe(false);
    opener.onClick!();
    expect(state.openUserProfile).toHaveBeenCalledExactlyOnceWith();
  });
  it.each(["loading", "signed-out"])(
    "disables the account opener while %s",
    (condition) => {
      state.isLoaded = condition !== "loading";
      state.isSignedIn = false;
      render();
      expect(
        state.buttons.find(
          (button) => button.children === "Manage profile and security",
        )?.disabled,
      ).toBe(true);
      expect(state.openUserProfile).not.toHaveBeenCalled();
    },
  );
  it("preserves the verified selected client on monitoring and preferences links", () => {
    const html = render();
    expect(html).toContain(
      "/modules/intelligence?view=legiwatch&amp;clientId=synthetic-client",
    );
    expect(html).toContain(
      "/settings/meri-preferences?clientId=synthetic-client",
    );
    expect(html).not.toContain("choose Profile");
  });
  it("freezes the title and save control while its result is unresolved", () => {
    state.locked = true;
    const html = render();
    expect(html).toMatch(/<input[^>]*disabled=""/);
    expect(
      state.buttons.find((button) => button.children === "Saving…")?.disabled,
    ).toBe(true);
  });
});
