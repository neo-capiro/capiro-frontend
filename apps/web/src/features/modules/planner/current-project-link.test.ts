import { expect, it } from "vitest";
import { canReadCurrentProjectLink } from "./current-project-link";
import type { SelectedClient } from "../../../shared/session/SelectedClient";

const id = "00000000-0000-4000-8000-000000000001";
const active: SelectedClient = {
  state: "authorized-client",
  requestedId: id,
  client: {
    id,
    name: "Synthetic",
    profileStatus: "draft",
    status: "active",
  },
};

it("withholds linked project reads after the selected client is archived or replaced", () => {
  expect(canReadCurrentProjectLink(active, id)).toBe(true);
  expect(
    canReadCurrentProjectLink(
      { ...active, client: { ...active.client, status: "archived" } },
      id,
    ),
  ).toBe(false);
  expect(
    canReadCurrentProjectLink(active, "00000000-0000-4000-8000-000000000002"),
  ).toBe(false);
  expect(
    canReadCurrentProjectLink({ state: "loading", requestedId: id }, id),
  ).toBe(false);
});
