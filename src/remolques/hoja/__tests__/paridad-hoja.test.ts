import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import referencia from "../../__fixtures__/hoja-produccion-2026-09.json";
import type { CalcParams } from "../../calc/params.ts";
import { datosHoja, type DatosHoja } from "../datos-hoja.ts";
import { tablaOllaos, type TablaPosiciones } from "../pagina.ts";
import type { ElementoHoja } from "../tipos.ts";

// Paridad con la web vieja (fase 4): los 32 planteamientos reales dan los mismos textos en
// cada casilla y en la tabla de ollaos. La referencia la generó el código de Remolques-TGM
// (commit a7ffef0) sobre la misma fixture. Diferencias a propósito, y solo esas: la fila nueva
// «BASTILLA ENFUNDAR» de los acabados de la lona, que la hoja vieja no tenía, el texto del PERFIL,
// porque Iván cambió el nombre de los tipos el 30/09/2026 (se ve solo el nombre, sin «TIPO 0X»; los
// códigos guardados no cambian), y el título «MEDIDA REMOLQUE» del baquetón, que desde el 05/10/2026
// es «MEDIDA LONA HECHA» como en la lona: esa medida no es la del remolque. Todo lo demás tiene que
// salir idéntico.
type Caso = { caso: string; tipo: "lona" | "baqueton"; input: unknown; result: unknown; paramsSnapshot: unknown };
type Referencia = { caso: string; hoja: DatosHoja; ollaos: TablaPosiciones };

/** Lo que la web vieja escribía en PERFIL → el nombre nuevo de Iván (30/09/2026), a mano: si la
 *  referencia trajera otro texto, la prueba falla en vez de aceptarlo. */
const PERFIL_RENOMBRADO: Record<string, string> = {
  "TIPO 01 · Recto": "Recto",
  "TIPO 02 · Dos aguas rectas": "Recto con aguas",
  "TIPO 03 · Dos aguas curvas": "Arquillado con aguas",
  "TIPO 04 · chaflanes": "Con chaflán",
  "TIPO 05 · esquinas curvas": "Arquillado",
};

/** La referencia de la web vieja con el PERFIL y el título de la medida renombrados; nada más cambia. */
function conPerfilRenombrado(hoja: DatosHoja): DatosHoja {
  return {
    ...hoja,
    banda: hoja.banda.map((celda) => (celda.titulo === "MEDIDA REMOLQUE" ? { ...celda, titulo: "MEDIDA LONA HECHA" } : celda)),
    grupos: hoja.grupos.map((grupo) => ({
      ...grupo,
      datos: grupo.datos.map((dato) => (dato.etiqueta !== "PERFIL" ? dato : {
        ...dato,
        valores: dato.valores.map((valor) => {
          if (valor === "—") return valor;
          const nuevo = PERFIL_RENOMBRADO[valor];
          if (!nuevo) throw new Error(`PERFIL de la web vieja sin nombre nuevo: «${valor}»`);
          return nuevo;
        }),
      })),
    })),
  };
}

function sinAnadidos(hoja: DatosHoja): DatosHoja {
  return {
    ...hoja,
    grupos: hoja.grupos.map((grupo) => ({ ...grupo, datos: grupo.datos.filter((dato) => dato.etiqueta !== "BASTILLA ENFUNDAR") })),
  };
}

describe("hoja de taller: paridad con la web vieja", () => {
  const lista = casos as Caso[];
  const esperadas = new Map((referencia as Referencia[]).map((r) => [r.caso, r]));

  it("hay 32 hojas de referencia, una por caso", () => {
    expect(lista.length).toBe(32);
    expect(esperadas.size).toBe(32);
    expect(lista.every((c) => esperadas.has(c.caso))).toBe(true);
  });

  it.each(lista.map((c) => [c.caso, c] as const))("%s da los mismos textos que la web vieja", (_nombre, caso) => {
    const elemento = { version: "10", tipo: caso.tipo, input: caso.input, result: caso.result } as ElementoHoja;
    const esperada = esperadas.get(caso.caso)!;
    expect(sinAnadidos(datosHoja(elemento, 0, 1))).toEqual(conPerfilRenombrado(esperada.hoja));
    const primerOllao = elemento.input.primerOllao ?? (caso.paramsSnapshot as CalcParams).primerOllao;
    expect(tablaOllaos(elemento.input, elemento.result.reparto, primerOllao)).toEqual(esperada.ollaos);
  });
});
