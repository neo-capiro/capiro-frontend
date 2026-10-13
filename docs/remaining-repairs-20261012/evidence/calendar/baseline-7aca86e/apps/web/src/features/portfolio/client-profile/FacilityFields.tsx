"use client";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import type { Facility } from "./contracts";
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
      <div className="formGrid">
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
          <input
            name="state"
            autoComplete="address-level1"
            pattern="[A-Za-z]{2}"
            maxLength={2}
            placeholder="CA"
            defaultValue={facility?.state ?? ""}
          />
        </label>
        <label>
          ZIP code
          <input
            name="zip"
            autoComplete="postal-code"
            defaultValue={facility?.zip ?? ""}
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
