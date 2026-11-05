import { useState } from "react";
import { evidenceSchema } from "./proposal-contracts";
import styles from "./depth.module.css";

export function EvidenceFields() {
  const [sourceType, setSourceType] = useState("company");
  return (
    <fieldset className={styles.fields}>
      <legend>Supporting source</legend>
      <label>
        Source title
        <input name="sourceTitle" required maxLength={180} />
      </label>
      <label>
        Source URL
        <input
          name="sourceUrl"
          type="url"
          required={sourceType !== "person"}
          placeholder="Source web address"
        />
      </label>
      <label>
        Source type
        <select
          name="sourceType"
          value={sourceType}
          onChange={(event) => setSourceType(event.target.value)}
        >
          <option value="company">Company</option>
          <option value="official">Official</option>
          <option value="document">Document</option>
          <option value="person">Person</option>
        </select>
      </label>
      <label>
        Observed date
        <input
          name="observedAt"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
        />
      </label>
      <label className={styles.full}>
        Supporting passage
        <textarea name="excerpt" required maxLength={4000} rows={3} />
      </label>
    </fieldset>
  );
}
export function evidenceFromForm(form: FormData) {
  return evidenceSchema.parse({
    title: form.get("sourceTitle"),
    ...(form.get("sourceUrl") ? { url: form.get("sourceUrl") } : {}),
    sourceType: form.get("sourceType"),
    observedAt: `${form.get("observedAt")}T00:00:00.000Z`,
    excerpt: form.get("excerpt"),
  });
}
