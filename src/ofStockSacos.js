import fs from 'node:fs/promises';
import path from 'node:path';

export const OF_STOCK_POR_DEFECTO = '0230811';

/** La caché solo guarda una OF buena en memoria, junto con la fecha del DWG leído. */
export function crearOfStockSacos({ oficinaTecnicaDirectory = '', oda }) {
  let ultimoBueno = null, pendiente = null;
  async function cargar() {
    try {
      if (!oficinaTecnicaDirectory) throw new Error('falta configurar OFICINA_TECNICA_DIRECTORY');
      const fichero = path.join(oficinaTecnicaDirectory, 'AUTOCAD', 'MATERIAL PARA STOCK.dwg');
      const stat = await fs.stat(fichero);
      if (ultimoBueno?.fecha === stat.mtimeMs && ultimoBueno?.tamano === stat.size) return { of: ultimoBueno.of, origen: 'dwg', avisos: [] };
      const contenido = await oda.convertir(await fs.readFile(fichero), { desde: 'dwg', hasta: 'dxf' });
      const of = extraerOfStock(contenido);
      ultimoBueno = { of, fecha: stat.mtimeMs, tamano: stat.size };
      return { of, origen: 'dwg', avisos: [] };
    } catch (error) {
      return { of: ultimoBueno?.of || OF_STOCK_POR_DEFECTO, origen: ultimoBueno ? 'ultimoBueno' : 'defecto',
        avisos: [`No se pudo leer la OF de los sacos (${error.message}). Se usa ${ultimoBueno ? 'la última OF leída' : 'la OF por defecto'}: ${ultimoBueno?.of || OF_STOCK_POR_DEFECTO}.`] };
    }
  }
  return () => {
    pendiente ??= cargar().finally(() => { pendiente = null; });
    return pendiente;
  };
}

/** Lee pares DXF, sin depender de espacios, CRLF ni del orden de los códigos. */
export function extraerOfStock(contenido) {
  const lineas = contenido.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const textos = [];
  let entidad = null;
  const guardar = () => {
    if (entidad && Number.isFinite(entidad.x) && Number.isFinite(entidad.y)) {
      entidad.valor = entidad.valor.replace(/\\P/g, ' ').replace(/\\[^;]+;/g, '').replace(/[{}]/g, '').trim().toUpperCase();
      textos.push(entidad);
    }
  };
  for (let i = 0; i + 1 < lineas.length; i += 2) {
    const codigo = Number(lineas[i].trim()), valor = lineas[i + 1].trim();
    if (codigo === 0) {
      guardar();
      entidad = ['TEXT', 'MTEXT'].includes(valor) ? { valor: '', x: NaN, y: NaN } : null;
    } else if (entidad) {
      if (codigo === 10) entidad.x = Number(valor);
      if (codigo === 20) entidad.y = Number(valor);
      if (codigo === 1 || codigo === 3) entidad.valor += valor;
    }
  }
  guardar();
  let saco = textos.find((t) => /\bSACO\b.*120\s*[X×]\s*80\b.*\bSTOCK\b/.test(t.valor));
  // Algunos DWG antiguos llevan cada línea en un TEXT separado.
  if (!saco) {
    const medidas = textos.filter((t) => /^120\s*[X×]\s*80$/.test(t.valor));
    const candidatos = textos.filter((t) => t.valor === 'SACO');
    if (medidas.length && textos.some((t) => t.valor === 'STOCK')) {
      saco = candidatos.sort((a, b) => Math.min(...medidas.map((m) => distancia(a, m))) - Math.min(...medidas.map((m) => distancia(b, m))))[0];
    }
  }
  const ofs = textos.filter((t) => /^\d{7}$/.test(t.valor));
  if (!saco || !ofs.length) throw new Error('No encuentro la OF junto a SACO / 120X80 / STOCK.');
  return ofs.reduce((a, b) => distancia(b, saco) < distancia(a, saco) ? b : a).valor;
}
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
