// Enter consulta una sola vez y respeta la composición del teclado.
export function lookupOnEnter({ key, composing, disabled, preventDefault, lookup }: {
  key: string; composing: boolean; disabled: boolean;
  preventDefault: () => void; lookup: () => void;
}) {
  if (key !== 'Enter' || composing) return;
  preventDefault();
  if (!disabled) lookup();
}
