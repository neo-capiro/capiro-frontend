import type { StepProps } from "./Fields";
import { TextField } from "./Fields";
import type {
  ManualLocation,
  ManualLeader,
  ManualCapability,
} from "./manual-sections";
import styles from "./intake.module.css";

export function SitesStep({ values, set, errors }: StepProps) {
  const change = (index: number, patch: Partial<ManualLocation>) =>
    set(
      "locations",
      values.locations.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    );
  return (
    <div className={styles.fields}>
      <h3>Sites</h3>
      <p className="muted">
        Add a physical address. Districts are resolved separately after saving.
      </p>
      {errors.locations && (
        <p role="alert" className="danger" id="sites-error">
          {errors.locations}
        </p>
      )}
      {values.locations.map((row, index) => (
        <fieldset className={styles.sectionCard} key={index}>
          <legend>Site {index + 1}</legend>
          <div className={styles.columns}>
            <TextField
              label="Site name"
              value={row.name}
              error={
                !row.name && errors.locations ? "Name this site." : undefined
              }
              onChange={(event) => change(index, { name: event.target.value })}
            />
            <label>
              Role
              <select
                value={row.role}
                onChange={(event) =>
                  change(index, {
                    role: event.target.value as ManualLocation["role"],
                  })
                }
              >
                {[
                  ["headquarters", "Headquarters"],
                  ["manufacturing", "Factory / manufacturing"],
                  ["research", "Lab / research"],
                  ["engineering", "Engineering"],
                  ["testing", "Testing"],
                  ["office", "Office"],
                  ["other", "Other"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={row.status}
                onChange={(event) =>
                  change(index, {
                    status: event.target.value as ManualLocation["status"],
                  })
                }
              >
                {[
                  ["unknown", "Not specified"],
                  ["proposed", "Proposed"],
                  ["operating", "Operating"],
                  ["announced", "Announced"],
                  ["under_construction", "Under construction"],
                  ["closed", "Closed"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {(["country", "addressLine", "city", "state", "zip"] as const).map(
              (key) => (
                <TextField
                  key={key}
                  label={
                    {
                      country: "Country (two-letter code)",
                      addressLine: "Street address",
                      city: "City",
                      state: "State or region",
                      zip: "Postal code",
                    }[key]
                  }
                  value={row[key]}
                  onChange={(event) =>
                    change(index, { [key]: event.target.value })
                  }
                />
              ),
            )}
          </div>
          {!row.id && (
            <button
              type="button"
              className="button ghost"
              onClick={() =>
                set(
                  "locations",
                  values.locations.filter((_, i) => i !== index),
                )
              }
            >
              Remove site {index + 1}
            </button>
          )}
          {row.id && (
            <small className="muted">
              Edit this saved entry here. Remove it from its profile section.
            </small>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        className="button"
        disabled={values.locations.length >= 100}
        onClick={() =>
          set("locations", [
            ...values.locations,
            {
              name: "",
              role: "office",
              status: "unknown",
              country: "US",
              addressLine: "",
              city: "",
              state: "",
              zip: "",
            },
          ])
        }
      >
        Add site
      </button>
    </div>
  );
}

export function LeadershipStep({ values, set, errors }: StepProps) {
  const change = (index: number, patch: Partial<ManualLeader>) =>
    set(
      "leadership",
      values.leadership.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    );
  return (
    <div className={styles.fields}>
      <h3>Leadership</h3>
      <p className="muted">
        Record known people and their roles. Reporting lines need supporting
        evidence.
      </p>
      {errors.leadership && (
        <p role="alert" className="danger">
          {errors.leadership}
        </p>
      )}
      {values.leadership.map((row, index) => (
        <fieldset className={styles.sectionCard} key={index}>
          <legend>Person {index + 1}</legend>
          <div className={styles.columns}>
            {(["name", "title", "email"] as const).map((key) => (
              <TextField
                key={key}
                label={
                  {
                    name: "Name",
                    title: "Role or title",
                    email: "Email (optional)",
                  }[key]
                }
                type={key === "email" ? "email" : "text"}
                value={row[key]}
                error={
                  errors.leadership &&
                  ((key === "name" && !row.name) ||
                    (key === "email" && Boolean(row.email)))
                    ? errors.leadership
                    : undefined
                }
                onChange={(event) =>
                  change(index, { [key]: event.target.value })
                }
              />
            ))}
          </div>
          {!row.id && (
            <button
              type="button"
              className="button ghost"
              onClick={() =>
                set(
                  "leadership",
                  values.leadership.filter((_, i) => i !== index),
                )
              }
            >
              Remove person {index + 1}
            </button>
          )}
          {row.id && (
            <small className="muted">
              Edit this saved entry here. Remove it from its profile section.
            </small>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        className="button"
        disabled={values.leadership.length >= 100}
        onClick={() =>
          set("leadership", [
            ...values.leadership,
            { name: "", title: "", email: "" },
          ])
        }
      >
        Add leader
      </button>
    </div>
  );
}

export function ManualCapabilitiesStep({ values, set, errors }: StepProps) {
  const change = (index: number, patch: Partial<ManualCapability>) =>
    set(
      "capabilities",
      values.capabilities.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    );
  return (
    <div className={styles.fields}>
      <h3>Capabilities</h3>
      <p className="muted">
        Name actual products, platforms, services, programs or components.
      </p>
      {errors.capabilities && (
        <p role="alert" className="danger">
          {errors.capabilities}
        </p>
      )}
      {values.capabilities.map((row, index) => (
        <fieldset className={styles.sectionCard} key={index}>
          <legend>Capability {index + 1}</legend>
          <TextField
            label="Capability name"
            value={row.name}
            error={
              !row.name && errors.capabilities
                ? "Name this capability."
                : undefined
            }
            onChange={(event) => change(index, { name: event.target.value })}
          />
          <label>
            Type
            <select
              value={row.type}
              onChange={(event) =>
                change(index, {
                  type: event.target.value as ManualCapability["type"],
                })
              }
            >
              {["product", "platform", "service", "program", "component"].map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>
          <TextField
            label="Description"
            multiline
            value={row.description}
            maxLength={600}
            onChange={(event) =>
              change(index, { description: event.target.value })
            }
          />
          {!row.id && (
            <button
              type="button"
              className="button ghost"
              onClick={() =>
                set(
                  "capabilities",
                  values.capabilities.filter((_, i) => i !== index),
                )
              }
            >
              Remove capability {index + 1}
            </button>
          )}
          {row.id && (
            <small className="muted">
              Edit this saved entry here. Remove it from its profile section.
            </small>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        className="button"
        disabled={values.capabilities.length >= 100}
        onClick={() =>
          set("capabilities", [
            ...values.capabilities,
            { name: "", type: "product", description: "" },
          ])
        }
      >
        Add capability
      </button>
    </div>
  );
}
