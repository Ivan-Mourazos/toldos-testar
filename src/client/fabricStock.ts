import type { Calculation } from './types';
import { resolveFabric } from '../domain/fabricCatalog.js';

// Stock de la tela elegida, tal como lo devuelve GET /api/catalog/fabrics/stock
// (domain/fabricStock.js). «Disponible» es según RPS: metros menos lo reservado por OF.
export type FabricStock = {
  code: string;
  metros: number;
  reservado: number;
  disponible: number;
  bobinasConDisponible: number;
  mayorBobinaDisponible: number;
  consignacion: number;
  almacenes: { codigo: string; nombre: string; disponible: number; bobinas: number }[];
  consultado?: string;
};

export type FabricStockLineText = { text: string; tone: 'normal' | 'aviso' | 'apagado'; title?: string };

// Código de artículo de una tela del formulario ('' si no es una tela del catálogo).
export function fabricCodeOf(selection: string): string {
  return resolveFabric(selection)?.code?.toUpperCase() || '';
}

// Metros lineales que el cálculo pide de cada tela en todo el pedido: la principal de
// cada OF y, si va aparte, la de la bamba.
export function fabricNeedByCode(calculation: Calculation | null | undefined): Map<string, number> {
  const need = new Map<string, number>();
  const add = (code: string | undefined, ml: number | undefined) => {
    const key = String(code || '').toUpperCase();
    const value = Number(ml) || 0;
    if (!key || value <= 0) return;
    need.set(key, (need.get(key) || 0) + value);
  };
  for (const block of calculation?.ofs ?? []) {
    const calc = block.calculation;
    if (!calc) continue;
    add(calc.fabricCode, calc.mainFabricMl ?? calc.fabricMl);
    if (calc.valanceFabricCode && Number(calc.valanceFabricMl) > 0) add(calc.valanceFabricCode, calc.valanceFabricMl);
  }
  return need;
}

// La línea bajo el buscador de tela. Aviso (ámbar) si no hay, si no llega a lo que
// pide el pedido o si ninguna bobina sola llega (bobinas distintas pueden ser de otra
// partida de tinte).
export function fabricStockLine(stock: FabricStock, neededMl = 0): FabricStockLineText {
  const need = neededMl > 0 ? ` · este pedido necesita ${meters(neededMl)} ml` : '';
  const reserved = stock.reservado > 0 ? ` · ${meters(stock.reservado)} m reservados` : '';
  const consignment = stock.consignacion > 0 ? ` · + ${meters(stock.consignacion)} m en consignación` : '';
  const title = stockTitle(stock);
  if (stock.disponible <= 0) {
    return { text: `Sin stock en RPS${reserved}${need}${consignment}`, tone: 'aviso', title };
  }
  const rolls = stock.bobinasConDisponible === 1 ? '1 bobina' : `${stock.bobinasConDisponible} bobinas`;
  const biggest = stock.bobinasConDisponible > 1 ? ` (la mayor, ${meters(stock.mayorBobinaDisponible)} m)` : '';
  let text = `Stock RPS: ${meters(stock.disponible)} m disponibles en ${rolls}${biggest}${reserved}${need}`;
  let tone: FabricStockLineText['tone'] = 'normal';
  if (neededMl > 0 && stock.disponible < neededMl) {
    text += ' · no llega';
    tone = 'aviso';
  } else if (neededMl > 0 && stock.mayorBobinaDisponible < neededMl) {
    text += ' · ninguna bobina sola llega';
    tone = 'aviso';
  }
  return { text: text + consignment, tone, title };
}

function stockTitle(stock: FabricStock) {
  const lines = stock.almacenes.map((almacen) => `${almacen.nombre || almacen.codigo}: ${meters(almacen.disponible)} m en ${almacen.bobinas} ${almacen.bobinas === 1 ? 'bobina' : 'bobinas'}`);
  if (stock.consignacion > 0) lines.push(`Consignación (no cuenta como disponible): ${meters(stock.consignacion)} m`);
  lines.push('Disponible = metros en almacén menos lo reservado por OF en RPS.');
  if (stock.consultado) lines.push(`Consultado a las ${new Date(stock.consultado).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
  return lines.join('\n');
}

function meters(value: number) {
  return value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}
