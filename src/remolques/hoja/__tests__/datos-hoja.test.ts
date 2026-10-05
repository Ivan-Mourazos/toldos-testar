import { describe, expect, it } from "vitest";
import { datosHoja, hojaBaqueton, hojaLona, textoPanos, tituloPagina } from "../datos-hoja.ts";
import { calcBaqueton, type BaquetonInput } from "../../calc/baqueton.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import type { PlanteamientoRecord } from "../../store/types.ts";

describe("textos sueltos de la hoja", () => {
  it("concuerda el plural de los paños con la cantidad", () => {
    expect(textoPanos(1, 160, 124.5)).toBe("1 PAÑO DE 160 × 124,5");
    expect(textoPanos(2, 160, 124.5)).toBe("2 PAÑOS DE 160 × 124,5");
  });

  it("numera la página solo cuando el pedido tiene más de una", () => {
    expect(tituloPagina("lona", 0, 1)).toBe("REMOLQUE");
    expect(tituloPagina("lona", 0, 3)).toBe("REMOLQUE · 1 DE 3");
    expect(tituloPagina("baqueton", 1, 3)).toBe("BAQUETÓN · 2 DE 3");
    expect(tituloPagina("baqueton", 0, 1)).toBe("BAQUETÓN");
  });
});

const hojaDeLona = (extra: Partial<LonaInput> = {}) => {
  const input: LonaInput = {
    ...emptyLona(),
    cantidad: 1, largo: 300, ancho: 157, altoDelante: 120, altoAtras: 0,
    tipoPerfil: "TIPO 05", radioEsquina: 8, contorno: 391,
    recogeDelante: "NO", recogeAtras: "GOMA",
    ventana: true, ventanaAncho: 148, ventanaAlto: 35, rotulacion: true,
    modoOllaos: "REPARTIDOS", material: "LONA ALPHA 1L 580", observaciones: "SIN NADA",
    ...extra,
  };
  return hojaLona(input, calcLona(input, DEFAULT_PARAMS));
};

describe("datos de la lona en la hoja", () => {
  it("reparte la banda en paños, lona hecha y contorno", () => {
    const hoja = hojaDeLona();
    expect(hoja.banda.map((celda) => celda.titulo))
      .toEqual(["PAÑOS A CORTAR", "MEDIDA LONA HECHA", "CONTORNO DE CORTE"]);
    expect(hoja.banda[0].lineas).toHaveLength(3);
    expect(hoja.banda[1].lineas[0]).toBe("301 × 158");
  });

  it("solo desdobla alto y ancho cuando delante y detrás difieren", () => {
    expect(hojaDeLona().banda[1].lineas[1]).toBe("ALTO 120");
    expect(hojaDeLona().banda[1].notas).toEqual([]);

    const sesgado = hojaDeLona({ altoAtras: 110, anchoAtras: 150 });
    expect(sesgado.banda[1].lineas[1]).toBe("ALTO 120 DEL. / 110 TRAS.");
    expect(sesgado.banda[1].notas).toEqual(["ANCHO 157 DEL. / 150 TRAS."]);
  });

  it("dice PENDIENTE cuando no hay contorno, y entonces no hay paño de contorno", () => {
    const hoja = hojaDeLona({ contorno: 0 });
    expect(hoja.banda[2].lineas).toEqual(["PENDIENTE"]);
    expect(hoja.banda[0].lineas).toHaveLength(2);
  });

  it("agrupa la forma y los acabados, y deja fuera el modo de ollaos", () => {
    const hoja = hojaDeLona();
    expect(hoja.grupos.map((grupo) => grupo.titulo)).toEqual(["FORMA", "ACABADOS"]);
    expect(hoja.grupos[0].datos[1].valores).toEqual(["RADIO ESQUINA 8 CM"]);
    const etiquetas = hoja.grupos.flatMap((grupo) => grupo.datos.map((dato) => dato.etiqueta));
    expect(etiquetas).not.toContain("OLLAOS");
  });

  it("saca los opcionales sin elegir como raya en vez de esconderlos", () => {
    const hoja = hojaDeLona({
      tipoPerfil: "", ventana: null, rotulacion: null, material: "", observaciones: "",
    });
    const acabados = hoja.grupos[1].datos;
    expect(acabados.find((dato) => dato.etiqueta === "VENTANA")!.valores).toEqual(["—"]);
    expect(acabados.find((dato) => dato.etiqueta === "ROTULACIÓN")!.valores).toEqual(["—"]);
    expect(hoja.grupos[0].datos[0].valores).toEqual(["—"]);
    expect(hoja.material).toBe("—");
    expect(hoja.observaciones).toBe("—");
  });

  it("da las medidas de la ventana cuando las hay y avisa cuando faltan", () => {
    expect(hojaDeLona().grupos[1].datos[2].valores).toEqual(["SÍ · 148 × 35 CM"]);
    expect(hojaDeLona({ ventanaAncho: 0, ventanaAlto: 0 }).grupos[1].datos[2].valores)
      .toEqual(["SÍ · MEDIDAS PENDIENTES"]);
    expect(hojaDeLona({ ventana: false }).grupos[1].datos[2].valores).toEqual(["NO"]);
  });

  // Añadido en la fase 4: la bastilla cambia el corte (demasía de contorno) y la hoja vieja no la decía.
  it("dice si lleva bastilla de enfundar, justo después de la ventana", () => {
    const acabados = (extra: Partial<LonaInput>) => hojaDeLona(extra).grupos[1].datos;
    expect(acabados({ bastillaEnfundar: true })[3]).toEqual({ etiqueta: "BASTILLA ENFUNDAR", valores: ["SÍ"] });
    expect(acabados({ bastillaEnfundar: false })[3].valores).toEqual(["NO"]);
    expect(acabados({ bastillaEnfundar: null })[3].valores).toEqual(["—"]);
  });

  // Añadido tras el plan: con el remolque distinto detrás el paño contorno se corta en trapecio y la
  // hoja enseña las dos puntas como la tarjeta de resultados (Hijos de Pedro López, CAD de Iván).
  describe("remolque sesgado (dos contornos)", () => {
    const sesgada = {
      largo: 211, ancho: 130, anchoAtras: 131.5, altoDelante: 40, altoAtras: 40,
      tipoPerfil: "TIPO 01", aguas: 0, contorno: 162.3, contornoAtras: 163.8,
      recogeDelante: "PUENTES HIJOS DE PEDRO LOPEZ", recogeAtras: "PUENTES HIJOS DE PEDRO LOPEZ",
    } satisfies Partial<LonaInput>;

    it("el paño de contorno y el contorno de corte llevan las dos puntas", () => {
      const hoja = hojaDeLona(sesgada);
      expect(hoja.banda[0].lineas[2]).toBe("1 PAÑO DE 234,5 × 169,3 DEL. / 170,8 TRAS.");
      expect(hoja.banda[2].lineas).toEqual(["169,3 DEL. / 170,8 TRAS."]);
    });
    it("sin el contorno de detrás todavía, la punta trasera sale con raya", () => {
      const hoja = hojaDeLona({ ...sesgada, contornoAtras: undefined });
      expect(hoja.banda[0].lineas[2]).toBe("1 PAÑO DE 234,5 × 169,3 DEL. / — TRAS.");
      expect(hoja.banda[2].lineas).toEqual(["169,3 DEL. / — TRAS."]);
    });
    it("con el remolque igual detrás no cambia nada aunque haya un contorno detrás guardado", () => {
      const hoja = hojaDeLona({ ...sesgada, anchoAtras: 130 });
      expect(hoja.banda[0].lineas[2]).toBe("1 PAÑO DE 234,5 × 169,3");
      expect(hoja.banda[2].lineas).toEqual(["169,3"]);
    });
  });
});

