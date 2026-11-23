/** DXF mínimo para pruebas: cabecera con $EXTMIN e $INSUNITS, tabla de capas y entidades en texto DXF. */
export function dxfPrueba({ insunits, capas = {}, entidades = [], bloques = [] }: {
  insunits?: number; capas?: Record<string, number>; entidades?: string[]; bloques?: string[];
}): string {
  const cab = ['0', 'SECTION', '2', 'HEADER', '9', '$EXTMIN', '10', '0', '20', '0', '30', '0',
    ...(insunits === undefined ? [] : ['9', '$INSUNITS', '70', String(insunits)]), '0', 'ENDSEC'];
  const tablas = ['0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER',
    ...Object.entries({ '0': 7, ...capas }).flatMap(([n, c]) => ['0', 'LAYER', '2', n, '70', '0', '62', String(c)]),
    '0', 'ENDTAB', '0', 'ENDSEC'];
  const blq = ['0', 'SECTION', '2', 'BLOCKS', ...bloques.flatMap(b => b.split('\n')), '0', 'ENDSEC'];
  const ent = ['0', 'SECTION', '2', 'ENTITIES', ...entidades.flatMap(e => e.split('\n')), '0', 'ENDSEC', '0', 'EOF'];
  return [...cab, ...tablas, ...blq, ...ent].join('\n') + '\n';
}
