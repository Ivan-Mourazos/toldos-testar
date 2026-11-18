import { describe, expect, it } from 'vitest';
import { CONFIG_CODEX, angulosAlPerfil, centros, construir, posicionLona, revisarCiclo, separacionFinal, diametroFinal } from './geometria.ts';

// Valores de las simulaciones HTML de Codex (18/11/2026), tubo de enrolle Ø88,9, tubos Ø42, lona 0,8.
describe('geometría del enrolle: contraste con Codex', () => {
  it('4200 con [1470, 2714, 4200]: lo más justo, T1–T2 a 79,5 mm', () => {
    const p = revisarCiclo(construir(CONFIG_CODEX, [1470, 2714, 4200]));
    expect(p[0]).toMatchObject({ i: 0, j: 1 });
    expect(p[0].separacion).toBeCloseTo(79.513, 1);
    expect(p[0].donde).toBeCloseTo(2601.2, 0);
    const resto = Object.fromEntries(p.map(x => [`${x.i}${x.j}`, x.separacion]));
    expect(resto['12']).toBeCloseTo(83.945, 1);
    expect(resto['02']).toBeCloseTo(84.203, 1);
  });
  it('3660 con [1138, 2471, 3660]: lo más justo, T1–T3 a 80 mm', () => {
    const p = revisarCiclo(construir(CONFIG_CODEX, [1138, 2471, 3660]));
    expect(p[0]).toMatchObject({ i: 0, j: 2 });
    expect(p[0].separacion).toBeCloseTo(79.978, 1);
    expect(p[0].donde).toBeCloseTo(3547.7, 0);
  });
  it('tramos iguales: casi se tocan (6 mm en 4200, 15,5 mm en 3660)', () => {
    expect(revisarCiclo(construir(CONFIG_CODEX, [1400, 2800, 4200]))[0].separacion).toBeCloseTo(5.959, 1);
    expect(revisarCiclo(construir(CONFIG_CODEX, [1220, 2440, 3660]))[0].separacion).toBeCloseTo(15.536, 1);
  });
  it('vale para cualquier número de tubos y da el diámetro final', () => {
    const m = construir(CONFIG_CODEX, [1008, 1816, 2869, 3826, 4782]);
    expect(m.tubos).toHaveLength(5);
    expect(revisarCiclo(m)).toHaveLength(10);
    const pareja = separacionFinal(m);
    expect(pareja).toMatchObject({ i: 2, j: 3 });
    expect(pareja.separacion).toBeCloseTo(1.954, 1);
    expect(diametroFinal(m)).toBeGreaterThan(88.9 + 2 * 42);
  });
  it('con saco: el largo enrollado pasa del último tubo y el rollo sigue girando', () => {
    const corto = construir(CONFIG_CODEX, [1100, 2200, 3300]);
    const largo = construir(CONFIG_CODEX, [1100, 2200, 3300], 4400);
    expect(largo.largo).toBe(4400);
    expect(diametroFinal(largo)).toBeGreaterThan(diametroFinal(corto));
  });
});

describe('tubos sujetos con la tira de la E.T.', () => {
  const cfg = { ...CONFIG_CODEX, grosor: 1.2, conFunda: true };
  const radio = cfg.diametroTubo / 2;

  it('el tubo está centrado en la lona libre y su bulto se apoya al enrollarse', () => {
    const m = construir(cfg, [420]);
    for (const [avance, esperado] of [[300, 0], [m.largo, radio + 1.5 * cfg.grosor]]) {
      const p = posicionLona(m, avance);
      const [t] = centros(m, avance);
      const distanciaNormal = (t.x - p.x) * Math.cos(p.a) + (t.y - p.y) * Math.sin(p.a);
      expect(distanciaNormal).toBeCloseTo(esperado, 8);
    }
  });

  it('descuenta medio encogimiento en el eje y uno entero al pasar cada tubo', () => {
    const gasto = (Math.PI - 2) * (radio + cfg.grosor / 2);
    const marcas = [400, 800, 1200];
    const conSaco = construir(cfg, marcas, 1400);
    expect(conSaco.largo).toBeCloseTo(1400 - 3 * gasto, 8);
    conSaco.marcas.forEach((marca, i) => expect(marca).toBeCloseTo(marcas[i] - (i + 0.5) * gasto, 8));
    expect(construir(cfg, marcas).largo).toBeCloseTo(1200 - 2.5 * gasto, 8);
    expect(marcas).toEqual([400, 800, 1200]);
  });

  it('con tubos manuales cercanos conserva el orden de las marcas proyectadas', () => {
    const m = construir(cfg, [400, 410, 900]);
    expect(m.marcas[1] - m.marcas[0]).toBeCloseTo(10 * 2 / Math.PI, 8);
    expect(revisarCiclo(m)[0].separacion).toBeLessThan(0);
  });

  it('mide el hueco entre las fundas, tanto al final como durante el ciclo', () => {
    const m = construir(cfg, [420, 450]);
    for (const { separacion, donde } of [separacionFinal(m), revisarCiclo(m)[0]]) {
      const [a, b] = centros(m, donde);
      expect(separacion).toBeCloseTo(Math.hypot(a.x - b.x, a.y - b.y) - cfg.diametroTubo - 2 * cfg.grosor, 8);
    }
  });

  it('la vuelta siguiente apoya sobre la funda y el diámetro incluye su grosor', () => {
    const m = construir(cfg, [420], 1000);
    const [t] = m.tubos;
    const objetivo = t.angulo + 2 * Math.PI;
    let desde = t.marca, hasta = m.largo;
    while (hasta - desde > 0.0001) {
      const medio = (desde + hasta) / 2;
      if (posicionLona(m, medio).a < objetivo) desde = medio;
      else hasta = medio;
    }
    const p = posicionLona(m, (desde + hasta) / 2);
    const distanciaNormal = (p.x - t.x) * Math.cos(p.a) + (p.y - t.y) * Math.sin(p.a);
    expect(distanciaNormal).toBeCloseTo(radio + 2 * cfg.grosor, 4);
    const alTerminar = construir(cfg, [420]);
    expect(diametroFinal(alTerminar) / 2).toBeCloseTo(Math.hypot(t.x, t.y) + radio + cfg.grosor, 8);
  });
});

