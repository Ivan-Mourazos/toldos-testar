import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { erroresPlanteamiento } from "../../pedidos/validar-planteamiento.ts";
import { crearInputDesdeRps } from "../aplicar-linea.ts";
import { interpretarLineaRps, type FilaLineaRps } from "../interpretar-linea.ts";
import type { PedidoRps } from "../types.ts";

// Los textos de RPS de los dos pedidos del económico de Remolcar (estudio de ganado, 23/10/2026).
const fila = (comment: string, extra: Partial<FilaLineaRps> = {}): FilaLineaRps => ({
  IDOrderLine: "L1", NumLine: 10, CodArticle: "LONAREMGANA", CodManufacturingOrder: "0227757", Quantity: 1,
  Description: "LONA REMOLQUE GANADO", Comment: comment, Rotulado: null, TipoRotulacion: null, TextoRotulacion: null,
  ...extra,
});
const AR2601976 = "REFERENCIA: ECONOMICO\r\nPOR CONFECCION DE LONA REMOLQUE CABALLOS, FABRICADO EN LONA POLIESTER RECUBIERTO DE PVC 580 G/M², COLOR GRIS 7038";
const AR2600752 = "POR CONFECCION DE LONA REMOLQUE DE MEDIDAS 300 X 150 CM , MODELO ECONOMICO, FABRICADO EN LONA POLIESTER RECUBIERTO DE PVC 580 G/M², COLOR GRIS 7038";

describe("remolque de ganado desde RPS", () => {
  it("LONAREMGANA con «ECONOMICO» es el económico de Remolcar, con o sin medidas en el texto", () => {
    expect(interpretarLineaRps(fila(AR2601976))).toMatchObject({ tipoTrabajo: "ganado", modeloGanado: "REMOLCAR_ECONOMICO", cantidad: 1 });
    expect(interpretarLineaRps(fila(AR2600752, { Quantity: 2 }))).toMatchObject({ tipoTrabajo: "ganado", modeloGanado: "REMOLCAR_ECONOMICO", cantidad: 2 });
  });

  it("las demás de ganado siguen como lona, como hasta ahora", () => {
    const linea = interpretarLineaRps(fila("POR CONFECCION DE LONA REMOLQUE CABALLOS DE MEDIDAS 195 CM +112,5 CM X 160/70 CM X 10/47 CM"));
    expect(linea?.tipoTrabajo).toBe("lona");
    expect(linea?.modeloGanado).toBeUndefined();
    // Y un «económico» que no es de ganado tampoco.
    expect(interpretarLineaRps(fila(AR2600752, { CodArticle: "LONAREMOLQUE" }))?.tipoTrabajo).not.toBe("ganado");
  });

  it("crea el elemento con la cabecera, la cantidad y el material, listo salvo lo que falte", () => {
    const linea = interpretarLineaRps(fila(AR2600752, { Quantity: 2, CodManufacturingOrder: "0225519" }))!;
    const pedido: PedidoRps = { numero: "AR2600752", fecha: "2026-02-24", fechaSalida: "", cliente: { codigo: "C1", nombre: "JUAN BARREIRO, S. L.", alias: null }, lineas: [linea] };
    const creado = crearInputDesdeRps(pedido, { ...linea, materialSugerido: "LONA NS86 2L 630 g/m² :GRIS CLARO 7038 :250 AN (580)" }, 0, [], DEFAULT_PARAMS, "IVÁN");
    expect(creado.tipo).toBe("ganado");
    expect(creado.input).toMatchObject({
      ganado: "REMOLCAR_ECONOMICO", cantidad: 2, largo: 300, ancho: 150, arcosComprobados: false,
      cabecera: { numeroPedido: "AR2600752", ordenFabricacion: "0225519", realizadoPor: "IVÁN" },
    });
    expect(erroresPlanteamiento(creado.input)).toEqual([]);
  });
});
