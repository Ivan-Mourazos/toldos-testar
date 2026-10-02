import { describe, expect, it } from "vitest";
import { buscarRemolques, filaBusqueda, validarFiltros, type FiltrosBusqueda, type ResultadoBusqueda } from "../buscar.ts";
import { ErrorPedidoRemolques } from "../pedido.ts";
import { PEDIDOS_BUSQUEDA } from "./pedidos-busqueda.ts";

// P1 = AR2604286 (A lona TIPO 05, B baquetón), P2 = AR2605000 (generado), P3 = AR2501234 (2025).
const claves = (r: ResultadoBusqueda) => r.filas.map((f) => `${f.orderCode}-${f.letra}`);
const buscar = (filtros: FiltrosBusqueda) => claves(buscarRemolques(PEDIDOS_BUSQUEDA(), filtros));

describe("validarFiltros", () => {
  it("sin cuerpo no hay filtros; quita lo vacío, recorta textos y pone el margen por defecto", () => {
    expect(validarFiltros(undefined)).toEqual({});
    expect(validarFiltros(null)).toEqual({});
    expect(validarFiltros({
      texto: "  ", cliente: " cal ", estado: "", ventana: null,
      medidas: { largo: { valor: 250 }, ancho: null, aguas: { valor: 10, margen: 0 } },
      recogida: { nombre: "GOMA" },
    })).toEqual({
      cliente: "cal",
      medidas: { largo: { valor: 250, margen: 5 }, aguas: { valor: 10, margen: 0 } },
      recogida: { nombre: "GOMA", lado: "cualquiera" },
    });
  });

  it("rechaza con un 400 lo que no es un filtro válido y dice cuál", () => {
    expect(() => validarFiltros([])).toThrow(ErrorPedidoRemolques);
    expect(() => validarFiltros({ medidas: { largo: { valor: "x" } } })).toThrow(/largo/);
    expect(() => validarFiltros({ medidas: { largo: { valor: 200, margen: -1 } } })).toThrow(/largo/);
    expect(() => validarFiltros({ medidas: { peso: { valor: 1 } } })).toThrow(/peso/);
    expect(() => validarFiltros({ perfil: "TIPO 09" })).toThrow(/perfil/);
    expect(() => validarFiltros({ tipo: "toldo" })).toThrow(/tipo/);
    expect(() => validarFiltros({ recogida: { nombre: "GOMA", lado: "arriba" } })).toThrow(/lado de la recogida/);
    expect(() => validarFiltros({ desde: "30/09/2026" })).toThrow(/desde/);
    expect(() => validarFiltros({ ventana: "quizá" })).toThrow(/ventana/);
    try {
      validarFiltros({ texto: 5 });
      expect.unreachable();
    } catch (error) {
      expect((error as ErrorPedidoRemolques).statusCode).toBe(400);
      expect((error as Error).message).toContain("«texto» tiene que ser un texto.");
    }
  });
});

