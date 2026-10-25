import { MODELOS_PUERTAS, nuevaPuerta } from './calcular.ts';
import { REGLAS_SYSTEM_DOCK } from './systemDock.ts';
import type { ModeloPuerta, Puerta } from './tipos.ts';

/** SYSTEM DOCK, S.L. en RPS: sus líneas «LONA PERIMETRAL …» son lonas de abrigo de muelle (docs/modelos/system-dock.md). */
export const CODIGO_SYSTEM_DOCK = '032286';

// «Buscar pedido» con un pedido de puertas (22/10/2026): de cada línea de RPS con artículo de puerta sale una
// puerta con lo que dice el texto del pedido (medidas, color, cantidad) y su OF. Es una propuesta: el modelo
// no se da por confirmado, porque manda el dibujo del cliente (en RPS, AR2604725 es PUERTAPLE y es enrollable).

export interface LineaPuertaRps {
  articulo: string;
  cantidad: number;
  descripcion: string;
  comentario: string;
  of: string;
}

const numero = (texto: string) => Number(texto.replace(',', '.'));

export function puertasDesdeRps(lineas: LineaPuertaRps[], { clienteCodigo = '' }: { clienteCodigo?: string } = {}): { puertas: Puerta[]; avisos: string[] } {
  const puertas: Puerta[] = [];
  const avisos: string[] = [];
  for (const l of lineas) {
    const articulo = l.articulo.trim().toUpperCase();
    const sd = lonaSystemDock(l, clienteCodigo);
    if (sd) { puertas.push(sd); continue; }
    if (!articulo.startsWith('PUERTA')) continue;
    if (!Object.hasOwn(MODELOS_PUERTAS, articulo)) {
      avisos.push(`Línea ${articulo} (tramo o pieza suelta): no es una puerta completa, se hace aparte.`);
      continue;
    }
    const texto = `${l.descripcion} ${l.comentario}`.replace(/\s+/g, ' ').trim();
    const medidas = /MEDIDAS?\s+(\d+(?:[.,]\d+)?)\s*(?:CM)?\s*X\s*(\d+(?:[.,]\d+)?)/i.exec(texto);
    const color = /COLOR\s+([A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ]+)*\s+\d{4})/i.exec(texto);
    const cantidad = Number.isInteger(l.cantidad) && l.cantidad >= 1 && l.cantidad <= 50 ? l.cantidad : 1;
    puertas.push({
      ...nuevaPuerta(articulo as ModeloPuerta),
      articuloOrigen: articulo as ModeloPuerta,
      frente: medidas ? numero(medidas[1]) : 0,
      alto: medidas ? numero(medidas[2]) : 0,
      color: color ? color[1].toUpperCase() : '',
      cantidad,
      of: l.of.trim(),
      observaciones: l.comentario.trim(),
    });
  }
  return { puertas, avisos };
}

// «LONA PERIMETRAL 10400X550 (ESTANDAR)»: largo × ancho en milímetros (o en cm si el texto lo dice). El código del
// artículo no da el largo (A110212700550-10 se ha usado para 1142 y para 1180): manda el texto de la línea.
function lonaSystemDock(l: LineaPuertaRps, clienteCodigo: string): Puerta | null {
  const texto = `${l.descripcion} ${l.comentario}`.replace(/\s+/g, ' ').trim();
  if (!/LONA PERIMETRAL/i.test(texto) || (clienteCodigo.trim() && clienteCodigo.trim() !== CODIGO_SYSTEM_DOCK)) return null;
  const medida = /(\d+(?:[.,]\d+)?)\s*(CM)?\s*X\s*(\d+(?:[.,]\d+)?)\s*(CM)?/i;
  const m = medida.exec(l.descripcion) ?? medida.exec(texto);
  // La unidad es la del par: sin «CM» y con un largo de más de 2000 (las lonas miden de 8 a 15 m), milímetros.
  const enMm = Boolean(m) && !(m![2] || m![4]) && numero(m![1]) >= 2000;
  const cm = (v: string) => (enMm ? numero(v) / 10 : numero(v));
  const cantidad = Number.isInteger(l.cantidad) && l.cantidad >= 1 && l.cantidad <= REGLAS_SYSTEM_DOCK.maxUnidades ? l.cantidad : 1;
  return {
    ...nuevaPuerta('SYSTEMDOCK'),
    articuloOrigen: 'SYSTEMDOCK',
    frente: m ? cm(m[1]) : 0,
    alto: m ? cm(m[3]) : 0,
    material: REGLAS_SYSTEM_DOCK.material, color: REGLAS_SYSTEM_DOCK.color, rollo: REGLAS_SYSTEM_DOCK.rollo,
    ventanasConfirmadas: true,
    cantidad,
    of: l.of.trim(),
    observaciones: [l.articulo.trim(), l.descripcion.trim(), l.comentario.trim()].filter(Boolean).join(' · '),
  };
}
