import { describe, expect, it } from "vitest";
import { emptyLona } from "../../entradas-vacias.ts";
import { DEFAULT_PARAMS } from "../params.ts";
import { calcLona, detrasDistinto, type LonaInput } from "../lona.ts";

const base: LonaInput = {
  cabecera: {
    numeroPedido: "AR2602796", version: "10", cliente: "REMOLQUES YAGÜE",
    revision: "JAIME", realizadoPor: "ADRIAN", fecha: "2026-06-11", fechaSalida: "",
  },
  cantidad: 1, largo: 250, ancho: 151,
  altoDelante: 62, altoAtras: 62, aguas: 0,
  contorno: 275,
  tipoPerfil: "TIPO 02",
  recogeDelante: "NO", recogeAtras: "CREMALLERA",
  bastillaEnfundar: false, ventana: false,
  rotulacion: true,
  modoOllaos: "REPARTIDOS", pasoOllaos: 35,
  ollaosManuales: { laterales: [], atras: [], delante: [] },
  material: "LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN",
  observaciones: "",
};

describe("calcLona — caso real AR2602796", () => {
  const res = calcLona(base, DEFAULT_PARAMS);

  it("lona hecha 251 x 152", () => {
    expect(res.lonaHecha).toEqual({ largo: 251, ancho: 152, anchoAtras: 152 });
  });
  it("paños delantero/trasero 154 x 66,5", () => {
    expect(res.panoDelantero).toMatchObject({ ancho: 154, alto: 66.5 });
    expect(res.panoTrasero).toMatchObject({ ancho: 154, alto: 66.5 });
  });
  it("calcula el paño contorno 253 x 282 sumando 7 de bastillas", () => {
    expect(res.panoContorno).toMatchObject({ ancho: 253, alto: 282 });
  });
  it("textos de recogida", () => {
    expect(res.recogeDelanteTexto).toBe("NO");
    expect(res.recogeAtrasTexto).toBe("CREMALLERA");
  });
  it("metros de tela = (154+154+253)/100", () => {
    expect(res.metrosTela).toBe(5.61);
  });
});