const entradaBaqueton = (extra: Partial<BaquetonInput> = {}): BaquetonInput => ({
  ...emptyBaqueton(),
  cantidad: 1, largo: 300, ancho: 157, baqueton: 12,
  clienteEspecifico: "GENERAL", rotulacion: false,
  modoOllaos: "REPARTIDOS", material: "LONA ALPHA 1L 580", observaciones: "",
  ...extra,
});

describe("datos del baquetón en la hoja", () => {
  it("identifica las dos caídas independientes en la hoja de taller", () => {
    const input = entradaBaqueton({ baquetonDelante: 18, baquetonDetras: 25 });
    const hoja = hojaBaqueton(input, calcBaqueton(input, DEFAULT_PARAMS));
    expect(hoja.banda[2].notas).toEqual(["DELANTERO 18 · NO EN LÍNEA", "TRASERO 25 · NO EN LÍNEA"]);
  });
  it("tiene sus tres celdas y no las de la lona", () => {
    const input = entradaBaqueton();
    const hoja = hojaBaqueton(input, calcBaqueton(input, DEFAULT_PARAMS));
    expect(hoja.banda.map((celda) => celda.titulo))
      .toEqual(["PAÑOS A CORTAR", "MEDIDA LONA HECHA", "BAQUETÓN"]);
    expect(hoja.banda[2].notas).toEqual(["EN LÍNEA"]);
    const etiquetas = hoja.grupos.flatMap((grupo) => grupo.datos.map((dato) => dato.etiqueta));
    expect(etiquetas).toEqual(["CLIENTE ESPECÍFICO", "ROTULACIÓN"]);
    expect(etiquetas).not.toContain("PERFIL");
    expect(etiquetas).not.toContain("VENTANA");
  });
});

describe("reparto por tipo de planteamiento", () => {
  it("da el título y el cuerpo que le tocan a cada tipo", () => {
    const input = entradaBaqueton();
    const registro = {
      id: "x", tipo: "baqueton", numeroPedido: "AR.26.04329", version: "10",
      cliente: "TALLERES CAL", input, result: calcBaqueton(input, DEFAULT_PARAMS),
      paramsSnapshot: DEFAULT_PARAMS, createdAt: "", updatedAt: "",
    } as PlanteamientoRecord;
    const hoja = datosHoja(registro, 1, 3);
    expect(hoja.titulo).toBe("BAQUETÓN · 2 DE 3");
    expect(hoja.banda[1].titulo).toBe("MEDIDA LONA HECHA");
  });
});
