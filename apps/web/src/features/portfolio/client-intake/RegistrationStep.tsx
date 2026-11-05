import { ManualCodeSuggestions } from "./ManualCodeSuggestions";
import { CodeSelector } from "@/features/portfolio/profile-build/public";
import { certifications, organizationTypes, samStatuses } from "./catalog";
import { ChoiceList, ChoiceSelect, TextField, type StepProps } from "./Fields";
import styles from "./intake.module.css";
export function RegistrationStep(props: StepProps) {
  const { values, set, errors } = props;
  return (
    <div className={styles.fields}>
      <div className={styles.columns}>
        <div className={styles.field}>
          <TextField
            label="CAGE Code"
            value={values.cageCode}
            maxLength={5}
            onChange={(e) => set("cageCode", e.target.value)}
            error={errors.cageCode}
          />
          <ManualCodeSuggestions
            {...props}
            field="cageCode"
            label="CAGE code"
          />
        </div>
        <div className={styles.field}>
          <TextField
            label="UEI"
            value={values.uei}
            maxLength={12}
            onChange={(e) => set("uei", e.target.value)}
            error={errors.uei}
          />
          <ManualCodeSuggestions {...props} field="uei" label="UEI" />
        </div>
        <label>
          SAM.gov status
          <select
            value={values.samStatus}
            onChange={(e) => set("samStatus", e.target.value)}
          >
            <option value="">Select status</option>
            {[
              ...new Set([
                ...samStatuses,
                ...(values.samStatus ? [values.samStatus] : []),
              ]),
            ].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <TextField
          label="SAM.gov expiration date"
          type="date"
          value={values.samExpirationDate}
          onChange={(e) => set("samExpirationDate", e.target.value)}
          error={errors.samExpirationDate}
        />
        <TextField
          label="LDA registrant name"
          value={values.ldaRegistrantName}
          onChange={(e) => set("ldaRegistrantName", e.target.value)}
        />
        <TextField
          label="EIN"
          value={values.ein}
          onChange={(e) => set("ein", e.target.value)}
          error={errors.ein}
          placeholder="XX-XXXXXXX"
        />
        <CodeSelector
          kind="naics"
          error={errors.naicsCodes}
          label="NAICS codes"
          value={values.naicsCodes}
          onChange={(v) => set("naicsCodes", v)}
        >
          <ManualCodeSuggestions
            {...props}
            field="naicsCodes"
            label="NAICS codes"
          />
        </CodeSelector>
        <CodeSelector
          kind="psc"
          error={errors.pscCodes}
          label="PSC codes"
          value={values.pscCodes}
          onChange={(v) => set("pscCodes", v)}
        >
          <ManualCodeSuggestions
            {...props}
            field="pscCodes"
            label="PSC codes"
          />
        </CodeSelector>
      </div>
      <ChoiceSelect
        label="Organization types"
        options={organizationTypes}
        value={values.applicantTypes}
        onChange={(v) => set("applicantTypes", v)}
      />
      <ChoiceList
        label="Federal set-aside certifications"
        layout="certifications"
        options={certifications.map((code) => [code, code])}
        value={values.setAsideCertifications}
        onChange={(v) => set("setAsideCertifications", v)}
      />
    </div>
  );
}
