interface FormFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}

export function FormField({ id, label, type, value, onChange }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-hairline bg-paper px-3 py-2 text-ink outline-offset-2 focus:outline focus:outline-2 focus:outline-ink"
      />
    </div>
  );
}
