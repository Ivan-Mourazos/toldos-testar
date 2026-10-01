import { reviewerName } from "../../reviewRules.js";
import { normalizarParams } from "../calc/validar-params.ts";
import { agruparPorPedido } from "../pedidos/agrupar-pedido.ts";
import { normalizarNumeroPedido } from "../pedidos/numero-pedido.ts";
import { FORMA_PEDIDO_RPS } from "../rps/numero-pedido.ts";
import type { PlanteamientoRecord } from "../store/types.ts";
import type { AlmacenPedidosRemolques } from "./almacen.ts";
import { resumenPedido } from "./pedido.ts";
import {
  ESQUEMA_PEDIDO_REMOLQUES, TIPO_PEDIDO_REMOLQUES, type ElementoGuardado, type FicheroGenerado, type PedidoRemolques,
} from "./tipos.ts";

// Paso desde la web vieja de remolques (fase 5, apartado 6). Se ejecuta una vez en el .90 con
// scripts/migrar-remolques.mjs: lee data/planteamientos.json (y data/pedidos.json si existe) de
// /webs/remolques-tgm y crea un pedido por número en la carpeta interna. No toca la web vieja ni
// escribe en las carpetas compartidas; repetirlo no duplica (lo que ya está no se pisa).

/** El estado de revisión de la web vieja (Remolques-TGM/src/lib/pedidos/estado-pedido.ts). */
export interface EstadoPedidoViejo {
  pedido: string;
  numeroPedido: string;
  revision: { estado: "EN_REVISION" | "APROBADO" | "NO_APROBADO"; por: string; en: string };
  ultimaDecision: { estado: "APROBADO" | "NO_APROBADO"; por: string; en: string } | null;
  produccion: { por: string; en: string; nombrePdf: string; rutas: string[] } | null;
  updatedAt: string;
}

export interface OmitidoMigracion {
  numeroPedido: string;
  ids: string[];
  motivo: string;
}

export interface PlanMigracion {
  crear: PedidoRemolques[];
  /** Pedidos que ya estaban en la web nueva: no se tocan. */
  yaEstan: string[];
  omitidos: OmitidoMigracion[];
  /** Guardados repetidos del mismo elemento en la web vieja: se pasa solo el último. */
  repetidos: { orderCode: string; descartados: number }[];
}

const masReciente = (fechas: string[]) => fechas.reduce((max, fecha) => (fecha > max ? fecha : max), "");
const masAntigua = (fechas: string[]) => fechas.reduce((min, fecha) => (!min || (fecha && fecha < min) ? fecha : min), "");
const nombreDe = (ruta: string) => ruta.split(/[\\/]/).pop() ?? ruta;
const claveDe = (registro: PlanteamientoRecord) => normalizarNumeroPedido(registro.numeroPedido) || `SIN-PEDIDO:${registro.id}`;