describe("calcLona — variantes", () => {
  it("bastilla de enfundar suma 13 al paño contorno", () => {
    const res = calcLona({ ...base, bastillaEnfundar: true }, DEFAULT_PARAMS);
    expect(res.panoContorno?.ancho).toBe(263);
    expect(res.notas.join(" ")).toContain("enfundar");
  });
  it("suma 7 de bastillas en los perfiles sin curva", () => {
    for (const tipoPerfil of ["TIPO 01", "TIPO 02", "TIPO 04"] as const) {
      const res = calcLona({ ...base, tipoPerfil, contorno: 275 }, DEFAULT_PARAMS);
      expect(res.ajusteContorno).toBe(7);
      expect(res.contornoAjustado).toBe(282);
    }
  });
  it("suma 7 de bastillas y 1,5 adicional en los perfiles con curva", () => {
    for (const tipoPerfil of ["TIPO 03", "TIPO 05"] as const) {
      const res = calcLona({ ...base, tipoPerfil, contorno: 321.6 }, DEFAULT_PARAMS);
      expect(res.ajusteContorno).toBe(8.5);
      expect(res.contornoAjustado).toBe(330.1);
      expect(res.panoContorno?.alto).toBe(330.1);
    }
  });
  it("el ajuste de contorno sale de los parámetros", () => {
    const params = { ...DEFAULT_PARAMS, ajusteContornoBase: 9, ajusteContornoCurva: 2 };
    expect(calcLona({ ...base, tipoPerfil: "TIPO 01" }, params).ajusteContorno).toBe(9);
    expect(calcLona({ ...base, tipoPerfil: "TIPO 05" }, params).ajusteContorno).toBe(11);
  });
  it("mantiene el resultado de registros históricos con contorno SCAD", () => {
    const res = calcLona({
      ...base, contorno: undefined, tipoPerfil: "TIPO 05", contornoScad: 321.6,
    }, DEFAULT_PARAMS);
    expect(res.contornoIntroducido).toBe(313.1);
    expect(res.contornoAjustado).toBe(321.6);
  });
  it("PUENTES LATERALES: paño trasero usa columna DELANTE (paridad Excel, P1)", () => {
    const res = calcLona({ ...base, recogeAtras: "PUENTES LATERALES" }, DEFAULT_PARAMS);
    expect(res.panoTrasero.ancho).toBe(151 + 41); // no 151 + 21
    expect(res.panoContorno?.ancho).toBe(253 + 9); // lateralSoloAtras
  });
  it("GOMA delante: demasía 27 y nota de orejas", () => {
    const res = calcLona({ ...base, recogeDelante: "GOMA" }, DEFAULT_PARAMS);
    expect(res.panoDelantero.ancho).toBe(178);
    expect(res.notas.join(" ")).toContain("GOMA");
  });
  it("una recogida que ya no existe avisa en el elemento y se calcula sin recogida", () => {
    const res = calcLona({ ...base, recogeDelante: "PUENTES VIEJOS" }, DEFAULT_PARAMS);
    expect(res.notas).toContain("Falta la recogida «PUENTES VIEJOS» de delante: ya no está en Parámetros ni en las fichas; se calcula sin recogida.");
    expect(calcLona(base, DEFAULT_PARAMS).notas.join(" ")).not.toContain("Falta");
  });
  it("sin contorno manual: paño contorno null y metros tela 0", () => {
    const res = calcLona({ ...base, contorno: 0 }, DEFAULT_PARAMS);
    expect(res.panoContorno).toBeNull();
    expect(res.metrosTela).toBe(0);
  });
  it("remolque sesgado: cada cara usa su ancho (paños y ollaos)", () => {
    const res = calcLona({ ...base, recogeAtras: "NO", anchoAtras: 140 }, DEFAULT_PARAMS);
    expect(res.panoDelantero.ancho).toBe(154); // 151 + 3
    expect(res.panoTrasero.ancho).toBe(143);   // 140 + 3
    expect(res.lonaHecha).toEqual({ largo: 251, ancho: 152, anchoAtras: 141 });
    // ollaos de cada cara sobre su propio ancho hecho
    expect(res.reparto.delante.at(-1)).toBe(149.5); // 152 - 2,5
    expect(res.reparto.atras.at(-1)).toBe(138.5);   // 141 - 2,5
  });

  it("alto detrás vacío (0) = igual que delante", () => {
    const res = calcLona({ ...base, altoAtras: 0 }, DEFAULT_PARAMS);
    expect(res.panoTrasero.alto).toBe(res.panoDelantero.alto);
  });

  it("sin ancho trasero indicado, ambas caras usan el mismo", () => {
    const res = calcLona({ ...base, anchoAtras: 0 }, DEFAULT_PARAMS);
    expect(res.lonaHecha.anchoAtras).toBe(152);
    expect(res.reparto.delante).toEqual(res.reparto.atras);
  });

  it("cambiar las alturas no altera el contorno calculado", () => {
    const res = calcLona({ ...base, altoAtras: 64 }, DEFAULT_PARAMS);
    expect(res.contornoAjustado).toBe(282);
    expect(res.panoContorno?.alto).toBe(282);
  });
  it("modo SEGUN SE INDICA usa las posiciones manuales", () => {
    const manuales = { laterales: [2.5, 37.6], atras: [2.5], delante: [2.5] };
    const res = calcLona({ ...base, modoOllaos: "SEGUN SE INDICA", ollaosManuales: manuales }, DEFAULT_PARAMS);
    expect(res.reparto).toEqual(manuales);
  });
  it("cantidad 2 duplica metros de tela", () => {
    const res = calcLona({ ...base, cantidad: 2 }, DEFAULT_PARAMS);
    expect(res.metrosTela).toBe(11.22);
  });
  it("recogida desconocida: usa fallback NO en medidas y en texto", () => {
    const res = calcLona({ ...base, recogeDelante: "INVENTADA" }, DEFAULT_PARAMS);
    expect(res.panoDelantero.ancho).toBe(154); // demasía de NO = 3
    expect(res.recogeDelanteTexto).toBe("NO");
  });
});

describe("sin modo de ollaos elegido", () => {
  it("no reparte ningún ollao", () => {
    const sinElegir = {
      ...emptyLona(), largo: 600, ancho: 250, altoDelante: 220,
      tipoPerfil: "TIPO 01" as const, contorno: 620,
    };
    const res = calcLona(sinElegir, DEFAULT_PARAMS);
    expect(res.reparto.laterales).toEqual([]);
    expect(res.reparto.atras).toEqual([]);
    expect(res.reparto.delante).toEqual([]);
  });

  it("elegir repartidos sí produce reparto", () => {
    const elegida = {
      ...emptyLona(), largo: 600, ancho: 250, altoDelante: 220,
      tipoPerfil: "TIPO 01" as const, contorno: 620,
      modoOllaos: "REPARTIDOS" as const,
    };
    expect(calcLona(elegida, DEFAULT_PARAMS).reparto.laterales.length).toBeGreaterThan(0);
  });
});

