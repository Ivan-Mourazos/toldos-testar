import type { Calculation } from './types';
import { resolveFabric } from '../domain/fabricCatalog.js';

// Stock de la tela elegida, tal como lo devuelve GET /api/catalog/fabrics/stock
// (domain/fabricStock.js). «Disponible» es según RPS: metros menos lo reservado por otros pedidos.
export type FabricStock = {
  code: string;
  metros: number;
  reservado: number;
  reservadoPropio: number;
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
  const resta = stock.reservado > 0 ? `${meters(stock.metros)} m − ${meters(stock.reservado)} m reservados por otros pedidos = ` : '';
  const propio = stock.reservadoPropio > 0 ? ` · ${meters(stock.reservadoPropio)} m reservados para este pedido (no se restan)` : '';
  const consignment = stock.consignacion > 0 ? ` · ${meters(stock.consignacion)} m de ellos en consignación` : '';
  const title = stockTitle(stock);
  if (stock.disponible <= 0) {
    return {
      text: `Sin stock en RPS${stock.reservado > 0 ? ` (${meters(stock.metros)} m − ${meters(stock.reservado)} m reservados por otros pedidos)` : ''}${propio}${need}${consignment}`,
      tone: 'aviso',
      title
    };
  }
  const rolls = stock.bobinasConDisponible === 1 ? '1 bobina' : `${stock.bobinasConDisponible} bobinas`;
  const biggest = stock.bobinasConDisponible > 1 ? ` (la mayor, ${meters(stock.mayorBobinaDisponible)} m)` : '';
  let text = `Stock RPS: ${resta}${meters(stock.disponible)} m disponibles en ${rolls}${biggest}${propio}${need}`;
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
  if (stock.consignacion > 0) lines.push(`De ello en consignación (cuenta como stock): ${meters(stock.consignacion)} m`);
  lines.push('Disponible = stock en almacén menos lo reservado por otros pedidos en RPS. Lo reservado para este pedido no se resta.');
  if (stock.consultado) lines.push(`Consultado a las ${new Date(stock.consultado).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
  return lines.join('\n');
}

// ES2023 admite useGrouping: 'always' (en es-ES pone el punto de miles también en 4 cifras).
const metersFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, useGrouping: 'always' } as unknown as Intl.NumberFormatOptions);

function meters(value: number) {
  return metersFormat.format(value);
}

// Una lona y sus marcas del mismo ancho (GET /api/catalog/fabrics/grupo). Cada pedido sale de una
// sola bobina (Iván, 26/11/2026): llega si alguna bobina sola tiene sitio, no por el total. Lo usan
// Planos a corte y la ventana de lonas al generar.
export interface GrupoLonaStock { nombre: string | null; mismoAncho: string[]; masAnchas: { codigo: string; ancho: number }[] }

export function resumenGrupoLona(codigo: string, grupo: GrupoLonaStock | null, stocks: Record<string, FabricStock>, necesita: number | null) {
  const marcas = (grupo?.mismoAncho ?? [codigo]).filter((c) => stocks[c]).map((c) => stocks[c]);
  const disponible = Math.round(marcas.reduce((total, s) => total + s.disponible, 0) * 10) / 10;
  const mejor = [...marcas].sort((a, b) => b.mayorBobinaDisponible - a.mayorBobinaDisponible)[0];
  const mayor = mejor?.mayorBobinaDisponible ?? 0;
  const ancha = necesita === null || mayor >= necesita ? undefined : (grupo?.masAnchas ?? [])
    .map((a) => ({ ...a, bobina: stocks[a.codigo]?.mayorBobinaDisponible ?? 0 }))
    .filter((a) => a.bobina >= necesita).sort((a, b) => a.ancho - b.ancho || b.bobina - a.bobina)[0];
  let veredicto: { texto: string; llega: boolean } | null = null;
  if (necesita !== null) {
    veredicto = mayor >= necesita
      ? { llega: true, texto: `✔ Llega con una bobina${marcas.length > 1 && mejor ? ` de ${mejor.code}` : ''}` }
      : { llega: false, texto: ancha
        ? `No llega ninguna bobina de este ancho; hay una de ${ancha.ancho} AN con ${meters(ancha.bobina)} m (${ancha.codigo})`
        : disponible >= necesita
          ? `No llega: ninguna bobina sola tiene ${meters(necesita)} m (la mayor, ${meters(mayor)} m)`
          : `No llega: faltan ${meters(Math.round((necesita - disponible) * 100) / 100)} m` };
  }
  return { marcas, disponible, mayor, mejor, ancha, veredicto };
}