describe("buscarRemolques", () => {
  it("sin filtros salen todos los elementos, de la fecha más nueva a la más antigua y por letra", () => {
    const r = buscarRemolques(PEDIDOS_BUSQUEDA(), {});
    expect(claves(r)).toEqual(["AR2605000-A", "AR2604286-A", "AR2604286-B", "AR2501234-A"]);
    expect(r).toMatchObject({ total: 4, pedidos: 3, cortado: false, limite: 500 });
  });

  it("con límite: salen los más nuevos, el total de verdad y el aviso de corte", () => {
    const r = buscarRemolques(PEDIDOS_BUSQUEDA(), {}, 2);
    expect(claves(r)).toEqual(["AR2605000-A", "AR2604286-A"]);
    expect(r).toMatchObject({ total: 4, pedidos: 3, cortado: true, limite: 2 });
  });

  it("cada fila lleva lo que enseña la lista", () => {
    const [p1, p2] = PEDIDOS_BUSQUEDA();
    expect(filaBusqueda(p2, p2.elementos[0], 0)).toEqual({
      orderCode: "AR2605000", numeroPedido: "AR.26.05000", version: "10", letra: "A", tipo: "lona",
      cliente: "HIJOS DE PEDRO LÓPEZ, S.L.", fecha: "2026-09-20", modelo: "Arquillado con aguas",
      largo: 253, ancho: 152, alto: 125, recogeDelante: "NO", recogeAtras: "CREMALLERA",
      material: "LONA NS86 2L 630 g/m² :GRIS CLARO 7038", of: "0240001", estado: "PRODUCED",
    });
    expect(filaBusqueda(p1, p1.elementos[1], 1)).toMatchObject({
      version: "11", letra: "B", tipo: "baqueton", modelo: "Baquetón", alto: null, recogeDelante: "", recogeAtras: "", of: "0231781",
    });
  });

  it("texto libre: número como se escribió o normalizado, cliente, OF y observaciones; cada palabra tiene que salir", () => {
    expect(buscar({ texto: "ar.26.04286" })).toEqual(["AR2604286-A", "AR2604286-B"]);
    expect(buscar({ texto: "AR2604286" })).toEqual(["AR2604286-A", "AR2604286-B"]);
    expect(buscar({ texto: "pedro lopez" })).toEqual(["AR2605000-A"]);
    expect(buscar({ texto: "231781" })).toEqual(["AR2604286-B"]);
    expect(buscar({ texto: "0231781" })).toEqual(["AR2604286-B"]);
    expect(buscar({ texto: "reflectante" })).toEqual(["AR2604286-A"]);
    expect(buscar({ texto: "cal 231780" })).toEqual(["AR2604286-A"]);
    expect(buscar({ texto: "cal ayala" })).toEqual([]);
  });

  it("cliente: por nombre o por el de su ficha, sin acentos ni mayúsculas", () => {
    expect(buscar({ cliente: "hijos de pedro lopez" })).toEqual(["AR2605000-A"]);
    expect(buscar({ cliente: "AYALA" })).toEqual(["AR2501234-A"]);
  });

  it("tipo y perfil", () => {
    expect(buscar({ tipo: "baqueton" })).toEqual(["AR2604286-B"]);
    expect(buscar({ tipo: "lona" })).toEqual(["AR2605000-A", "AR2604286-A", "AR2501234-A"]);
    expect(buscar({ perfil: "TIPO 03" })).toEqual(["AR2605000-A"]);
  });

  it("recogidas: delante, detrás o cualquier lado, sin mayúsculas", () => {
    expect(buscar({ recogida: { nombre: "CREMALLERA", lado: "detras" } })).toEqual(["AR2605000-A"]);
    expect(buscar({ recogida: { nombre: "CREMALLERA", lado: "delante" } })).toEqual(["AR2501234-A"]);
    expect(buscar({ recogida: { nombre: "cremallera", lado: "cualquiera" } })).toEqual(["AR2605000-A", "AR2501234-A"]);
    expect(buscar({ recogida: { nombre: "GOMA", lado: "cualquiera" } })).toEqual(["AR2604286-A"]);
  });

  it("medidas con margen: los bordes cuentan y el baquetón entra por largo y ancho", () => {
    expect(buscar({ medidas: { largo: { valor: 255, margen: 5 } } })).toEqual(["AR2605000-A", "AR2604286-A", "AR2604286-B"]);
    expect(buscar({ medidas: { largo: { valor: 255, margen: 2 } } })).toEqual(["AR2605000-A"]);
    expect(buscar({ medidas: { largo: { valor: 250, margen: 0 }, ancho: { valor: 145, margen: 2 } } })).toEqual(["AR2604286-A"]);
    expect(buscar({ medidas: { alto: { valor: 90, margen: 5 } } })).toEqual(["AR2604286-A"]);
  });

  it("radios, aguas y chaflán (sin escribir cuenta como 0)", () => {
    expect(buscar({ medidas: { radioEsquina: { valor: 8, margen: 0 } } })).toEqual(["AR2604286-A"]);
    expect(buscar({ medidas: { radioCumbrera: { valor: 20, margen: 0 }, radioHombro: { valor: 10, margen: 0 } } })).toEqual(["AR2605000-A"]);
    expect(buscar({ medidas: { aguas: { valor: 15, margen: 1 } } })).toEqual(["AR2605000-A"]);
    expect(buscar({ medidas: { chaflan: { valor: 12, margen: 0 } } })).toEqual(["AR2501234-A"]);
    expect(buscar({ medidas: { aguas: { valor: 0, margen: 0 } } })).toEqual(["AR2604286-A", "AR2501234-A"]);
  });

  it("Sí / No: ventana, rotulación, bastilla y detrás distinto; los de lona dejan fuera los baquetones", () => {
    expect(buscar({ ventana: "si" })).toEqual(["AR2604286-A"]);
    expect(buscar({ ventana: "no" })).toEqual(["AR2605000-A", "AR2501234-A"]);
    expect(buscar({ rotulacion: "si" })).toEqual(["AR2604286-B"]);
    expect(buscar({ rotulacion: "no" })).toEqual(["AR2605000-A", "AR2604286-A", "AR2501234-A"]);
    expect(buscar({ bastilla: "si" })).toEqual(["AR2605000-A"]);
    expect(buscar({ detrasDistinto: "si" })).toEqual(["AR2605000-A"]);
    expect(buscar({ detrasDistinto: "no" })).toEqual(["AR2604286-A", "AR2501234-A"]);
  });

  it("material: texto contenido, sin mayúsculas", () => {
    expect(buscar({ material: "7038" })).toEqual(["AR2605000-A"]);
    expect(buscar({ material: "alpha" })).toEqual(["AR2604286-B"]);
  });

  it("estado: pendientes o generados", () => {
    expect(buscar({ estado: "generados" })).toEqual(["AR2605000-A"]);
    expect(buscar({ estado: "pendientes" })).toEqual(["AR2604286-A", "AR2604286-B", "AR2501234-A"]);
  });

  it("fechas del pedido: desde y hasta incluyen el día", () => {
    expect(buscar({ desde: "2026-09-15" })).toEqual(["AR2605000-A"]);
    expect(buscar({ hasta: "2025-12-31" })).toEqual(["AR2501234-A"]);
    expect(buscar({ desde: "2026-09-10", hasta: "2026-09-10" })).toEqual(["AR2604286-A", "AR2604286-B"]);
  });

  it("los filtros se combinan", () => {
    expect(buscar({ recogida: { nombre: "CREMALLERA", lado: "cualquiera" }, estado: "pendientes" })).toEqual(["AR2501234-A"]);
    expect(buscar({ cliente: "cal", tipo: "lona", ventana: "si", medidas: { largo: { valor: 250, margen: 5 } } })).toEqual(["AR2604286-A"]);
    const r = buscarRemolques(PEDIDOS_BUSQUEDA(), { cliente: "cal" });
    expect(r).toMatchObject({ total: 2, pedidos: 1 });
  });
});
