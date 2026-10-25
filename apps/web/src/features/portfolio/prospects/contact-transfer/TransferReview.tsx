"use client";
import {
  exactContactMatches,
  type TransferDecision,
  type TransferReview as Review,
} from "./review";
import { transferTimestamp } from "./contracts";

export function TransferReview({
  review,
  decisions,
  disabled,
  onChange,
}: {
  review: Review;
  decisions: TransferDecision[];
  disabled: boolean;
  onChange: (value: TransferDecision[]) => void;
}) {
  return (
    <fieldset className="stack" disabled={disabled}>
      <legend>Source contacts for {review.client.name}</legend>
      <p>
        Choose up to 50 contacts. Exact matches compare name, title, email,
        phone and notes, including letter case. Existing client contacts will
        not be edited.
      </p>
      {!review.contacts.length && <p>No source contacts are available.</p>}
      {review.contacts.map((source) => {
        const selected = decisions.find((item) => item.sourceId === source.id);
        const matches = exactContactMatches(source, review.people);
        const value =
          selected?.action === "link"
            ? `link:${selected.personId}`
            : (selected?.action ?? "");
        return (
          <section className="stack" key={source.id}>
            <h3>{source.name}</h3>
            <dl>
              {(["title", "email", "phone", "notes"] as const).map((field) => (
                <div key={field}>
                  <dt>{field[0]!.toUpperCase() + field.slice(1)}</dt>
                  <dd>{source[field] || "None"}</dd>
                </div>
              ))}
            </dl>
            <label>
              Action for {source.name}
              <select
                value={value}
                onChange={(event) => {
                  const choice = event.target.value;
                  const next = decisions.filter(
                    (item) => item.sourceId !== source.id,
                  );
                  if (choice)
                    next.push(
                      choice.startsWith("link:")
                        ? {
                            sourceId: source.id,
                            action: "link",
                            personId: choice.slice(5),
                          }
                        : {
                            sourceId: source.id,
                            action: choice as "create" | "skip",
                          },
                    );
                  onChange(next);
                }}
              >
                <option value="">Not included in this transfer</option>
                <option value="create" disabled={matches.length > 0}>
                  Create a new client contact
                </option>
                {selected?.action === "link" &&
                  !matches.some(
                    (target) => target.id === selected.personId,
                  ) && (
                    <option value={`link:${selected.personId}`} disabled>
                      Previous linked target unavailable — choose a current
                      action
                    </option>
                  )}
                {matches.map((target, index) => (
                  <option
                    key={target.id}
                    value={`link:${target.id}`}
                    disabled={
                      !transferTimestamp.safeParse(target.updatedAt).success
                    }
                  >
                    Link exact match {index + 1}: {target.name}
                    {target.updatedAt
                      ? ` (updated ${target.updatedAt})`
                      : " — current version unavailable"}
                  </option>
                ))}
                <option value="skip">Skip this contact</option>
              </select>
            </label>
          </section>
        );
      })}
      <p>{decisions.length} of 50 contacts selected.</p>
    </fieldset>
  );
}
