// Genera el fichero de paridad de remolques a partir de una copia de los datos de
// producción (tmp/remolques-produccion/planteamientos.json, que NO se sube). Quita lo
// que no hace falta para calcular y todo nombre de cliente o persona: la prueba solo
// necesita entrada, parámetros y resultado.
// Uso: node scripts/remolques-fixture-paridad.mjs [origen] [destino]
import { readFileSync, writeFileSync } from 'node:fs';

const origen = process.argv[2] || 'tmp/remolques-produccion/planteamientos.json';
const destino = process.argv[3] || 'src/remolques/__fixtures__/produccion-2026-09.json';
const datos = JSON.parse(readFileSync(origen, 'utf8'));
const lista = Array.isArray(datos) ? datos : Object.values(datos);

const limpios = lista.map((rec, indice) => ({
  caso: `${rec.tipo}-${String(indice + 1).padStart(2, '0')}`,
  tipo: rec.tipo,
  creado: rec.createdAt.slice(0, 10),
  input: {
    ...rec.input,
    cabecera: { ...rec.input.cabecera, cliente: '', realizadoPor: '', revision: '', numeroPedido: '', ordenFabricacion: '' },
    observaciones: ''
  },
  paramsSnapshot: rec.paramsSnapshot,
  result: rec.result
}));

writeFileSync(destino, `${JSON.stringify(limpios, null, 1)}\n`);
console.log(`${destino}: ${limpios.length} planteamientos`);
