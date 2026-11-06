import { normalizeOf } from './reviewRules.js';

/** Cantidades normalizadas exactamente como el XLS que se publica, sin consultar ni escribir en RPS. */
export const materialesReserva = reserva => reserva.ofs.flatMap(b => b.materials.map(m => ({
  of: normalizeOf(b.of), codigo: m.code, cantidad: m.quantity, unidad: m.unit || '',
})));

/** Remolques conserva el consumo calculado en su hoja, incluido el de los trabajos a mano. */
export const materialesRemolques = p => p.elementos.map(e => ({ of: normalizeOf(e.input.cabecera.ordenFabricacion),
  codigo: e.input.material || 'Sin material', cantidad: e.result.metrosTela, unidad: 'm',
}));

/** En puertas no hay reserva automática: se comparan las piezas calculadas, con sus medidas. */
export const materialesPuertas = resultados => resultados.flatMap(r => r.piezas.map(p => ({ of: normalizeOf(p.of),
  codigo: `${p.material} · ${p.clase} ${p.ancho.toLocaleString('es-ES')} × ${p.alto.toLocaleString('es-ES')} cm`, cantidad: p.cantidad, unidad: 'piezas',
})));
