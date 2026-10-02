import type { BaquetonInput } from "../../calc/baqueton.ts";
import type { CabeceraInput, LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { codigoPedido, resumenPedido } from "../pedido.ts";
import type { ElementoGuardado, PedidoRemolques } from "../tipos.ts";

// Pedidos de prueba del buscador (no es una prueba): tres pedidos de dos años con cuatro elementos
// de formas distintas. Los usan buscar.test.ts y servicio-buscar.test.ts.

const cabecera = (numeroPedido: string, version: string, cambios: Partial<CabeceraInput>): CabeceraInput => ({
  ...emptyLona().cabecera, numeroPedido, version, ...cambios,
});

export function lonaGuardada(numeroPedido: string, version: string, cambios: Partial<LonaInput>, cab: Partial<CabeceraInput>): ElementoGuardado {
  const input: LonaInput = {
    ...emptyLona(),
    largo: 250, ancho: 143, altoDelante: 88, tipoPerfil: "TIPO 05", radioEsquina: 8,
    recogeDelante: "NO", recogeAtras: "GOMA", bastillaEnfundar: false, ventana: false, rotulacion: false,
    modoOllaos: "REPARTIDOS", material: "LONA NS86 2L 630 g/m² :GRIS 7037",
    ...cambios,
    cabecera: cabecera(numeroPedido, version, cab),
  };
  return { version, tipo: "lona", input, result: {} as never, paramsSnapshot: DEFAULT_PARAMS };
}

export function baquetonGuardado(numeroPedido: string, version: string, cambios: Partial<BaquetonInput>, cab: Partial<CabeceraInput>): ElementoGuardado {
  const input: BaquetonInput = {
    ...emptyBaqueton(),
    largo: 260, ancho: 160, baqueton: 12, rotulacion: false, modoOllaos: "REPARTIDOS",
    material: "LONA ALPHA 1L 580 g/m² :AZUL 5015",
    ...cambios,
    cabecera: cabecera(numeroPedido, version, cab),
  };
  return { version, tipo: "baqueton", input, result: {} as never, paramsSnapshot: DEFAULT_PARAMS };
}

export function pedidoGuardado(elementos: ElementoGuardado[], cambios: Partial<PedidoRemolques> = {}): PedidoRemolques {
  const numeroPedido = elementos[0].input.cabecera.numeroPedido;
  return {
    schemaVersion: 1,
    kind: "remolques",
    orderCode: codigoPedido(numeroPedido),
    numeroPedido,
    status: "PENDING_REVIEW",
    createdAt: "2026-09-10T08:00:00.000Z",
    updatedAt: "2026-09-10T08:00:00.000Z",
    createdBy: "IVÁN",
    reviewedAt: null,
    reviewedBy: "",
    reviewNote: "",
    production: null,
    summary: resumenPedido(elementos, { technician: "IVÁN", reviewer: "" }),
    params: DEFAULT_PARAMS,
    elementos,
    ...cambios,
  };
}

/**
 * AR2604286 (A lona, B baquetón; cliente de RPS 000450), AR2605000 generado (A lona; 001300) y
 * AR2501234 del año pasado (A lona; guardado sin cliente de RPS).
 */
export const PEDIDOS_BUSQUEDA = (): PedidoRemolques[] => [
  pedidoGuardado([
    lonaGuardada("AR.26.04286", "10",
      { ventana: true, ventanaAncho: 40, ventanaAlto: 30, observaciones: "LLEVA CINTA REFLECTANTE" },
      { cliente: "TALLERES CAL", fecha: "2026-09-10", ordenFabricacion: "231780" }),
    baquetonGuardado("AR.26.04286", "11",
      { rotulacion: true },
      { cliente: "TALLERES CAL", fecha: "2026-09-10", ordenFabricacion: "231781" }),
  ], { clienteRps: { codigo: "000450", nombre: "TALLERES CAL, S.L." } }),
  pedidoGuardado([
    lonaGuardada("AR.26.05000", "10",
      {
        tipoPerfil: "TIPO 03", largo: 253, ancho: 152, anchoAtras: 153.5, altoDelante: 125, radioEsquina: 0,
        aguas: 16, radioCumbrera: 20, radioHombro: 10, recogeAtras: "CREMALLERA", bastillaEnfundar: true,
        material: "LONA NS86 2L 630 g/m² :GRIS CLARO 7038",
      },
      { cliente: "HIJOS DE PEDRO LÓPEZ, S.L.", fecha: "2026-09-20", ordenFabricacion: "240001" }),
  ], { status: "PRODUCED", updatedAt: "2026-09-21T08:00:00.000Z", clienteRps: { codigo: "001300", nombre: "HIJOS DE PEDRO LOPEZ, S.L." } }),
  pedidoGuardado([
    lonaGuardada("AR.25.01234", "10",
      {
        tipoPerfil: "TIPO 04", largo: 190, ancho: 136, altoDelante: 103, radioEsquina: 0, chaflan: 12,
        recogeDelante: "CREMALLERA", recogeAtras: "VELCRO",
      },
      { cliente: "REMOLQUES AYALA", fecha: "2025-12-01", ordenFabricacion: "199999" }),
  ], { createdAt: "2025-12-01T08:00:00.000Z", updatedAt: "2025-12-01T08:00:00.000Z" }),
];
