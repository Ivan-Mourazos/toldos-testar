import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { errorPlanteamientoIncompleto, erroresPlanteamiento } from "../validar-planteamiento.ts";

// Una lona válida ya no es solo una lona medida: es una lona *decidida*. Las
// siete decisiones van explícitas aquí porque `emptyLona()` arranca sin ninguna
// tomada, y una lona a la que nadie ha mirado el perfil no debe pasar por buena.
const lonaValida = () => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583" },
  largo: 600,
  ancho: 250,
  altoDelante: 220,
  contorno: 620,
  material: "PVC 580 AZUL",
  tipoPerfil: "TIPO 01" as const,
  recogeDelante: "NO",
  recogeAtras: "NO",
  ventana: false,
  bastillaEnfundar: false,
  rotulacion: false,
  modoOllaos: "REPARTIDOS" as const,
});

describe("validación previa al guardado y PDF", () => {
  it("rechaza las medidas y datos de producción vacíos", () => {
    const campos = erroresPlanteamiento(emptyLona()).map((error) => error.campo);
    expect(campos).toEqual(expect.arrayContaining([
      "numeroPedido", "largo", "ancho", "altoDelante", "contorno", "material",
    ]));
  });

  it("permite los ollaos repartidos sin posiciones manuales", () => {
    expect(errorPlanteamientoIncompleto(lonaValida())).toBeNull();
  });

  it("exige la geometría propia de los perfiles especiales", () => {
    expect(erroresPlanteamiento({ ...lonaValida(), tipoPerfil: "TIPO 03", aguas: 0 }))
      .toContainEqual(expect.objectContaining({ campo: "aguas" }));
    expect(erroresPlanteamiento({ ...lonaValida(), tipoPerfil: "TIPO 04", chaflan: 0 }))
      .toContainEqual(expect.objectContaining({ campo: "chaflan" }));
    expect(erroresPlanteamiento({ ...lonaValida(), tipoPerfil: "TIPO 05", radioEsquina: 0 }))
      .toContainEqual(expect.objectContaining({ campo: "radioEsquina" }));
  });

  it("exige las dos medidas cuando el remolque lleva ventana", () => {
    const sinMedidas = erroresPlanteamiento({ ...lonaValida(), ventana: true });
    expect(sinMedidas).toContainEqual(expect.objectContaining({ campo: "ventanaAncho" }));
    expect(sinMedidas).toContainEqual(expect.objectContaining({ campo: "ventanaAlto" }));
    expect(errorPlanteamientoIncompleto({
      ...lonaValida(), ventana: true, ventanaAncho: 80, ventanaAlto: 45,
    })).toBeNull();
  });

  it("rechaza a medida si alguna cara está sin cubrir", () => {
    const input = {
      ...lonaValida(),
      modoOllaos: "SEGUN SE INDICA" as const,
      ollaosManuales: { laterales: [2.5, 35], atras: [], delante: [2.5, 35] },
    };
    expect(errorPlanteamientoIncompleto(input)).toMatch(/atrás/);
  });

  it("acepta a medida con las tres caras cubiertas", () => {
    const input = {
      ...lonaValida(),
      modoOllaos: "SEGUN SE INDICA" as const,
      ollaosManuales: { laterales: [2.5], atras: [2.5], delante: [2.5] },
    };
    expect(errorPlanteamientoIncompleto(input)).toBeNull();
  });
});

