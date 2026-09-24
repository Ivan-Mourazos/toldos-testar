import { ReadPair, useReadMode } from './ReadMode';

export function TextField({ label, value, onChange, placeholder = '', onBlur, hint, missing = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; onBlur?: () => void; hint?: string; missing?: boolean }) {
  const reading = useReadMode();
  if (reading) return <ReadPair label={label} value={value} />;
  return (
    <label className={missing ? 'is-missing' : undefined}>
      <span>{label}</span>
      <input value={value} placeholder={placeholder} aria-invalid={missing || undefined} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} />
      {hint && <small className="field-hint-warn">{hint}</small>}
    </label>
  );
}
