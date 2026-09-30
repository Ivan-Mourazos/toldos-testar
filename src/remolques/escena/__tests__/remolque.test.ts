import { describe, expect, it } from "vitest";
import {
  EJE_BAJO_CAJON, LANZA_LARGO, PILOTO, RUEDA_ANCHO, RUEDA_FUERA_CAJON, RUEDA_JOCKEY_RADIO, RUEDA_RADIO, SEPARACION_COTA,
} from "../constantes.ts";
import type { EscenaRemolque, Vista } from "../tipos.ts";
import { escenaBaqueton, escenaLona } from "./casos.ts";

// Iván, 30/09/2026: «indicar cuál es la parte delantera y la trasera… ruedas o enganche o algo».
// El remolque es genérico (no a escala del pedido): lanza con enganche de bola delante, un eje con
// dos ruedas y guardabarros a media caja y dos pilotos rojos en la cara de atrás del cajón.

const lona = escenaLona()!;

describe("remolque genérico bajo la lona", () => {
  const { chasis, cajon } = lona;

  it("la lona y el cajón no cambian", () => {
    expect(lona.cuerpo).toMatchObject({ tipo: "lona", largo: 301 });
    expect(cajon).toEqual({ largo: 300, anchoDelante: 200, anchoAtras: 200, alto: 40, zDesde: 0.5, zHasta: 300.5 });
  });

  it("las ruedas tocan el suelo, a media caja y por fuera del cajón", () => {
    expect(chasis.suelo).toBe(-cajon.alto - EJE_BAJO_CAJON - RUEDA_RADIO);
    expect(chasis.ruedas).toHaveLength(2);
    const zEje = cajon.zDesde + cajon.largo / 2;
    const [izquierda, derecha] = chasis.ruedas;
    expect(izquierda.centro).toEqual([-(100 + RUEDA_FUERA_CAJON + RUEDA_ANCHO / 2), -cajon.alto - EJE_BAJO_CAJON, zEje]);
    expect(derecha.centro).toEqual([100 + RUEDA_FUERA_CAJON + RUEDA_ANCHO / 2, -cajon.alto - EJE_BAJO_CAJON, zEje]);
    for (const r of chasis.ruedas) expect(r.centro[1] - r.radio).toBe(chasis.suelo);
    // Cada guardabarros cubre su rueda por arriba, sin llegar al borde de la lona (y = 0).
    expect(chasis.guardabarros).toHaveLength(2);
    chasis.guardabarros.forEach((g, i) => {
      expect(g.centro).toEqual(chasis.ruedas[i].centro);
      expect(g.radio).toBeGreaterThan(RUEDA_RADIO);
      expect(g.ancho).toBeGreaterThan(RUEDA_ANCHO);
      expect(g.centro[1] + g.radio).toBeLessThan(0);
    });
    expect(chasis.eje.desde[0]).toBe(izquierda.centro[0]);
    expect(chasis.eje.hasta[0]).toBe(derecha.centro[0]);
  });

  it("delante, la lanza en V acaba en el enganche de bola, con la rueda jockey en el suelo", () => {
    const { lanza, enganche, ruedaJockey } = chasis;
    expect(lanza).toHaveLength(2);
    // Los dos tubos arrancan bajo el cajón, uno a cada lado, y se juntan en el enganche.
    expect(lanza[0].desde[0]).toBeLessThan(0);
    expect(lanza[1].desde[0]).toBeGreaterThan(0);
    for (const tubo of lanza) {
      expect(tubo.desde[2]).toBeLessThan(cajon.zHasta);
      expect(tubo.hasta[2]).toBeGreaterThan(cajon.zHasta);
      expect(tubo.desde[1]).toBeLessThan(-cajon.alto);
    }
    expect(enganche.bola).toEqual([0, enganche.bola[1], cajon.zHasta + LANZA_LARGO]);
    expect(enganche.bola[1]).toBeLessThan(-cajon.alto);
    expect(ruedaJockey.rueda.radio).toBe(RUEDA_JOCKEY_RADIO);
    expect(ruedaJockey.rueda.centro[1] - RUEDA_JOCKEY_RADIO).toBe(chasis.suelo);
    expect(ruedaJockey.rueda.centro[2]).toBeGreaterThan(cajon.zHasta);
    expect(ruedaJockey.rueda.centro[2]).toBeLessThan(enganche.bola[2]);
  });

  it("detrás, dos pilotos rojos en la cara trasera del cajón, cerca de las esquinas y abajo", () => {
    expect(chasis.pilotos).toHaveLength(2);
    const [izquierdo, derecho] = chasis.pilotos;
    expect(izquierdo.centro[0]).toBe(-derecho.centro[0]);
    expect(derecho.centro[0] + PILOTO.ancho / 2).toBe(100 - PILOTO.aEsquina);
    for (const p of chasis.pilotos) {
      expect(p.centro[2]).toBe(cajon.zDesde - PILOTO.fondo / 2);
      expect(p.centro[1] - p.alto / 2).toBe(-cajon.alto + PILOTO.sobreFondo);
    }
  });

  it("la caja de las cámaras envuelve también el remolque: del piloto al enganche y de las ruedas al suelo", () => {
    const xRueda = 100 + RUEDA_FUERA_CAJON + RUEDA_ANCHO;
    expect(lona.caja.min[0]).toBeLessThanOrEqual(-xRueda);
    expect(lona.caja.max[0]).toBeGreaterThanOrEqual(xRueda);
    expect(lona.caja.min[1]).toBe(chasis.suelo);
    expect(lona.caja.max[1]).toBe(100);
    expect(lona.caja.min[2]).toBe(cajon.zDesde - PILOTO.fondo);
    expect(lona.caja.max[2]).toBeGreaterThan(chasis.enganche.bola[2]);
  });

  it("las cotas de abajo pasan por debajo de las ruedas", () => {
    const largo = lona.cotas.find((c) => c.vistas.includes("lateral") && c.texto === "301")!;
    expect(largo.desde[1]).toBe(chasis.suelo - SEPARACION_COTA);
  });

  it("el baquetón va sobre el mismo remolque", () => {
    const b = escenaBaqueton()!;
    expect(b.chasis.ruedas).toHaveLength(2);
    expect(b.chasis.pilotos).toHaveLength(2);
    expect(b.chasis.suelo).toBe(-b.cajon.alto - EJE_BAJO_CAJON - RUEDA_RADIO);
    expect(b.caja.min[1]).toBe(b.chasis.suelo);
    expect(b.caja.max[2]).toBeGreaterThan(b.chasis.enganche.bola[2]);
  });
});

