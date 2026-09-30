import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { alturasCierre, orejaRecogida, tipoCierre } from "../cierres.ts";
import { calcLona } from "../../calc/lona.ts";
import { construirEscena } from "../index.ts";
import { escenaLona, lonaPrueba } from "./casos.ts";

describe("cierres de las esquinas", () => {
  it("reconoce cada recogida", () => {
    expect(["NO", "", "GOMA", "GANCHOS CORAZON", "CREMALLERA", "VELCRO", "PUENTES ESVA", "PUENTES HIJOS DE PEDRO LOPEZ"].map(tipoCierre))
      .toEqual(["NO", "NO", "GOMA", "CORAZON", "CREMALLERA", "VELCRO", "PUENTES", "PUENTES"]);
  });

  it("la oreja es la demasía de la recogida sobre «NO», repartida en las dos esquinas", () => {
    expect(orejaRecogida(DEFAULT_PARAMS, "GOMA", "delante")).toBe(12);
    expect(orejaRecogida(DEFAULT_PARAMS, "PUENTES HIJOS DE PEDRO LOPEZ", "delante")).toBe(19.8);
    expect(orejaRecogida(DEFAULT_PARAMS, "CREMALLERA", "delante")).toBe(0);
  });

  it("la oreja trasera sigue la columna con que se corta el paño (DELANTE cuando USAR_COLUMNA_ATRAS es false)", () => {
    const e = escenaLona({ recogeAtras: "PUENTES LATERALES" })!;
    // PUENTES LATERALES: delante 41, atras 21. El paño trasero se corta con DELANTE (41),
    // así que la oreja es (41 - 3) / 2 = 19
    expect(e.cierres.find((x) => x.esquina === "atras-izquierda")).toMatchObject({ oreja: 19 });
    expect(e.cierres.find((x) => x.esquina === "atras-derecha")).toMatchObject({ oreja: 19 });
    // También comprobar que las esquinas delanteras no cambian
    const eDelante = escenaLona({ recogeDelante: "PUENTES LATERALES" })!;
    expect(eDelante.cierres.find((x) => x.esquina === "delante-izquierda")).toMatchObject({ oreja: 19 });
  });

  it("reparte a lo alto con margen arriba y abajo, al paso que se le pida", () => {
    expect(alturasCierre(100, 20)).toEqual([10, 30, 50, 70, 90]);
    expect(alturasCierre(100, 35)).toEqual([10, 50, 90]);
    expect(alturasCierre(15, 35)).toEqual([7.5]);
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

  describe("goma: de los ollaos de la oreja a ganchos del cajón en la cara del paño", () => {
    // Pared de 90 cm (menos de 100): cada ollao a un gancho cercano a la esquina, cruzadas en X.
    const e = escenaLona({ recogeDelante: "GOMA", recogeAtras: "GOMA", altoDelante: 90 })!;
    const esquina = (nombre: string) => e.cierres.find((x) => x.esquina === nombre)!;
    // Pared de 120 cm (100 o más): todas al gancho del centro de la cara del paño.
    const alta = escenaLona({ recogeDelante: "GOMA", recogeAtras: "GOMA", altoDelante: 120 })!;
    /** Punto de corte, visto de frente sobre la cara del paño (x, y), de dos tramos. */
    const cortan = (a: { ollao: number[]; gancho: number[] }, b: { ollao: number[]; gancho: number[] }) => {
      const [p, r] = [[a.ollao[0], a.ollao[1]], [a.gancho[0] - a.ollao[0], a.gancho[1] - a.ollao[1]]];
      const [q, s] = [[b.ollao[0], b.ollao[1]], [b.gancho[0] - b.ollao[0], b.gancho[1] - b.ollao[1]]];
      const cruz = r[0] * s[1] - r[1] * s[0];
      const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / cruz;
      const u = ((q[0] - p[0]) * r[1] - (q[1] - p[1]) * r[0]) / cruz;
      return t > 0 && t < 1 && u > 0 && u < 1;
    };

    it("delante-derecha: tres pares, ollaos subiendo por la parte baja de la oreja", () => {
      const c = esquina("delante-derecha");
      expect(c.gomaDiagonal).toHaveLength(3);
      expect(c.gomaDiagonal.map((g) => g.ollao[1])).toEqual([18, 36, 54]);
      for (const { ollao } of c.gomaDiagonal) {
        // En el borde libre de la oreja, sobre el lateral derecho.
        expect(ollao[0]).toBeCloseTo(100.5, 5);
        expect(c.base[2] - ollao[2]).toBeGreaterThan(c.oreja / 2);
        expect(c.base[2] - ollao[2]).toBeLessThanOrEqual(c.oreja);
      }
    });

    it("pared de 120 cm: tres pares y todas las gomas al mismo gancho, el del centro de la cara del paño", () => {
      for (const [nombre, z] of [["delante-derecha", alta.cajon.zHasta], ["delante-izquierda", alta.cajon.zHasta], ["atras-derecha", alta.cajon.zDesde], ["atras-izquierda", alta.cajon.zDesde]] as const) {
        const c = alta.cierres.find((x) => x.esquina === nombre)!;
        expect(c.gomaDiagonal.map((g) => g.ollao[1])).toEqual([24, 48, 72]);
        c.gomaDiagonal.forEach(({ gancho }) => expect(gancho).toEqual([0, -8, z]));
      }
    });

    it("pared de 100 cm justos: ya va al gancho del centro", () => {
      const c = escenaLona({ recogeDelante: "GOMA" })!.cierres.find((x) => x.esquina === "delante-derecha")!;
      expect(c.alto).toBe(100);
      expect(new Set(c.gomaDiagonal.map((g) => g.gancho[0]))).toEqual(new Set([0]));
    });

    it("pared de menos de 100 cm: cada gancho en la cara delantera del cajón, cerca de la esquina; el ollao más alto al más cercano", () => {
      const c = esquina("delante-derecha");
      const dentro = c.gomaDiagonal.map(({ gancho }) => {
        expect(gancho[2]).toBe(e.cajon.zHasta);
        expect(gancho[1]).toBe(-8);
        return c.base[0] - gancho[0];
      });
      dentro.forEach((d) => { expect(d).toBeGreaterThanOrEqual(25); expect(d).toBeLessThanOrEqual(65); });
      // Ollaos de abajo arriba ↔ ganchos de lejos a cerca.
      expect([...dentro].sort((a, b) => b - a)).toEqual(dentro);
      expect(new Set(dentro).size).toBe(3);
      expect(cortan(c.gomaDiagonal[0], c.gomaDiagonal[1])).toBe(true);
      expect(cortan(c.gomaDiagonal[1], c.gomaDiagonal[2])).toBe(true);
    });

    it("la goma dobla sobre la arista de la esquina en línea recta con las dos caras desplegadas", () => {
      for (const escena of [e, alta]) {
        for (const nombre of ["delante-derecha", "atras-izquierda"]) {
          const c = escena.cierres.find((x) => x.esquina === nombre)!;
          for (const { ollao, esquina: arista, gancho } of c.gomaDiagonal) {
            expect(arista[0]).toBe(c.base[0]);
            expect(arista[2]).toBe(c.base[2]);
            // Desplegadas: el ollao a `a` por el lateral, el gancho a `d` por el paño.
            const a = Math.abs(ollao[2] - c.base[2]);
            const d = Math.abs(gancho[0] - c.base[0]);
            expect(arista[1]).toBeCloseTo(ollao[1] + ((gancho[1] - ollao[1]) * a) / (a + d), 1);
            expect(arista[1]).toBeLessThan(ollao[1]);
            expect(arista[1]).toBeGreaterThan(gancho[1]);
          }
        }
      }
    });

    it("las esquinas de atrás enganchan en la cara trasera del cajón y las izquierdas hacia +x", () => {
      const ai = esquina("atras-izquierda");
      expect(ai.gomaDiagonal).toHaveLength(3);
      for (const { ollao, gancho } of ai.gomaDiagonal) {
        expect(gancho[2]).toBe(e.cajon.zDesde);
        expect(gancho[0]).toBeGreaterThan(ai.base[0]);
        expect(gancho[0]).toBeLessThan(0);
        expect(ollao[2]).toBeGreaterThan(0);
        expect(ollao[0]).toBeCloseTo(-100.5, 5);
      }
    });

    it("pared de 70 cm: dos pares a ganchos cercanos distintos", () => {
      const c = escenaLona({ recogeDelante: "GOMA", altoDelante: 70 })!.cierres.find((x) => x.esquina === "delante-izquierda")!;
      expect(c.gomaDiagonal.map((g) => g.ollao[1])).toEqual([17.5, 35]);
      const xs = c.gomaDiagonal.map((g) => g.gancho[0]);
      expect(new Set(xs).size).toBe(2);
      xs.forEach((x) => { expect(x).toBeLessThan(0); expect(x - c.base[0]).toBeLessThanOrEqual(65); });
      expect(cortan(c.gomaDiagonal[0], c.gomaDiagonal[1])).toBe(true);
    });

    it("en un remolque estrecho los ganchos cercanos no pasan del centro del paño", () => {
      const c = escenaLona({ recogeDelante: "GOMA", ancho: 60, altoDelante: 90 })!.cierres.find((x) => x.esquina === "delante-derecha")!;
      c.gomaDiagonal.forEach(({ gancho }) => expect(gancho[0]).toBeGreaterThan(0));
      expect(new Set(c.gomaDiagonal.map((g) => g.gancho[0])).size).toBe(3);
    });

    it("con una oreja de 2 cm el ollao sigue sobre la oreja", () => {
      const params = { ...DEFAULT_PARAMS, recogidas: DEFAULT_PARAMS.recogidas.map((r) => (r.nombre === "GOMA" ? { ...r, delante: 7 } : r)) };
      const input = lonaPrueba({ recogeDelante: "GOMA" });
      const c = construirEscena({ tipo: "lona", input, res: calcLona(input, params) }, params)!.cierres
        .find((x) => x.esquina === "delante-derecha")!;
      expect(c.oreja).toBe(2);
      expect(c.gomaDiagonal).toHaveLength(3);
      c.gomaDiagonal.forEach(({ ollao }) => {
        const a = c.base[2] - ollao[2];
        expect(a).toBeGreaterThan(0);
        expect(a).toBeLessThanOrEqual(2);
      });
    });

    it("sin oreja no hay goma en diagonal", () => {
      const params = { ...DEFAULT_PARAMS, recogidas: DEFAULT_PARAMS.recogidas.map((r) => (r.nombre === "GOMA" ? { ...r, delante: 3 } : r)) };
      const input = lonaPrueba({ recogeDelante: "GOMA" });
      const e0 = construirEscena({ tipo: "lona", input, res: calcLona(input, params) }, params)!;
      e0.cierres.forEach((c) => expect(c.gomaDiagonal).toEqual([]));
    });

    describe("ganchos que ya están en el cajón", () => {
      const delanteros = (escena: NonNullable<typeof e>) => escena.ganchos.filter((g) => g.lado === "delante").map((g) => g.punto);
      const deCara = (escena: NonNullable<typeof e>, cara: "delante" | "atras") =>
        escena.cierres.filter((c) => c.esquina.startsWith(cara)).flatMap((c) => c.gomaDiagonal);

      it("a menos de 8 cm de un gancho de la goma perimetral de la misma cara, la goma acaba en ese y no se pone otro", () => {
        // Pared de 90: el gancho a 45 cm de la esquina cae en x = 55; el perimetral más cercano está en x = 49.
        const c = esquina("delante-derecha");
        const perimetral = delanteros(e).find((p) => p[0] === 49)!;
        const reusada = c.gomaDiagonal.find((g) => !g.ganchoNuevo)!;
        expect(reusada.gancho).toEqual(perimetral);
        // Ningún gancho nuevo de la esquina se queda casi encima de uno perimetral.
        for (const g of deCara(e, "delante").filter((x) => x.ganchoNuevo)) {
          for (const p of delanteros(e)) expect(Math.hypot(g.gancho[0] - p[0], g.gancho[2] - p[2])).toBeGreaterThanOrEqual(8);
        }
      });

      it("a más de 8 cm pone su propio gancho", () => {
        // El gancho a 60 cm de la esquina cae en x = 40, a 9 cm del perimetral de x = 49.
        const c = esquina("delante-derecha");
        expect(c.gomaDiagonal[0]).toMatchObject({ gancho: [40, -8, e.cajon.zHasta], ganchoNuevo: true });
      });

      it("pared alta: el gancho del centro se pone una sola vez por cara", () => {
        for (const cara of ["delante", "atras"] as const) {
          const gomas = deCara(alta, cara);
          expect(gomas).toHaveLength(6);
          expect(gomas.filter((g) => g.ganchoNuevo)).toHaveLength(1);
        }
      });

      it("«Según ganchos»: un gancho del pedido cerca del centro recoge todas las gomas de esa cara", () => {
        // Sobre el remolque a 96 cm → 96,5 en la lona hecha de 201 → x = 4.
        const s = escenaLona({
          recogeDelante: "GOMA", altoDelante: 120, modoOllaos: "SEGUN GANCHOS",
          ganchos: { laterales: [10, 290], atras: [10, 190], delante: [96, 150] },
        })!;
        const delPedido = delanteros(s).find((p) => p[0] === 4)!;
        expect(delPedido).toBeDefined();
        const gomas = deCara(s, "delante");
        expect(gomas).toHaveLength(6);
        gomas.forEach((g) => expect(g).toMatchObject({ gancho: delPedido, ganchoNuevo: false }));
      });
    });

    it("las demás recogidas no llevan goma en diagonal", () => {
      const otra = escenaLona({ recogeDelante: "PUENTES HIJOS DE PEDRO LOPEZ" })!;
      otra.cierres.forEach((c) => expect(c.gomaDiagonal).toEqual([]));
    });
  });

  it("velcro de 3 cm en la oreja y puentes repartidos a lo alto con el paso de los ollaos", () => {
    const e = escenaLona({ recogeDelante: "VELCRO", recogeAtras: "PUENTES HIJOS DE PEDRO LOPEZ" })!;
    expect(e.cierres.find((x) => x.esquina === "delante-izquierda")).toMatchObject({ oreja: 12, velcro: { ancho: 3 }, alturas: [] });
    // Iván, 30/09/2026: «pon una medida como ollaos y listo»: el paso de los ollaos (35 por defecto).
    expect(e.cierres.find((x) => x.esquina === "atras-izquierda")).toMatchObject({ tipo: "PUENTES", oreja: 19.8, alturas: [10, 50, 90] });
  });

  it("los puentes siguen el paso de los ollaos del elemento; sin paso, el de Parámetros", () => {
    const atras = (pasoOllaos: number) =>
      escenaLona({ recogeAtras: "PUENTES HIJOS DE PEDRO LOPEZ", pasoOllaos })!.cierres.find((x) => x.esquina === "atras-derecha")!.alturas;
    expect(atras(20)).toEqual([10, 30, 50, 70, 90]);
    expect(atras(40)).toEqual([10, 50, 90]);
    expect(atras(0)).toEqual(alturasCierre(100, DEFAULT_PARAMS.pasoOllaosDefecto));
  });

  describe("ganchos corazón: dos filas alternadas a un lado y otro del borde de la oreja, con un cordón en zigzag", () => {
    const corazon = (extra = {}) =>
      escenaLona({ recogeDelante: "GANCHOS CORAZON", ...extra })!.cierres.find((x) => x.esquina === "delante-derecha")!;

    it("lleva oreja, como la goma (mismas medidas provisionales), y ni goma en diagonal ni puentes", () => {
      const c = corazon();
      expect(c).toMatchObject({ tipo: "CORAZON", oreja: 12, alturas: [], gomaDiagonal: [], cremallera: null, velcro: null });
    });

    it("los ganchos suben de abajo arriba alternando oreja y lateral; cada fila, al paso de los ollaos", () => {
      const c = corazon();
      const { ganchos } = c.corazon!;
      // Paso 35: un gancho de cada fila cada 35 cm, las dos filas desfasadas medio paso.
      expect(ganchos.map((g) => g.punto[1])).toEqual(alturasCierre(100, 17.5));
      expect(ganchos.map((g) => g.enOreja)).toEqual([true, false, true, false, true, false]);
      // Delante-derecha: la esquina está en z = 301 y el lateral va hacia −z. La fila de la oreja, a 3 cm
      // de su borde libre (12 cm); la otra, a 3 cm del borde sobre el lateral.
      for (const g of ganchos) {
        expect(g.punto[0]).toBe(100.5);
        expect(g.punto[2]).toBe(g.enOreja ? 301 - 9 : 301 - 15);
      }
      const oreja = ganchos.filter((g) => g.enOreja).map((g) => g.punto[1]);
      // Repartidos entre los márgenes, al paso entero más cercano: 32 cm en esta pared.
      expect(oreja[1] - oreja[0]).toBe(32);
    });

    it("el cordón se anuda abajo, en el borde de la oreja, por debajo del primer gancho", () => {
      const c = corazon();
      expect(c.corazon!.nudo[2]).toBe(301 - 12);
      expect(c.corazon!.nudo[1]).toBeLessThan(c.corazon!.ganchos[0].punto[1]);
      expect(c.corazon!.nudo[1]).toBeGreaterThan(0);
    });

    it("con otro paso de ollaos cambian los ganchos", () => {
      expect(corazon({ pasoOllaos: 50 }).corazon!.ganchos.map((g) => g.punto[1])).toEqual(alturasCierre(100, 25));
    });

    it("en las esquinas izquierdas y de atrás, sobre su lateral", () => {
      const e = escenaLona({ recogeDelante: "GANCHOS CORAZON", recogeAtras: "GANCHOS CORAZON" })!;
      const atrasIzq = e.cierres.find((x) => x.esquina === "atras-izquierda")!;
      expect(atrasIzq.corazon!.ganchos[0].punto).toEqual([-100.5, 10, 9]);
      expect(atrasIzq.corazon!.ganchos[1].punto[2]).toBe(15);
      expect(e.cierres.filter((c) => c.corazon).length).toBe(4);
    });

    it("sin oreja no hay ganchos corazón; las demás recogidas no los llevan", () => {
      const params = { ...DEFAULT_PARAMS, recogidas: DEFAULT_PARAMS.recogidas.map((r) => (r.nombre === "GANCHOS CORAZON" ? { ...r, delante: 3 } : r)) };
      const input = lonaPrueba({ recogeDelante: "GANCHOS CORAZON" });
      const e = construirEscena({ tipo: "lona", input, res: calcLona(input, params) }, params)!;
      expect(e.cierres.find((x) => x.esquina === "delante-derecha")!.corazon).toBeNull();
      escenaLona({ recogeDelante: "GOMA" })!.cierres.forEach((c) => expect(c.corazon).toBeNull());
    });
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