describe('perfil fleco', () => {
  const conPerfil = { ...CONFIG_CODEX, altoPerfil: 10, anchoPerfil: 10 };
  const marcas = [1470, 2714, 4200];

  it('sin perfil da lo mismo que Codex', () => {
    const a = revisarCiclo(construir(CONFIG_CODEX, marcas))[0];
    const b = revisarCiclo(construir({ ...conPerfil, altoPerfil: 0 }, marcas))[0];
    expect(b.separacion).toBeCloseTo(a.separacion, 6);
  });

  it('el bulto del perfil cambia dónde caen los tubos y el diámetro final', () => {
    const sin = construir(CONFIG_CODEX, marcas);
    const con = construir(conPerfil, marcas);
    expect(con.tubos[2].angulo).not.toBeCloseTo(sin.tubos[2].angulo, 2);
    expect(diametroFinal(con)).toBeLessThan(diametroFinal(sin));
  });

  it('el bulto del perfil agranda el rollo de lona sin tubos', () => {
    const sin = construir(CONFIG_CODEX, [], 1000);
    const con = construir(conPerfil, [], 1000);
    expect(diametroFinal(con)).toBeGreaterThan(diametroFinal(sin));
  });

  it('el ancho del perfil influye en la posición de los tubos', () => {
    const redondo = construir(conPerfil, marcas);
    const masAncho = construir({ ...conPerfil, anchoPerfil: 12 }, marcas);
    expect(masAncho.tubos[2].angulo).not.toBeCloseTo(redondo.tubos[2].angulo, 2);
  });

  it('da el ángulo de cada tubo al perfil, entre 0 y 180 grados', () => {
    const angulos = angulosAlPerfil(construir(conPerfil, marcas));
    expect(angulos).toHaveLength(3);
    for (const angulo of angulos) {
      expect(angulo).toBeGreaterThanOrEqual(0);
      expect(angulo).toBeLessThanOrEqual(180);
    }
  });

  it.each([false, true])('un tubo justo una vuelta después del arranque queda encima del perfil (funda %s)', conFunda => {
    const cfg = { ...conPerfil, conFunda };
    // La lona recorre el bulto del perfil antes de completar los 360 grados.
    let desde = 0;
    let hasta = 2 * Math.PI * (conPerfil.diametroEnrolle + conPerfil.grosor);
    while (hasta - desde > 0.001) {
      const marca = (desde + hasta) / 2;
      const [tubo] = construir(cfg, [marca]).tubos;
      if (tubo.angulo < 2 * Math.PI) desde = marca;
      else hasta = marca;
    }

    const modelo = construir(cfg, [(desde + hasta) / 2, 3000]);
    expect(angulosAlPerfil(modelo)[0]).toBeLessThan(20);
    const extremoPerfil = conPerfil.diametroEnrolle / 2 + conPerfil.altoPerfil;
    const radioExterior = cfg.diametroTubo / 2 + (conFunda ? cfg.grosor : 0);
    expect(modelo.tubos[0].x - radioExterior).toBeGreaterThan(extremoPerfil);
  });
});
