import { expect, it } from "vitest";
import { resolveMeriCapabilities } from "../src/shared/meri-resources/capabilities";
import { unavailableResources } from "../src/shared/meri-resources/unavailable";
import {
  destinationHref,
  destinations,
  unavailableDestinationTitle,
} from "../src/shared/shell/SidebarDestinations";

it("every unavailable resource names what is missing and who owns it", () => {
  for (const [id, entry] of Object.entries(unavailableResources)) {
    expect(entry.label, id).toMatch(/\S/);
    expect(entry.summary, id).toMatch(/\.$/);
    expect(entry.missing, id).toMatch(/\S{8}/);
    expect(entry.owner, id).toMatch(/^neo-capiro\/meri-greenfield/);
  }
  // Approvals and data access have ordinary routes now; nothing explains them as missing.
  expect(Object.keys(unavailableResources)).not.toContain("approvals");
  expect(Object.keys(unavailableResources)).not.toContain("dataAccess");
});

it("every destination has an ordinary route; a disabled one explains the capability that is not enabled", () => {
  const enabled = resolveMeriCapabilities({
    conversations: true,
    files: true,
    memory: true,
  });
  const disabled = destinations.filter(
    (item) => destinationHref(item, false, enabled) === undefined,
  );
  expect(disabled.map((item) => item.label)).toEqual([
    "Runs",
    "Approvals",
    "Data access",
  ]);
  for (const item of disabled)
    expect(unavailableDestinationTitle(item, enabled)).toMatch(
      /^Not enabled: /,
    );
  const everything = resolveMeriCapabilities(
    Object.fromEntries(destinations.map((item) => [item.capability, true])),
  );
  expect(
    destinations.map((item) => destinationHref(item, false, everything)),
  ).toEqual([
    "/meri/conversations",
    "/meri/files",
    "/meri/runs",
    "/meri/approvals",
    "/meri/memory",
    "/meri/routines",
    "/settings/preferences?page=data-access",
  ]);
  // Fixture mode keeps every destination on its synthetic Figma screen.
  for (const item of destinations)
    expect(destinationHref(item, true)).toMatch(/^\/meri\/fixture\//);
});
