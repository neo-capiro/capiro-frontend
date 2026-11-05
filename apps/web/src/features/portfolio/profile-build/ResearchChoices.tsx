export function ResearchChoices<Value extends string | number>({
  legend,
  options,
  selected,
  onChange,
  disabled,
}: {
  legend: string;
  options: {
    value: Value;
    label: string;
    disabled?: boolean;
    required?: boolean;
  }[];
  selected: Value[];
  onChange: (values: Value[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="checkbox"
            checked={
              Boolean(option.required) || selected.includes(option.value)
            }
            disabled={option.disabled || option.required}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [
                      ...selected.filter((value) => value !== option.value),
                      option.value,
                    ]
                  : selected.filter((value) => value !== option.value),
              )
            }
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
