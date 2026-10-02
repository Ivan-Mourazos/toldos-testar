import type { AlmacenPedidosRemolques } from "./almacen.ts";
import type { ClienteRpsPedido, PedidoRemolques } from "./tipos.ts";

// Completar el código de cliente de RPS de los pedidos de remolques guardados antes de que se
// guardara (02/10/2026). Lo usa scripts/completar-codigo-cliente-remolques.mjs: busca cada número
// en RPS (solo lectura) y apunta su cliente en el pedido, sin tocar nada más. Repetirlo no cambia lo
// que ya tiene código. Aquí no hay RPS: la consulta llega como función, así se prueba sin él.

/** El cliente de RPS de un número de pedido, o null si RPS no tiene ese pedido. */
export type BuscarClienteRps = (numeroPedido: string) => Promise<ClienteRpsPedido | null>;

interface PedidoVisto {
  orderCode: string;
  numeroPedido: string;
  /** El nombre escrito en el pedido, para comparar a ojo con el de RPS. */
  cliente: string;
}

export interface PedidoCompletado {
  orderCode: string;
  numeroPedido: string;
  /** El nombre escrito en el pedido. */
  clienteEscrito: string;
  /** El de RPS, que es lo que se apunta. */
  cliente: ClienteRpsPedido;
}

export interface ResultadoCompletar {
  completados: PedidoCompletado[];
  noEncontrados: PedidoVisto[];
  fallos: (PedidoVisto & { motivo: string })[];
  /** Los que ya tenían código (también el que lo ganó mientras se miraba RPS). */
  yaTenian: number;
}

const visto = (pedido: PedidoRemolques): PedidoVisto => ({
  orderCode: pedido.orderCode,
  numeroPedido: pedido.numeroPedido,
  cliente: pedido.summary.customer ?? "",
});

const limpio = (cliente: ClienteRpsPedido | null): ClienteRpsPedido | null => {
  const codigo = String(cliente?.codigo ?? "").trim();
  return codigo ? { codigo, nombre: String(cliente?.nombre ?? "").trim() } : null;
};

/**
 * Pregunta a RPS, uno a uno, por los pedidos sin `clienteRps`. Simulando no escribe; si no, vuelve a
 * leer cada pedido justo antes de escribirlo (por si se guardó mientras tanto) y solo le añade
 * `clienteRps`, con la escritura atómica del almacén.
 */
export async function completarClienteRps({ almacen, buscarCliente, simular }: {
  almacen: Pick<AlmacenPedidosRemolques, "listar" | "obtener" | "guardar">;
  buscarCliente: BuscarClienteRps;
  simular: boolean;
}): Promise<ResultadoCompletar> {
  const resultado: ResultadoCompletar = {
    completados: [],
    noEncontrados: [],
    fallos: [],
    yaTenian: 0,
  };
  for (const pedido of await almacen.listar()) {
    if (pedido.clienteRps?.codigo) {
      resultado.yaTenian += 1;
      continue;
    }
    let cliente: ClienteRpsPedido | null;
    try {
      cliente = limpio(await buscarCliente(pedido.numeroPedido));
    } catch (error) {
      resultado.fallos.push({ ...visto(pedido), motivo: error instanceof Error ? error.message : String(error) });
      continue;
    }
    if (!cliente) {
      resultado.noEncontrados.push(visto(pedido));
      continue;
    }
    if (!simular) {
      const actual = await almacen.obtener(pedido.orderCode);
      if (!actual) {
        resultado.fallos.push({ ...visto(pedido), motivo: "el pedido ya no está en la carpeta interna" });
        continue;
      }
      if (actual.clienteRps?.codigo) {
        resultado.yaTenian += 1;
        continue;
      }
      await almacen.guardar({ ...actual, clienteRps: cliente });
    }
    resultado.completados.push({ orderCode: pedido.orderCode, numeroPedido: pedido.numeroPedido, clienteEscrito: pedido.summary.customer ?? "", cliente });
  }
  return resultado;
}


/** El informe corto que escribe el comando. */
export function informeCompletar(r: ResultadoCompletar, { simular }: { simular: boolean }): string[] {
  const lineas: string[] = [];
  if (simular) lineas.push("SIMULACIÓN: no se ha escrito nada.");
  lineas.push(`Pedidos sin código de cliente de RPS: ${r.completados.length + r.noEncontrados.length + r.fallos.length}.`);
  const n = r.completados.length;
  lineas.push(`${simular ? "Se completarían" : "Completados:"} ${n}${n ? ":" : "."}`);
  for (const c of r.completados) {
    lineas.push(`  ${c.numeroPedido} → ${c.cliente.codigo} ${c.cliente.nombre}${c.clienteEscrito ? ` (en el pedido: ${c.clienteEscrito})` : ""}`);
  }
  if (r.noEncontrados.length) {
    lineas.push(`No están en RPS (se quedan sin código): ${r.noEncontrados.length}:`);
    for (const p of r.noEncontrados) lineas.push(`  ${p.numeroPedido}${p.cliente ? ` (${p.cliente})` : ""}`);
  }
  if (r.fallos.length) {
    lineas.push(`No se pudo mirar en RPS: ${r.fallos.length}:`);
    for (const p of r.fallos) lineas.push(`  ${p.numeroPedido}: ${p.motivo}`);
  }
  return lineas;
}
