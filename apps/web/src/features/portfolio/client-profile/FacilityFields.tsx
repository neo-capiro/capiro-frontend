"use client";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import type { Facility } from "./contracts";
import styles from "./facilities-manager.module.css";
const stateCodes =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI".split(
    " ",
  );
export function FacilityFields({ facility }: { facility?: Facility }) {
  return (
    <>
      <label>
        Facility name
        <input name="name" required defaultValue={facility?.name} autoFocus />
      </label>
      <label>
        Street address
        <input
          name="addressLine"
          autoComplete="street-address"
          defaultValue={facility?.addressLine ?? ""}
        />
      </label>
      <div className={styles.locality}>
        <label>
          City
          <input
            name="city"
            autoComplete="address-level2"
            defaultValue={facility?.city ?? ""}
          />
        </label>
        <label>
          State / territory
          <select
            name="state"
            autoComplete="address-level1"
            defaultValue={facility?.state ?? ""}
          >
            <option value="">Not set</option>
            {facility?.state && !stateCodes.includes(facility.state) && (
              <option value={facility.state}>{facility.state}</option>
            )}
            {stateCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label>
          ZIP code
          <input
            name="zip"
            autoComplete="postal-code"
            defaultValue={facility?.zip ?? ""}
          />
        </label>
      </div>
      <div className={styles.districts}>
        <label>
          Congressional district
          <input
            name="congressionalDistrict"
            pattern="[0-9]{1,2}"
            maxLength={2}
            placeholder="12 or 00"
            defaultValue={facility?.congressionalDistrict ?? ""}
          />
        </label>
        <label>
          Employees
          <input
            name="employeeCount"
            type="number"
            min={0}
            step={1}
            defaultValue={facility?.employeeCount ?? ""}
          />
        </label>
        <label>
          State House district
          <input
            name="stateHouseDistrict"
            maxLength={64}
            defaultValue={facility?.stateHouseDistrict ?? ""}
          />
        </label>
        <label>
          State Senate district
          <input
            name="stateSenateDistrict"
            maxLength={64}
            defaultValue={facility?.stateSenateDistrict ?? ""}
          />
        </label>
      </div>
      <p className="muted">
        Use a bare House district number, or 00 for at-large. Leave districts
        blank to resolve from the address. A later successful geocode can
        replace manual state districts.
      </p>
      <TextareaField
        label="Notes"
        name="notes"
        defaultValue={facility?.notes ?? ""}
      />
    </>
  );
}
