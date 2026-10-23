import { MODELOS_PUERTAS, nuevaPuerta } from './calcular.ts';
import { CODIGO_PORTANOVA, ROLLOS_PORTANOVA } from './clientePortanova.ts';
import type { ModeloPuerta, Puerta } from './tipos.ts';

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
  // RPS no trae los anchos de rollo; los de Portanova son siempre los mismos.
  const rollos = clienteCodigo.trim() === CODIGO_PORTANOVA ? ROLLOS_PORTANOVA : {};
  const puertas: Puerta[] = [];
  const avisos: string[] = [];
  for (const l of lineas) {
    const articulo = l.articulo.trim().toUpperCase();
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
      ...rollos,
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
