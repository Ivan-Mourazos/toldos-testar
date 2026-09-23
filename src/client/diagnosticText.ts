// Los avisos del cálculo empiezan por quién los da ("HERA en OF 0230194: …",
// "Toldo A (ARZUA PRO, OF 0230194): …"). Dentro de la tarjeta de ese toldo el prefijo
// sobra (U9 de la auditoría del 21/09/2026): se quita y se deja la frase con mayúscula.
export function withoutAwningPrefix(message: string) {
  const match = /^[^:]{0,80}\bOF\s*[\w-]+\)?\s*:\s*/i.exec(message);
  if (!match) return message;
  const rest = message.slice(match[0].length);
  return rest ? rest.charAt(0).toLocaleUpperCase('es-ES') + rest.slice(1) : message;
}
