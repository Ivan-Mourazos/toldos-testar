import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { alturasCierre, orejaRecogida, tipoCierre } from "../cierres.ts";
import { escenaLona } from "./casos.ts";

describe("cierres de las esquinas", () => {
  it("reconoce cada recogida", () => {
    expect(["NO", "", "GOMA", "CREMALLERA", "VELCRO", "PUENTES ESVA", "PUENTES HIJOS DE PEDRO LOPEZ"].map(tipoCierre))
      .toEqual(["NO", "NO", "GOMA", "CREMALLERA", "VELCRO", "PUENTES", "PUENTES"]);
  });

  it("la oreja es la demasía de la recogida sobre «NO», repartida en las dos esquinas", () => {
    expect(orejaRecogida(DEFAULT_PARAMS, "GOMA")).toBe(12);
    expect(orejaRecogida(DEFAULT_PARAMS, "PUENTES HIJOS DE PEDRO LOPEZ")).toBe(19.8);
    expect(orejaRecogida(DEFAULT_PARAMS, "CREMALLERA")).toBe(0);
  });

  it("reparte a lo alto con margen arriba y abajo", () => {
    expect(alturasCierre(100)).toEqual([10, 30, 50, 70, 90]);
    expect(alturasCierre(15)).toEqual([7.5]);
  });

  it("cremallera a 5 cm de la esquina y hasta 4 cm por debajo de la cima", () => {
    const e = escenaLona({ recogeDelante: "CREMALLERA" })!;
    const c = e.cierres.find((x) => x.esquina === "delante-derecha")!;
    expect(c).toMatchObject({ tipo: "CREMALLERA", base: [100.5, 0, 301], alto: 100, oreja: 0, cremallera: { distancia: 5, hasta: 96 } });
    expect(c.haciaLateral).toEqual([0, 0, -1]);
    expect(e.cierres.find((x) => x.esquina === "atras-derecha")!.tipo).toBe("NO");
  });

  it("en un perfil a dos aguas la cima de la esquina es el hombro", () => {
    const e = escenaLona({ tipoPerfil: "TIPO 02", aguas: 20, recogeAtras: "CREMALLERA" })!;
    expect(e.cierres.find((x) => x.esquina === "atras-izquierda")!.cremallera).toEqual({ distancia: 5, hasta: 76 });
  });

  it("velcro de 3 cm en la oreja y puentes repartidos a lo alto", () => {
    const e = escenaLona({ recogeDelante: "VELCRO", recogeAtras: "PUENTES HIJOS DE PEDRO LOPEZ" })!;
    expect(e.cierres.find((x) => x.esquina === "delante-izquierda")).toMatchObject({ oreja: 12, velcro: { ancho: 3 }, alturas: [] });
    expect(e.cierres.find((x) => x.esquina === "atras-izquierda")).toMatchObject({ tipo: "PUENTES", oreja: 19.8, alturas: [10, 30, 50, 70, 90] });
  });
});

describe("ventana", () => {
  it("centrada en el frente, con sus medidas", () => {
    const e = escenaLona({ ventana: true, ventanaAncho: 50, ventanaAlto: 35 })!;
    expect(e.ventana).toEqual({ centro: [0, 77.5, 301], ancho: 50, alto: 35 });
    expect(escenaLona({ ventana: false })!.ventana).toBeNull();
  });
});

describe("cotas y etiquetas", () => {
  const e = escenaLona()!;
  it("largo, ancho y altos de la lona hecha en las vistas rectas", () => {
    const textos = (vista: string) => e.cotas.filter((c) => c.vistas.includes(vista as never)).map((c) => c.texto);
    expect(textos("delante")).toEqual(["201", "100"]);
    expect(textos("lateral")).toEqual(["301", "100", "100"]);
    expect(textos("tres-cuartos")).toEqual(["301", "201", "100"]);
  });
  it("la posición de cada ollao en la vista de su lado", () => {
    const delante = e.etiquetas.filter((x) => x.vistas.includes("delante"));
    expect(delante.map((x) => x.texto)).toEqual(["2,5", "100,5", "198,5"]);
    expect(delante[0].punto).toEqual([98, 8.5, 301]);
    expect(e.etiquetas.some((x) => x.vistas.includes("arriba"))).toBe(false);
  });
});
