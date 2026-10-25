import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { TransferReview } from "../src/features/portfolio/prospects/contact-transfer/TransferReview";
import { ContactTransfer } from "../src/features/portfolio/prospects/contact-transfer/ContactTransfer";
import {
  actor,
  id,
  matchingPerson,
  review,
} from "./prospect-contact-transfer-fixtures";

vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({
    data: { user: { id: actor.userId }, tenant: { id: actor.tenantId } },
  }),
}));
vi.mock(
  "../src/features/portfolio/prospects/contact-transfer/useContactTransfer",
  () => ({
    useContactTransfer: () => ({
      recovery: { ready: true, record: null },
      action: { isPending: false },
      review: { isPending: false },
    }),
  }),
);
vi.mock("../src/shared/portfolio/ui/Dialog", () => ({ Dialog: () => null }));

it("renders each reviewed field and explicit unselected/create/link/skip choices", () => {
  const html = renderToStaticMarkup(
    createElement(TransferReview, {
      review: { ...review, people: [matchingPerson] },
      decisions: [],
      disabled: false,
      onChange: () => {},
    }),
  );
  for (const field of [
    "Synthetic Contact",
    "Director",
    "contact@example.test",
    "Reviewed note",
    "Phone",
    "Notes",
    "Skip this contact",
    "Not included in this transfer",
  ])
    expect(html).toContain(field);
  expect(html).toContain('value="" selected=""');
  expect(html).toMatch(/value="create" disabled=""/);
  expect(html).toContain(`value="link:${id(6)}"`);
  expect(html).toContain(matchingPerson.updatedAt);
  expect(html).toContain("0 of 50 contacts selected.");
});
it("disables links without a current target timestamp, without inventing one", () => {
  const html = renderToStaticMarkup(
    createElement(TransferReview, {
      review: {
        ...review,
        people: [{ ...matchingPerson, updatedAt: undefined }],
      },
      decisions: [],
      disabled: false,
      onChange: () => {},
    }),
  );
  expect(html).toContain(`value="link:${id(6)}" disabled=""`);
  expect(html).toContain("current version unavailable");
});
it("keeps email-only matches out of the explicit link options", () => {
  const html = renderToStaticMarkup(
    createElement(TransferReview, {
      review: {
        ...review,
        people: [{ ...matchingPerson, notes: "Different reviewed note" }],
      },
      decisions: [],
      disabled: true,
      onChange: () => {},
    }),
  );
  expect(html).not.toContain(`value="link:${id(6)}"`);
  expect(html).toContain('<fieldset class="stack" disabled=""');
  expect(html).toContain('value="create">');
});
it("mounts the review entry only for a converted prospect with its linked client", () => {
  expect(
    renderToStaticMarkup(
      createElement(ContactTransfer, { record: review.prospect }),
    ),
  ).toContain("Review contact carry-over");
  expect(
    renderToStaticMarkup(
      createElement(ContactTransfer, {
        record: { ...review.prospect, convertedAt: null },
      }),
    ),
  ).toBe("");
  expect(
    renderToStaticMarkup(
      createElement(ContactTransfer, {
        record: { ...review.prospect, linkedClientId: null },
      }),
    ),
  ).toBe("");
});
