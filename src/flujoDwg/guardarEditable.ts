import { crearFlujoDwg, planosDe, type CorteConfirmado, type FicheroPlano } from './flujo.ts';

export interface DecisionCorteEditable {
  decisionCorte?: unknown;
  aceptarHuellaCorte?: unknown;
  confirmPlanoOverwrite?: unknown;
}
export interface CorteEditable {
  corteConfirmado?: CorteConfirmado;
  corteNoRegenerado?: boolean;
  corteSimulado?: boolean;
  /** Rutas de los planos que la web ha escrito para el pedido: solo esos puede sustituir en la carpeta del año. */
  planosWeb?: string[];
}

/** Prepara todas las decisiones antes de escribir. El llamador guarda y solo entonces limpia los borradores. */
export async function prepararGuardadoEditable({ flujo, orderCode, technician, usuario, datos, datosAnteriores, cambiosPedido, existente, entrada, produccion, preparar }: {
  flujo: ReturnType<typeof crearFlujoDwg>; orderCode: string; technician: string; usuario: string;
  datos: string; datosAnteriores?: string; cambiosPedido?: boolean; existente?: CorteEditable | null; entrada: DecisionCorteEditable; produccion: boolean;
  preparar: (carpeta: string) => Promise<{ ficheros: FicheroPlano[]; avisos: string[] }>;
}) {
  const estado = await flujo.estado(orderCode);
  if (!estado.activo) return null;
  const hayCorte = Boolean(estado.borrador || existente?.corteConfirmado || existente?.corteSimulado);
  const cambiado = hayCorte && (cambiosPedido ?? (datosAnteriores ? datosAnteriores !== datos : Boolean(estado.datos && estado.datos !== datos)));
  const eleccion = entrada.decisionCorte;
  if (cambiado && eleccion !== 'mantener' && eleccion !== 'regenerar') return { respuesta: { status: 409,
    cuerpo: { needsRegenerateConfirmation: true, error: 'Has cambiado datos y este pedido ya tiene corte. ¿Generar el corte de nuevo?' } } };
  const regenerar = eleccion === 'regenerar' || !hayCorte;
  // Se conservan aunque una simulación quite el corte confirmado (Iván, 19/11/2026).
  const propios = [...new Set([...existente?.planosWeb ?? [], ...existente?.corteConfirmado ? planosDe(existente.corteConfirmado).map(p => p.plano) : []])];
  const planosWeb = propios.length ? propios : undefined;
  if (regenerar && !produccion) return { metadata: { corteConfirmado: undefined, corteSimulado: true, corteNoRegenerado: false, planosWeb } as CorteEditable,
    avisos: ['Modo simulación: no se ha escrito el plano del corte.'], escribir: async () => {}, deshacer: async () => {}, limpiar: async () => [] as string[] };
  if (!regenerar && existente?.corteSimulado && !existente.corteConfirmado && !estado.borrador) return {
    metadata: { corteSimulado: true, corteNoRegenerado: cambiado || Boolean(existente.corteNoRegenerado), planosWeb } as CorteEditable,
    avisos: [] as string[], escribir: async () => {}, deshacer: async () => {}, limpiar: async () => [] as string[] };
  const accion = regenerar
    ? await flujo.prepararRegeneracion({ orderCode, technician, usuario, datos, revisado: existente?.corteConfirmado, propios, preparar })
    : await flujo.alGuardar({ orderCode, technician, usuario, datos, confirmOverwrite: true, revisado: existente?.corteConfirmado, propios,
      mantener: eleccion === 'mantener', pendienteAceptacion: Boolean(existente?.corteNoRegenerado),
      aceptarHuella: typeof entrada.aceptarHuellaCorte === 'string' ? entrada.aceptarHuellaCorte : undefined });
  if (!accion || ('respuesta' in accion && accion.respuesta)) return accion;
  if (!('corteConfirmado' in accion) || !accion.corteConfirmado) return null;
  // Un plano ajeno en la carpeta del año ya no llega aquí: el flujo no deja sustituirlo (Iván, 19/11/2026).
  const escritos = [...new Set([...propios, ...planosDe(accion.corteConfirmado).map(p => p.plano)])];
  return { ...accion, metadata: { corteConfirmado: accion.corteConfirmado, corteSimulado: false, planosWeb: escritos,
    corteNoRegenerado: eleccion === 'mantener' && (cambiado || Boolean(existente?.corteNoRegenerado)) } as CorteEditable,
    avisos: 'avisos' in accion ? accion.avisos as string[] : [], deshacer: 'deshacer' in accion ? accion.deshacer as () => Promise<void> : async () => {} };
}