// Pedido de Hijos de Pedro López con el CAD de Iván (30/09/2026): el remolque es 1,5 cm más
// ancho detrás (130 delante, 131,5 detrás) y recoge con sus puentes delante y detrás.
describe("calcLona — Hijos de Pedro López, 1,5 cm más ancho detrás (CAD de Iván)", () => {
  const hpl: LonaInput = {
    ...base,
    largo: 211, ancho: 130, anchoAtras: 131.5,
    tipoPerfil: "TIPO 01", aguas: 0,
    recogeDelante: "PUENTES HIJOS DE PEDRO LOPEZ", recogeAtras: "PUENTES HIJOS DE PEDRO LOPEZ",
    modoOllaos: "REPARTIDOS", pasoOllaos: 35, primerOllao: 2.5,
  };
  const res = calcLona(hpl, DEFAULT_PARAMS);

  it("la recogida de HPL mide el paño trasero con el ancho de delante", () => {
    expect(DEFAULT_PARAMS.recogidas.filter((r) => r.panoTraseroConAnchoDelante).map((r) => r.nombre))
      .toEqual(["PUENTES HIJOS DE PEDRO LOPEZ"]);
  });
  it("paño delantero 172,5 y paño trasero también 172,5 (no 174): sus 42,5 ya llevan el 1,5", () => {
    expect(res.panoDelantero.ancho).toBe(172.5);
    expect(res.panoTrasero.ancho).toBe(172.5);
  });
  it("la lona hecha sí es más ancha detrás: 131 delante, 132,5 detrás", () => {
    expect(res.lonaHecha).toMatchObject({ ancho: 131, anchoAtras: 132.5 });
  });
  it("los ollaos repartidos con paso 35 dan los del CAD delante y detrás", () => {
    expect(res.reparto.delante).toEqual([2.5, 34, 65.5, 97, 128.5]);
    expect(res.reparto.atras).toEqual([2.5, 34.4, 66.3, 98.1, 130]);
  });
  it("otra recogida sigue midiendo el paño trasero con el ancho de detrás", () => {
    const goma = calcLona({ ...hpl, recogeDelante: "GOMA", recogeAtras: "GOMA" }, DEFAULT_PARAMS);
    expect(goma.panoTrasero.ancho).toBe(158.5);
  });
  it("unos Parámetros sin la marca (los de antes) dan el paño trasero de siempre", () => {
    const sinMarca = {
      ...DEFAULT_PARAMS,
      recogidas: DEFAULT_PARAMS.recogidas.map(({ panoTraseroConAnchoDelante: _marca, ...r }) => r),
    };
    expect(calcLona(hpl, sinMarca).panoTrasero.ancho).toBe(174);
  });
});

// Con el remolque distinto detrás el paño contorno se corta en trapecio: una medida en cada
// punta. CAD de Iván (30/09/2026): 169,3 delante y 170,8 detrás, largo del paño 234,5. El CAD no
// trae el alto del remolque, así que aquí se introducen los contornos (TIPO 01, +7 de bastillas).
describe("calcLona — contorno detrás con el remolque sesgado", () => {
  const sesgada: LonaInput = {
    ...base,
    largo: 211, ancho: 130, anchoAtras: 131.5, altoDelante: 40, altoAtras: 40,
    tipoPerfil: "TIPO 01", aguas: 0, contorno: 162.3, contornoAtras: 163.8,
    recogeDelante: "PUENTES HIJOS DE PEDRO LOPEZ", recogeAtras: "PUENTES HIJOS DE PEDRO LOPEZ",
  };
  const res = calcLona(sesgada, DEFAULT_PARAMS);

  it("ajusta el contorno de detrás igual que el de delante", () => {
    expect(res.contornoAjustado).toBe(169.3);
    expect(res.contornoAtrasIntroducido).toBe(163.8);
    expect(res.contornoAtrasAjustado).toBe(170.8);
  });
  it("el paño contorno lleva las dos puntas: 234,5 × 169,3 delante / 170,8 detrás", () => {
    expect(res.panoContorno).toEqual({ ancho: 234.5, alto: 169.3, altoAtras: 170.8, etiqueta: "PAÑO CONTORNO" });
  });
  it("los metros de tela no cambian: salen del largo de los paños", () => {
    expect(res.metrosTela).toBe(5.8);
  });
  it("sin contorno detrás todavía, sale a cero y el paño no lleva punta trasera", () => {
    const sinAtras = calcLona({ ...sesgada, contornoAtras: undefined }, DEFAULT_PARAMS);
    expect(sinAtras.contornoAtrasAjustado).toBe(0);
    expect(sinAtras.panoContorno).not.toHaveProperty("altoAtras");
  });
  it("un alto distinto detrás también cuenta como remolque distinto detrás", () => {
    const alta = calcLona({ ...sesgada, anchoAtras: 0, altoAtras: 45 }, DEFAULT_PARAMS);
    expect(alta.panoContorno?.altoAtras).toBe(170.8);
  });
  it("igual delante y detrás el resultado no cambia de forma, aunque haya un contorno detrás guardado", () => {
    const recta = calcLona({ ...sesgada, anchoAtras: 130, altoAtras: 40 }, DEFAULT_PARAMS);
    expect(recta).not.toHaveProperty("contornoAtrasIntroducido");
    expect(recta).not.toHaveProperty("contornoAtrasAjustado");
    expect(recta.panoContorno).toEqual({ ancho: 234.5, alto: 169.3, etiqueta: "PAÑO CONTORNO" });
  });
  it("detrasDistinto: otro ancho u otro alto detrás; cero es «igual»", () => {
    expect(detrasDistinto({ ancho: 130, anchoAtras: 131.5, altoDelante: 40, altoAtras: 40 })).toBe(true);
    expect(detrasDistinto({ ancho: 130, anchoAtras: 0, altoDelante: 40, altoAtras: 45 })).toBe(true);
    expect(detrasDistinto({ ancho: 130, anchoAtras: 130, altoDelante: 40, altoAtras: 0 })).toBe(false);
    expect(detrasDistinto({ ancho: 130, altoDelante: 40, altoAtras: 40 })).toBe(false);
  });
});
