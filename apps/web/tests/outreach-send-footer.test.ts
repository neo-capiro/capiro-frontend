import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { CampaignSend } from "../src/features/modules/engagement/outreach/CampaignSend";
import {
  newCampaign,
  campaignUnits,
} from "../src/features/modules/engagement/outreach/campaign-model";

const mailbox = vi.hoisted(() => ({
  id: "10000000-0000-4000-8000-000000000001",
  provider: "google_workspace",
  accountEmail: "sender@example.invalid",
  displayName: null,
  availability: "available",
  signaturePolicy: "actor",
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({ data: [mailbox], loading: false }),
}));
type Owner = Parameters<typeof CampaignSend>[0]["owner"];
function owner(): Owner {
  const state = newCampaign();
  state.sender.connectionId = mailbox.id;
  state.recipients = [
    {
      id: "synthetic-recipient",
      kind: "individual",
      role: "to",
      name: "Synthetic recipient",
      email: "recipient@example.invalid",
    },
  ];
  return {
    state,
    dirty: false,
    pending: null,
    busy: false,
    readOnly: false,
    drafts: [
      {
        generationKey: campaignUnits(state)[0]!.key,
        recipientSnapshot: {
          name: "Synthetic recipient",
          email: "recipient@example.invalid",
        },
        current: {
          subject: "Synthetic subject",
          body: "Synthetic body",
          version: 1,
          sendable: true,
        },
      },
    ],
    sendDrafts: vi.fn(),
    refresh: vi.fn(),
    cancelSend: vi.fn(),
    finishTest: vi.fn(),
  } as unknown as Owner;
}
function render(value: Owner) {
  let action: ReactNode;
  const markup = renderToStaticMarkup(
    createElement(CampaignSend, {
      owner: value,
      renderFooter: (review) => {
        action = review;
        return createElement("footer", null, review);
      },
    }),
  );
  if (
    action &&
    !isValidElement<{ disabled: boolean; onClick: () => void }>(action)
  )
    throw new Error("Invalid send review action");
  return { action, markup };
}
it("moves the existing eligible review action to the footer without sending", () => {
  const value = owner(),
    { action, markup } = render(value);
  expect(
    isValidElement<{ disabled: boolean }>(action) && action.props.disabled,
  ).toBe(false);
  expect(markup.match(/Review send/g)).toHaveLength(1);
  expect(markup.indexOf("<footer")).toBeLessThan(markup.indexOf("Review send"));
  expect(markup).toContain("Send test to my inbox");
  expect(value.sendDrafts).not.toHaveBeenCalled();
});
it.each(["dirty", "busy", "readOnly"] as const)(
  "keeps footer review disabled while %s",
  (flag) => {
    const value = owner();
    value[flag] = true;
    const { action } = render(value);
    expect(
      isValidElement<{ disabled: boolean }>(action) && action.props.disabled,
    ).toBe(true);
    expect(value.sendDrafts).not.toHaveBeenCalled();
  },
);
it("keeps changed destinations and missing sender ineligible", () => {
  for (const mutation of [
    (value: Owner) => {
      value.state.recipients[0]!.email = "changed@example.invalid";
    },
    (value: Owner) => {
      value.state.sender.connectionId = null;
    },
  ]) {
    const value = owner();
    mutation(value);
    const { action } = render(value);
    expect(
      isValidElement<{ disabled: boolean }>(action) && action.props.disabled,
    ).toBe(true);
  }
});
it("shows recovery controls for an uncertain send without offering another send", () => {
  const value = owner();
  value.pending = "send";
  const { action, markup } = render(value);
  expect(action).toBeUndefined();
  expect(markup).toContain("Check status");
  expect(markup).not.toContain("Review send");
  expect(value.sendDrafts).not.toHaveBeenCalled();
});
