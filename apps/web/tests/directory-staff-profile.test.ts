import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { staffProfileHref } from "../src/features/modules/directory/staff-profile-route";
import { StaffProfile } from "../src/features/modules/directory/StaffProfile";
import { MemberProfile } from "../src/features/modules/directory/MemberProfile";
import { CongressionalContacts } from "../src/features/modules/directory/CongressionalContacts";
import {
  staffProfileDetail,
  staffContactDetail,
} from "../src/shared/capiro/operations/directory-staff-schemas";
import { directoryOperations } from "../src/shared/capiro/operations/directory";
import { CapiroApiError } from "../src/shared/capiro/http";

const mock = vi.hoisted(() => ({
  data: undefined as unknown,
  error: undefined as Error | undefined,
  loading: false,
  query: vi.fn(),
  request: vi.fn(),
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => ({ request: mock.request }),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string, input: unknown, options: unknown) => {
    mock.query(key, input, options);
    if (key === "directory.staffDetail")
      return {
        data: mock.data,
        error: mock.error,
        loading: mock.loading,
        reload: vi.fn(),
      };
    return {
      data:
        key === "directory.staffTrips"
          ? { contactId: "staff-800", trips: [] }
          : undefined,
      loading: false,
      reload: vi.fn(),
    };
  },
}));
const staff = {
  id: "staff-800",
  kind: "staff",
  identity: { staffId: 800, firstName: "Synthetic", lastName: "Staff" },
  emails: [{ value: "synthetic@example.invalid" }],
  positions: [],
  roles: [{ roleName: "Legislative aide", memberName: "Synthetic Member" }],
};
const member = {
  id: "member-10",
  fullName: "Synthetic Member",
  staff: [
    { id: "staff-800", fullName: "Synthetic Staff" },
    { id: "", fullName: "Missing Identity" },
  ],
};
function elements(
  node: ReactNode,
): { type: unknown; props: Record<string, unknown> }[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}
beforeEach(() => {
  mock.data = undefined;
  mock.error = undefined;
  mock.loading = false;
  mock.query.mockClear();
});

it("builds a staff deep link without substituting the parent or losing client context, and reverses it", () => {
  const link = staffProfileHref(
    "/modules/directory",
    "clientId=synthetic-client&view=congressional-staff",
    "staff-800",
  )!;
  const query = new URL(link, "https://synthetic.invalid").searchParams;
  expect(query.get("staffId")).toBe("staff-800");
  expect(query.get("clientId")).toBe("synthetic-client");
  expect(staffProfileHref("/modules/directory", query.toString(), null)).toBe(
    "/modules/directory?clientId=synthetic-client&view=congressional-staff",
  );
  for (const invalid of ["", "member-10", "staff-800/other", "javascript:bad"])
    expect(staffProfileHref("/modules/directory", "", invalid)).toBeNull();
});
it("uses the existing fixed Core read and retains the Portfolio projection", () => {
  const operation = directoryOperations["directory.staffDetail"];
  expect([operation.service, operation.method, operation.path]).toEqual([
    "core",
    "GET",
    "/directory/staffers/:staffId",
  ]);
  expect(
    operation.request.safeParse({ params: { staffId: "member-10" } }).success,
  ).toBe(false);
  expect(staffContactDetail.parse(staff)).toEqual({
    id: "staff-800",
    kind: "staff",
    emails: staff.emails,
    positions: [],
  });
  expect(
    staffProfileDetail.safeParse({ ...staff, kind: "member" }).success,
  ).toBe(false);
});
it("renders roster-only staff details and the parent return action", () => {
  mock.data = staffProfileDetail.parse(staff);
  const markup = renderToStaticMarkup(
    createElement(StaffProfile, {
      id: "staff-800",
      parentName: member.fullName,
      onBack: vi.fn(),
    }),
  );
  expect(markup).toContain("Synthetic Staff");
  expect(markup).toContain("Legislative aide");
  expect(markup).toContain("Back to Synthetic Member");
  expect(mock.query).toHaveBeenCalledWith(
    "directory.staffDetail",
    { params: { staffId: "staff-800" } },
    { enabled: true },
  );
});
it("does not show another identity or stale details on errors, loading, or malformed links", () => {
  mock.data = staffProfileDetail.parse(staff);
  for (const state of [
    { id: "staff-801" },
    { id: "member-10" },
    { id: "staff-800", error: new CapiroApiError(403, "Access denied") },
    { id: "staff-800", loading: true },
  ]) {
    mock.error = state.error;
    mock.loading = state.loading ?? false;
    const markup = renderToStaticMarkup(
      createElement(StaffProfile, { id: state.id, onBack: vi.fn() }),
    );
    expect(markup).not.toContain("Synthetic Staff");
  }
  expect(mock.query).toHaveBeenCalledWith(
    "directory.staffDetail",
    { params: { staffId: "member-10" } },
    { enabled: false },
  );
});
it("makes member staff names accessible links and leaves missing identities unlinked", () => {
  const markup = renderToStaticMarkup(
    createElement(MemberProfile, {
      contact: member,
      onBack: vi.fn(),
      favorites: { data: [], reload: vi.fn() },
      staffHref: (id) =>
        staffProfileHref("/modules/directory", "clientId=synthetic-client", id),
    }),
  );
  expect(markup).toContain(
    'href="/modules/directory?clientId=synthetic-client&amp;view=congressional-staff&amp;staffId=staff-800"',
  );
  expect(markup).toContain(">Synthetic Staff</a>");
  expect(markup).toContain("<span>Missing Identity</span>");
});
it("routes a direct staff selection through the staff profile rather than a member or DoW profile", () => {
  const onBack = vi.fn();
  // The route is injected so the existing directory's filter/member state stays mounted.
  const html = renderToStaticMarkup(
    createElement(CongressionalContacts, {
      staffRoute: { id: "staff-800", href: () => null, back: onBack },
    }),
  );
  expect(html).toContain("Back to directory");
  expect(mock.query).toHaveBeenCalledWith(
    "directory.staffDetail",
    { params: { staffId: "staff-800" } },
    { enabled: true },
  );
  const tree = StaffProfile({ id: "staff-800", onBack });
  const button = elements(tree).find(
    (element) => element.props.onClick === onBack,
  );
  expect(button).toBeDefined();
});