export async function planificarMigracion({ registros, estados, existentes, archivados, tecnicos, ahora }: {
  registros: PlanteamientoRecord[];
  estados: EstadoPedidoViejo[];
  /** Los pedidos que ya hay en la carpeta interna (orderCode). */
  existentes: Set<string>;
  /** Los PDF de ese pedido que ya están en las carpetas de remolques (solo se mira, nunca se escribe). */
  archivados: (numeroPedido: string, fecha: string) => Promise<FicheroGenerado[]>;
  /** La lista de técnicos de toldos: «IVAN» de la web vieja pasa a «IVÁN». */
  tecnicos: string[];
  ahora: string;
}): Promise<PlanMigracion> {
  const plan: PlanMigracion = { crear: [], yaEstan: [], omitidos: [], repetidos: [] };
  for (const grupo of agruparPorPedido(registros)) {
    const todos = registros.filter((registro) => claveDe(registro) === grupo.clave);
    const ids = todos.map((registro) => registro.id);
    if (grupo.clave.startsWith("SIN-PEDIDO:")) {
      plan.omitidos.push({ numeroPedido: "", ids, motivo: "No tiene número de pedido." });
      continue;
    }
    if (!FORMA_PEDIDO_RPS.test(grupo.clave)) {
      plan.omitidos.push({ numeroPedido: grupo.numeroPedido, ids, motivo: `«${grupo.numeroPedido}» no tiene forma de número de pedido (dos letras y cinco cifras o más).` });
      continue;
    }
    if (existentes.has(grupo.clave)) {
      plan.yaEstan.push(grupo.clave);
      continue;
    }
    if (todos.length > grupo.remolques.length) {
      plan.repetidos.push({ orderCode: grupo.clave, descartados: todos.length - grupo.remolques.length });
    }

    // Tal cual: entrada, resultado y parámetros del momento. Así los resultados son los de la web vieja.
    const elementos: ElementoGuardado[] = grupo.remolques.map((registro) => ({
      version: registro.version, tipo: registro.tipo, input: registro.input, result: registro.result, paramsSnapshot: registro.paramsSnapshot,
    }));
    const ultimo = [...grupo.remolques].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const technician = reviewerName(ultimo.input.cabecera.realizadoPor, tecnicos);
    const reviewer = reviewerName(ultimo.input.cabecera.revision, tecnicos);
    const estado = estados.find((item) => normalizarNumeroPedido(item.pedido || item.numeroPedido) === grupo.clave) ?? null;
    const ultimoCambio = masReciente(todos.map((registro) => registro.updatedAt));
    const produccion = estado?.produccion ?? null;
    // Como estadoVisiblePedido de la web vieja: si se tocó después de archivar, está pendiente.
    const cambiosDespues = Boolean(produccion && (ultimoCambio > produccion.en || (estado && estado.revision.en > produccion.en)));
    const enCarpetas = await archivados(ultimo.numeroPedido, ultimo.input.cabecera.fecha);
    const generado = !cambiosDespues && (Boolean(produccion && produccion.rutas.length === 2) || enCarpetas.length > 0);
    const ficheros: FicheroGenerado[] = produccion?.rutas.length
      ? produccion.rutas.map((ruta) => ({ type: "pdf", filename: nombreDe(ruta), savedPath: ruta }))
      : enCarpetas;
    const enGenerado = produccion?.en || ultimoCambio;
    const decision = estado?.ultimaDecision ?? null;

    plan.crear.push({
      schemaVersion: ESQUEMA_PEDIDO_REMOLQUES,
      kind: TIPO_PEDIDO_REMOLQUES,
      orderCode: grupo.clave,
      numeroPedido: ultimo.numeroPedido.trim(),
      status: generado ? "PRODUCED" : "PENDING_REVIEW",
      createdAt: masAntigua(todos.map((registro) => registro.createdAt)) || ultimoCambio,
      updatedAt: generado ? masReciente([enGenerado, ultimoCambio]) : ultimoCambio,
      createdBy: technician,
      reviewedAt: decision?.en ?? null,
      reviewedBy: decision?.estado === "APROBADO" ? reviewerName(decision.por, tecnicos) : reviewer,
      reviewNote: "",
      production: generado
        ? { createdAt: enGenerado, createdBy: produccion?.por ? reviewerName(produccion.por, tecnicos) : technician, files: ficheros }
        : null,
      summary: resumenPedido(elementos, { technician, reviewer }),
      params: normalizarParams(ultimo.paramsSnapshot),
      elementos,
      origen: { web: "remolques-tgm", ids, migradoEn: ahora },
    });
  }
  return plan;
}

export async function aplicarMigracion(plan: PlanMigracion, almacen: Pick<AlmacenPedidosRemolques, "crear">): Promise<{ creados: string[]; yaEstaban: string[] }> {
  const creados: string[] = [];
  const yaEstaban = [...plan.yaEstan];
  for (const pedido of plan.crear) {
    ((await almacen.crear(pedido)) === "creado" ? creados : yaEstaban).push(pedido.orderCode);
  }
  return { creados, yaEstaban };
}

export function informeMigracion(plan: PlanMigracion, { simular }: { simular: boolean }): string[] {
  const generados = plan.crear.filter((pedido) => pedido.status === "PRODUCED").length;
  const pendientes = plan.crear.length - generados;
  const lineas = [
    simular ? "SIMULACIÓN: no se ha escrito nada." : "Paso desde la web vieja de remolques:",
    `${simular ? "Se crearían" : "Se crean"} ${plan.crear.length} pedidos: ${generados} generados (a «Generados») y ${pendientes} pendientes (a «Por revisar»).`,
    ...plan.crear.map((pedido) => `  ${pedido.orderCode} · ${pedido.status === "PRODUCED" ? "generado" : "pendiente"} · ${pedido.elementos.length} ${pedido.elementos.length === 1 ? "elemento" : "elementos"} · ${pedido.summary.customer || "sin cliente"}`),
  ];
  if (plan.yaEstan.length) lineas.push(`Ya estaban en la web nueva (no se tocan): ${plan.yaEstan.join(", ")}.`);
  for (const r of plan.repetidos) {
    lineas.push(`${r.orderCode}: ${r.descartados} ${r.descartados === 1 ? "guardado repetido" : "guardados repetidos"} del mismo elemento; se pasa el último.`);
  }
  for (const o of plan.omitidos) {
    lineas.push(`Se deja sin pasar ${o.numeroPedido || "(sin número)"} (${o.ids.length} ${o.ids.length === 1 ? "planteamiento" : "planteamientos"}): ${o.motivo}`);
  }
  return lineas;
}