describe("rótulos DELANTE y DETRÁS", () => {
  const de = (e: EscenaRemolque, vista: Vista) => e.rotulos.filter((r) => r.vistas.includes(vista));

  it("en las vistas rectas, siempre; en la 3/4 no hacen falta", () => {
    expect(de(lona, "delante").map((r) => r.texto)).toEqual(["DELANTE"]);
    expect(de(lona, "detras").map((r) => r.texto)).toEqual(["DETRÁS"]);
    expect(de(lona, "lateral").map((r) => r.texto)).toEqual(["DELANTE", "DETRÁS"]);
    expect(de(lona, "arriba").map((r) => r.texto)).toEqual(["DELANTE", "DETRÁS"]);
    expect(de(lona, "tres-cuartos")).toEqual([]);
  });

  it("en el lateral, cada uno en su punta y por encima de la lona, hacia dentro", () => {
    const [delante, detras] = de(lona, "lateral");
    expect(delante.punto[2]).toBe(lona.caja.max[2]);
    expect(delante.alinear).toBe("end");
    expect(detras.punto[2]).toBe(lona.caja.min[2]);
    expect(detras.alinear).toBe("start");
    for (const r of [delante, detras]) expect(r.punto[1]).toBeGreaterThan(lona.caja.max[1]);
  });

  it("desde arriba, delante más allá del enganche y detrás por detrás de los pilotos", () => {
    const [delante, detras] = de(lona, "arriba");
    expect(delante.punto[2]).toBeGreaterThan(lona.caja.max[2]);
    expect(detras.punto[2]).toBeLessThan(lona.caja.min[2]);
    expect(delante.alinear).toBe("middle");
  });

  it("de frente y de espaldas, como título encima de la lona", () => {
    const [delante] = de(lona, "delante");
    const [detras] = de(lona, "detras");
    expect(delante.punto[0]).toBe(0);
    expect(delante.punto[1]).toBeGreaterThan(lona.caja.max[1]);
    expect(detras.punto[1]).toBeGreaterThan(lona.caja.max[1]);
  });
});
