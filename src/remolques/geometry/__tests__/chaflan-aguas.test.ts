import { describe, expect, it } from "vitest";
import { esquinaChaflan } from "../chaflan.ts";
import { perfilPuntos } from "../perfil.ts";
import { contornoCalculado } from "../contorno.ts";

// Medidas sintéticas: el pedido 5496 confirma la forma de medir, no estos valores.
const medidas = { ancho: 140, alto: 127, anchoPlanoSuperior: 60, aguas: 14, radioAbajo: 7, radioArriba: 7 };

describe("chaflán definido por el plano real y las aguas", () => {
  it("respeta el tramo plano entre tangencias y obtiene una pendiente distinta de 45°", () => {
    const e = esquinaChaflan({ ...medidas, chaflan: 0, modoChaflan: "plano-aguas" })!;
    expect(e).not.toBeNull();
    expect(e.entrada + e.tangenteArriba).toBeCloseTo(40, 9);
    expect(e.caida).toBe(14);
    expect(e.anguloPendiente).toBeCloseTo(Math.atan2(14, e.entrada), 10);
    expect(e.anguloPendiente).not.toBeCloseTo(Math.PI / 4, 2);
    expect(e.cara).toBeCloseTo(Math.hypot(e.entrada, 14), 9);
  });

  it("el dibujo conserva exactamente el plano y el alto total", () => {
    const puntos = perfilPuntos("TIPO 04", { ancho: 140, altoDelante: 127, alturaPico: 14,
      modoChaflan: "plano-aguas", anchoPlanoSuperior: 60, radioChaflanAbajo: 7, radioChaflanArriba: 7 });
    const techo = puntos.filter(([, y]) => Math.abs(y - 127) < 1e-9);
    expect(techo).toHaveLength(2);
    expect(techo[1][0] - techo[0][0]).toBeCloseTo(60, 8);
    for (let k = 0; k < puntos.length; k++) {
      const espejo = puntos[puntos.length - 1 - k];
      expect(puntos[k][0] + espejo[0]).toBeCloseTo(140, 8);
      expect(puntos[k][1]).toBeCloseTo(espejo[1], 8);
    }
  });

  it("calcula el contorno analítico con los giros reales de los cuatro arcos", () => {
    const e = esquinaChaflan({ ...medidas, chaflan: 0, modoChaflan: "plano-aguas" })!;
    const esperado = 2 * (127 - 14 - e.tangenteAbajo) + 2 * e.caraRecta + 60
      + 2 * (7 * e.giroAbajo + 7 * e.giroArriba);
    const contorno = contornoCalculado("TIPO 04", { ancho: 140, alto: 127, aguas: 14,
      modoChaflan: "plano-aguas", anchoPlanoSuperior: 60, radioChaflanAbajo: 7, radioChaflanArriba: 7 });
    expect(contorno).toBeCloseTo(esperado, 9);
    expect(contorno).toBeGreaterThan(360);
    expect(contorno).toBeLessThan(370);
  });

  it("sin radios obtiene los vértices directamente del plano y de las aguas", () => {
    expect(perfilPuntos("TIPO 04", { ancho: 140, altoDelante: 127, alturaPico: 14,
      modoChaflan: "plano-aguas", anchoPlanoSuperior: 60 })).toEqual([
        [0, 0], [0, 113], [40, 127], [100, 127], [140, 113], [140, 0],
      ]);
  });

  it("rechaza medidas imposibles y radios que no caben sin cambiarlos en silencio", () => {
    for (const cambio of [ { anchoPlanoSuperior: 140 }, { anchoPlanoSuperior: 0 },
      { aguas: 0 }, { aguas: 127 }, { aguas: NaN }, { radioArriba: 1000 }, { radioAbajo: 1000 } ]) {
      expect(esquinaChaflan({ ...medidas, ...cambio, chaflan: 14, modoChaflan: "plano-aguas" })).toBeNull();
    }
  });
});
