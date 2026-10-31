import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileResults } from "../src/features/portfolio/index/ProfileResults";
import { clientSchema } from "../src/features/portfolio/index/contracts";
import { BrandingSettings } from "../src/features/settings/BrandingSettings";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
const branding = vi.hoisted(() => ({
  logoUrl: undefined as string | undefined,
  locked: false,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState(initial: unknown) {
    const index = hooks.index++;
    if (index === hooks.values.length) hooks.values.push(initial);
    return [
      hooks.values[index],
      (next: unknown) => {
        hooks.values[index] = next;
      },
    ];
  },
  useRef: (current: unknown) => ({ current }),
  useId: () => "synthetic-description",
}));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("lucide-react", () => ({ ArrowUpRight: "svg" }));
vi.mock("@/shared/capiro/CapiroBoundary", () => ({ useCapiro: () => ({}) }));
vi.mock("@/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({
    data: { name: "Synthetic organization", logoUrl: branding.logoUrl },
    loading: false,
    reload: vi.fn(),
  }),
}));
vi.mock("@/shared/module-ui", () => ({
  StatusPanel: "section",
  TextInput: "input",
}));
vi.mock("../src/features/settings/components", () => ({
  SettingField: "label",
  SettingsButton: "button",
  SettingsCard: "section",
  SettingsNotice: "aside",
}));
vi.mock("../src/features/settings/SettingsMutationNotice", () => ({
  SettingsMutationNotice: () => null,
}));
vi.mock("../src/features/settings/useSettingsAction", () => ({
  useSettingsAction: () => ({ busy: false, run: vi.fn(), clear: vi.fn() }),
}));
vi.mock("../src/features/settings/useSettingsMutation", () => ({
  useSettingsMutation: () => ({
    api: {},
    locked: branding.locked,
    action: { busy: false },
  }),
}));

type Element = ReactElement<Record<string, unknown>>;
function expand(node: ReactNode): ReactNode {
  return Children.toArray(node).map((child): ReactNode => {
    if (!isValidElement<Record<string, unknown>>(child)) return child;
    if (typeof child.type === "function")
      return expand(
        (child.type as (props: Record<string, unknown>) => ReactNode)(
          child.props,
        ),
      );
    return {
      ...child,
      props: {
        ...child.props,
        children: expand(child.props.children as ReactNode),
      },
    };
  });
}
function elements(node: ReactNode): Element[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<Record<string, unknown>>(child)
      ? [child, ...elements(child.props.children as ReactNode)]
      : [],
  );
}
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<Record<string, unknown>>(child)
        ? text(child.props.children as ReactNode)
        : String(child),
    )
    .join("");
}
function render(component: () => ReactNode) {
  hooks.index = 0;
  return expand(component());
}
const logo = "https://assets.example.test/configured-logo.png";
const nextLogo = "https://assets.example.test/refreshed-logo.png";
const client = clientSchema.parse({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Synthetic Company",
  status: "active",
  profileStatus: "ACTIVE",
  logoUrl: logo,
});
beforeEach(() => {
  hooks.values = [];
  branding.logoUrl = undefined;
  branding.locked = false;
});
describe("configured logo load failures", () => {
  it.each(["list", "cards"] as const)(
    "uses the existing client monogram after a failed %s logo and tries a new URL",
    (view) => {
      let current = client;
      const display = () => ProfileResults({ rows: [current], view });
      const image = elements(render(display)).find(
        (node) => node.type === "img",
      )!;
      expect(image.props.src).toBe(logo);
      expect(image.props.onError).toBeTypeOf("function");
      (image.props.onError as () => void)();
      const failed = render(display);
      expect(elements(failed).some((node) => node.type === "img")).toBe(false);
      expect(text(failed)).toContain("SC");
      current = { ...client, logoUrl: nextLogo };
      expect(
        elements(render(display)).find((node) => node.type === "img")?.props
          .src,
      ).toBe(nextLogo);
    },
  );
  it("distinguishes a configured but unavailable organization logo from no logo", () => {
    branding.logoUrl = logo;
    const image = elements(render(BrandingSettings)).find(
      (node) => node.type === "img",
    )!;
    expect(image.props.alt).toBe("Organization logo");
    expect(image.props.onError).toBeTypeOf("function");
    (image.props.onError as () => void)();
    const failed = render(BrandingSettings);
    expect(elements(failed).some((node) => node.type === "img")).toBe(false);
    expect(text(failed)).toContain("Logo unavailable");
    expect(text(failed)).not.toContain("No logo");
    branding.logoUrl = nextLogo;
    expect(
      elements(render(BrandingSettings)).find((node) => node.type === "img")
        ?.props.src,
    ).toBe(nextLogo);
    branding.logoUrl = undefined;
    expect(text(render(BrandingSettings))).toContain("No logo");
  });
  it("renders the app's own firm-logo path unchanged", () => {
    // The consumer sweep for the M1 firm half: once Core reports the app path instead of a
    // presigned URL, the settings surface must use it verbatim. A website normalizer would turn
    // "/api/firm-logo" into something else — the mistake the client-logo consumers had.
    branding.logoUrl = "/api/firm-logo";
    const image = elements(render(BrandingSettings)).find(
      (node) => node.type === "img",
    )!;
    expect(image.props.src).toBe("/api/firm-logo");
    expect(image.props.alt).toBe("Organization logo");
    expect(image.props.onError).toBeTypeOf("function");
    expect(text(render(BrandingSettings))).not.toContain("Logo unavailable");
  });
  it("keeps logo upload locked while an existing branding mutation is unresolved", () => {
    branding.locked = true;
    const controls = elements(render(BrandingSettings));
    expect(
      controls.find(
        (node) => node.type === "input" && node.props.type === "file",
      )?.props.disabled,
    ).toBe(true);
    expect(
      controls.find(
        (node) =>
          node.type === "button" &&
          text(node.props.children as ReactNode) === "Upload logo",
      )?.props.disabled,
    ).toBe(true);
  });
});
