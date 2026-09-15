
export function TextField({ label, value, onChange, placeholder = '', onBlur, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; onBlur?: () => void; hint?: string }) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} />
      {hint && <small className="field-hint-warn">{hint}</small>}
    </label>
  );
}
