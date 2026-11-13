import type { Dxf, EntidadDxf } from './tipos.ts';

export function leerDxf(texto: string): Dxf {
  const lines = texto.replace(/\r/g, '').split('\n');
  const pairs: [number, string][] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim());
    if (!Number.isInteger(code) || code < 0 || code > 1071) throw new Error(`Código DXF inválido en línea ${i + 1}`);
    pairs.push([code, lines[i + 1].trim()]);
  }
  const sections: Dxf['sections'] = {};
  let section: string | null = null, entity: EntidadDxf | null = null;
  for (let i = 0; i < pairs.length; i++) {
    const [c, v] = pairs[i];
    if (c === 0 && v === 'SECTION') {
      if (pairs[i + 1]?.[0] !== 2) throw new Error('Sección DXF sin nombre');
      section = pairs[++i][1]; sections[section] ??= []; entity = null; continue;
    }
    if (c === 0 && v === 'ENDSEC') { section = null; entity = null; continue; }
    if (!section) continue;
    if (c === 0) { entity = { type: v, pairs: [] }; sections[section].push(entity); }
    else {
      if (!entity) { entity = { type: 'HEADER', pairs: [] }; sections[section].push(entity); }
      // Los fragmentos MTEXT pueden terminar o empezar con un espacio entre palabras.
      // TEXT conserva el tratamiento anterior para no cambiar las salidas ya contrastadas.
      entity.pairs.push([c, entity.type==='MTEXT' && (c===1 || c===3) ? lines[2*i+1] : v]);
    }
  }
  if (!sections.ENTITIES || !pairs.some(([c, v]) => c === 0 && v === 'EOF') || section) throw new Error('DXF incompleto: faltan ENTITIES, ENDSEC o EOF');
  // Los handles son opcionales en DXF; se usa un identificador local si faltan.
  sections.ENTITIES.forEach((e, i) => { if (!value(e, 5)) e.pairs.push([5, `@${i}`]); });
  const layers: Dxf['layers'] = {}, styles: Dxf['styles'] = {};
  for (const e of sections.TABLES ?? []) {
    if (e.type === 'LAYER') layers[value(e, 2)] = { color: number(e, 62), flags: number(e, 70) };
    if (e.type === 'STYLE') styles[value(e, 2)] = Object.fromEntries(e.pairs);
  }
  return { entities: sections.ENTITIES, layers, styles, sections };
}
export const values = (e: EntidadDxf, c: number): string[] => e.pairs.filter(x => x[0] === c).map(x => x[1]);
export const value = (e: EntidadDxf, c: number, fallback = ''): string => values(e, c)[0] ?? fallback;
export const number = (e: EntidadDxf, c: number, fallback = 0): number => {
  const n = Number(value(e, c, String(fallback)));
  if (!Number.isFinite(n)) throw new Error(`La entidad ${e.type} en la capa ${value(e,8) || '(sin nombre)'} tiene un número inválido (elemento ${value(e,5)}, dato ${c}): corrígelo en ZWCAD y vuelve a exportar el DXF`);
  return n;
};
