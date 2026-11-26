const referencias = /(?<![A-Z0-9])(?:(?:(?:H?[0O]K|H|H?7A)\s*-?\s*)?(4\d{5})\s*-\s*(\d{3,4})|H?(7A\d{6}(?:-\d{4})?)(?!-\d)|(?:D00(\d{7})-001|P(\d{7}))(?!-\d))(?![A-Z0-9])/gi;

export function codigosAssa(texto) {
  const codigos = [...String(texto ?? '').toUpperCase().matchAll(referencias)]
    .map(([, familia, variante, especial, articulo, plano]) => {
      if (familia) return `${familia}-${variante.padStart(4, '0')}`;
      if (especial) return `H${especial}`;
      return `D00${articulo ?? plano}-001`;
    });
  return [...new Set(codigos)];
}

export const codigoAssa = texto => codigosAssa(texto)[0] ?? null;
