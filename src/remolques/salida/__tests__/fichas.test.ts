import { describe, expect, it } from "vitest";
import { crearAlmacenFichas } from "../fichas.ts";

describe("identificadores de un solo uso", () => {
  it("los datos se toman una vez y desaparecen", () => {
    const fichas = crearAlmacenFichas<{ pedido: string }>();
    const id = fichas.guardar({ pedido: "AR.26.99990" });
    expect(fichas.tomar(id)).toEqual({ pedido: "AR.26.99990" });
    expect(fichas.tomar(id)).toBeNull();
    expect(fichas.tamano()).toBe(0);
  });

  it("caducan a los pocos segundos aunque nadie los pida", () => {
    let ahora = 1000;
    const fichas = crearAlmacenFichas<number>({ duracionMs: 60_000, ahora: () => ahora });
    const id = fichas.guardar(1);
    ahora += 59_999;
    expect(fichas.tamano()).toBe(1);
    ahora += 1;
    expect(fichas.tomar(id)).toBeNull();
    expect(fichas.tamano()).toBe(0);
  });

  it("cada PDF tiene su identificador y se puede borrar sin tomarlo", () => {
    const fichas = crearAlmacenFichas<number>();
    const a = fichas.guardar(1);
    const b = fichas.guardar(2);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    fichas.borrar(a);
    expect(fichas.tomar(a)).toBeNull();
    expect(fichas.tomar(b)).toBe(2);
  });
});