describe("las decisiones sin tomar son errores", () => {
  /** Una lona con todas las medidas puestas pero ninguna decisión tomada. */
  const conMedidas = () => ({
    ...emptyLona(),
    cabecera: { ...emptyLona().cabecera, numeroPedido: "AR2603583" },
    largo: 600, ancho: 250, altoDelante: 220, contorno: 620,
    material: "PVC 580 AZUL",
  });

  const campos = (input: ReturnType<typeof conMedidas>) =>
    erroresPlanteamiento(input).map((error) => error.campo);

  it("no deja completar una lona sin ninguna decisión tomada", () => {
    expect(campos(conMedidas())).toEqual(expect.arrayContaining([
      "tipoPerfil", "modoOllaos", "recogeDelante", "recogeAtras",
      "ventana", "rotulacion", "bastillaEnfundar",
    ]));
  });

  it("cada decisión tomada retira su error", () => {
    const decidida = {
      ...conMedidas(),
      tipoPerfil: "TIPO 01" as const,
      recogeDelante: "NO", recogeAtras: "NO",
      ventana: false, rotulacion: false, bastillaEnfundar: false,
      modoOllaos: "REPARTIDOS" as const,
    };
    expect(erroresPlanteamiento(decidida)).toEqual([]);
  });

  it("decir que no es una decisión, y basta", () => {
    // El valor no importa: importa que se haya dicho algo.
    const conVentana = { ...conMedidas(), ventana: true, ventanaAncho: 50, ventanaAlto: 35 };
    expect(campos(conVentana)).not.toContain("ventana");
  });

  it("el baquetón también exige su modo de ollaos y su rotulación", () => {
    const baqueton = {
      ...emptyBaqueton(),
      cabecera: { ...emptyBaqueton().cabecera, numeroPedido: "AR2603583" },
      largo: 600, ancho: 250, baqueton: 12, material: "PVC 580 AZUL",
    };
    const campos = erroresPlanteamiento(baqueton).map((error) => error.campo);
    expect(campos).toContain("modoOllaos");
    expect(campos).toContain("rotulacion");
  });
});

describe("ollaos según ganchos", () => {
  const conGanchos = (extra = {}) => ({
    ...lonaValida(),
    modoOllaos: "SEGUN GANCHOS" as const,
    ganchos: { laterales: [5, 300, 595], atras: [10, 125, 240], delante: [10, 125, 240] },
    ...extra,
  });
  const camposGanchos = (input: Parameters<typeof erroresPlanteamiento>[0]) =>
    erroresPlanteamiento(input).filter((e) => e.campo === "ganchos").map((e) => e.mensaje);

  it("con dos o más ganchos por lado dentro del remolque es válido y no pide ollaos a medida", () => {
    expect(errorPlanteamientoIncompleto(conGanchos())).toBeNull();
  });

  it("bloquea un lado con menos de dos ganchos", () => {
    expect(camposGanchos(conGanchos({ ganchos: { laterales: [5, 595], atras: [10, 240], delante: [10] } })))
      .toEqual(["Pon al menos dos ganchos en delante: los ollaos van entre ellos."]);
  });

  it("bloquea ganchos fuera del remolque, con el ancho trasero si va sesgado", () => {
    expect(camposGanchos(conGanchos({ ganchos: { laterales: [5, 700], atras: [10, 240], delante: [10, 240] } })))
      .toEqual(["Hay ganchos de laterales fuera del remolque (0 a 600 cm)."]);
    expect(camposGanchos(conGanchos({ anchoAtras: 200 })))
      .toEqual(["Hay ganchos de atrás fuera del remolque (0 a 200 cm)."]);
  });

  it("las medidas que bajan solo son un aviso, no un error", () => {
    expect(camposGanchos(conGanchos({ ganchos: { laterales: [595, 300, 5], atras: [10, 240], delante: [10, 240] } })))
      .toEqual([]);
  });

  it("la distancia del extremo solo se valida si lleva extremos", () => {
    expect(erroresPlanteamiento(conGanchos({ primerOllao: -1 })))
      .toContainEqual(expect.objectContaining({ campo: "primerOllao" }));
    expect(erroresPlanteamiento(conGanchos({ primerOllao: -1, ollaosExtremos: false })))
      .not.toContainEqual(expect.objectContaining({ campo: "primerOllao" }));
  });

  it("vale igual para el baquetón", () => {
    const baqueton = {
      ...emptyBaqueton(),
      cabecera: { ...emptyBaqueton().cabecera, numeroPedido: "AR2603583" },
      largo: 181, ancho: 121, baqueton: 22, material: "PVC 580 AZUL", rotulacion: false,
      modoOllaos: "SEGUN GANCHOS" as const,
      ganchos: { laterales: [10, 170], atras: [20], delante: [20, 100] },
    };
    expect(camposGanchos(baqueton)).toEqual(["Pon al menos dos ganchos en atrás: los ollaos van entre ellos."]);
  });
});
