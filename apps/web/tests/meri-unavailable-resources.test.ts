import { expect, it } from "vitest";
import {
  unavailableResources,
  unavailableTitle,
} from "../src/shared/meri-resources/unavailable";
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
});

it("ordinary destinations without a route explain the exact missing service", () => {
  const ordinary = destinations.filter(
    (item) => destinationHref(item, false) === undefined,
  );
  expect(ordinary.map((item) => item.label)).toEqual([
    "Runs",
    "Approvals",
    "Memory",
    "Routines",
    "Data access",
  ]);
  for (const item of ordinary) {
    expect("unavailable" in item, item.label).toBe(true);
    expect(unavailableDestinationTitle(item)).toMatch(/^Not available yet: /);
  }
  expect(unavailableTitle("approvals")).toContain("approval");
  // Fixture mode keeps every destination on its synthetic Figma screen.
  for (const item of destinations)
    expect(destinationHref(item, true)).toMatch(/^\/meri\/fixture\//);
});
