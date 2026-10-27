import { describe, expect, it } from 'vitest';
import revision from './fixtures/revision-AR2604784.json' with { type: 'json' };
import { generarCorteLona } from './index.js';
import { corteReadiness } from '../corteReadiness.js';
import { registrosDxf, valor, numero } from './dxfTestHelpers.js';

const generar = (order = revision.order, opciones = {}) => generarCorteLona(order, { ofStockSacos: '0230811', ...opciones });

describe('Del pedido guardado al corte de lona', () => {
  it('recalcula AR2604784 y conserva sus medidas reales', () => {
    const resultado = generar();
    expect(resultado.modelos).toEqual(['GALICIA']);
    expect(resultado.avisos).toEqual([]);
    expect(resultado.cortes.conSacos).toHaveLength(1);
    const corte = resultado.cortes.conSacos[0];
    expect(corte.piezas[0].piezas.map((p) => [p.nombre, p.largo, p.alto])).toEqual([
      ['A', 4810, 1900], ['A BAMBA', 4850, 150]
    ]);
    expect(corte.largo).toBe(4850);
    expect(corte.dxf).toContain('AC1018');
    expect(resultado.cortes.trozoSeparado).toBeNull();
    expect(resultado.plano[0].dxf).toContain('AC1032');
  });
  it('agrupa solo la misma tela y conserva las letras y OF del pedido', () => {
    const order = structuredClone(revision.order);
    order.sameFabric = false;
    order.awnings[0].fabric = order.fabric;
    order.awnings.push({ ...order.awnings[0], id: 'otro', of: '0232569', fabric: 'OTROPVC|||300|||LONA PVC ROJA :300 AN|||PLASTICA (LONA)' });
    const resultado = generar(order);
    expect(resultado.cortes.conSacos).toHaveLength(2);
    expect(resultado.cortes.conSacos.map((c) => c.anchoRollo)).toEqual([2500, 3000]);
    expect(resultado.cortes.conSacos[1].piezas[0].letra).toBe('B');
    expect(resultado.plano[1].dxf).toContain('0232569');
  });
  it('repite todas las piezas por unidad', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].units = 2;
    expect(generar(order).cortes.conSacos[0].colocadas.filter((p) => !p.saco)).toHaveLength(4);
  });
  it.each(['ARZUA PRO', 'GALICIA', 'MONOBLOCK 350', 'CAMBIO TELA'])('genera desde el pedido real adaptado a %s', (model) => {
    const order = structuredClone(revision.order);
    Object.assign(order.awnings[0], { model, armCount: 2, workType: model === 'CAMBIO TELA' ? 'FABRIC_ONLY' : 'FULL_AWNING' });
    const salida = generar(order);
    expect(salida.avisos).toEqual([]);
    expect(salida.cortes.conSacos).toHaveLength(1);
    expect(salida.plano[0].dxf).toContain(model === 'CAMBIO TELA' ? 'CAMBIO DE TELA' : 'TOLDO DE FACHADA');
  });
  it('agrupa OF distintas de la misma tela en un solo corte', () => {
    const order = structuredClone(revision.order);
    order.awnings.push({ ...order.awnings[0], id: 'segundo', of: '0232569' });
    const salida = generar(order);
    expect(salida.cortes.conSacos).toHaveLength(1);
    expect(salida.cortes.conSacos[0].piezas.map((p) => p.letra)).toEqual(['A', 'B']);
    expect(salida.cortes.conSacos[0].dxf).toContain('0232568 / 0232569');
  });
  it('corta un pedido web de tres toldos con sus letras y OF dentro de todas sus piezas', () => {
    const order = structuredClone(revision.order);
    order.awnings.push(
      { ...order.awnings[0], id: 'toldo-b', of: '0232569', width: 380, projection: 150, armCount: 2 },
      { ...order.awnings[0], id: 'toldo-c', of: '0232570', width: 600, projection: 250, valanceHeight: 20 }
    );
    const salida = generar(order);
    expect(salida.avisos).toEqual([]);
    expect(salida.cortes.conSacos).toHaveLength(1);
    const corte = salida.cortes.conSacos[0];
    expect(corte.piezas.map((p) => p.letra)).toEqual(['A', 'B', 'C']);
    expect(corte.piezas.map((p) => p.piezas.map((q) => [q.nombre, q.largo, q.alto]))).toEqual([
      [['A', 4810, 1900], ['A BAMBA', 4850, 150]],
      [['B', 3670, 1900], ['B BAMBA', 3710, 150]],
      [['C1', 5960, 2500], ['C2', 5960, 420], ['C BAMBA', 5910, 250]]
    ]);
    const entidades = registrosDxf(corte.dxf);
    for (const p of corte.colocadas.filter((q) => !q.saco)) {
      const of = order.awnings[['A', 'B', 'C'].indexOf(p.letra)].of;
      expect(p.of).toBe(of);
      expect(entidades.some((e) => e.tipo === 'TEXT' && valor(e, 1) === of &&
        numero(e, 11) >= p.x + 1000 && numero(e, 11) <= p.x + p.ancho + 1000 &&
        numero(e, 21) >= p.y + 1000 && numero(e, 21) <= p.y + p.hueco + 1000)).toBe(true);
    }
    // A y B se leen bien juntos; C, que es grande, va en su presentación. Cada una con sus OF y su hoja.
    expect(salida.plano[0].geometria.hojas.map((h) => [h.nombre, h.cajetin.OF, h.cajetin.HOJA])).toEqual([
      ['TOLDOS A + B', '0232568 / 0232569', '1/2'], ['TOLDO C', '0232570', '2/2']
    ]);
    const plano = salida.plano[0].dxf.replace(/\r\n/g, '\n');
    for (const nombre of ['TOLDOS A + B', 'TOLDO C']) expect(plano).toContain(`AcDbLayout\n  1\n${nombre}\n`);
    for (const of of ['0232568 / 0232569', '0232570']) expect(plano).toContain(of);
  });
  it('nombra la presentación de un solo toldo «TOLDO A»', () => {
    const plano = generar().plano[0];
    expect(plano.geometria.hojas.map((h) => h.nombre)).toEqual(['TOLDO A']);
    expect(plano.dxf.replace(/\r\n/g, '\n')).toContain('AcDbLayout\n  1\nTOLDO A\n');
  });
  it.each(['HERA', 'IRIS', 'ANTICA', '', undefined])('no anuncia corte para %s', (modelo) => {
    expect(corteReadiness(modelo).ready).toBe(false);
  });
  it.each(['ARZUA PRO', 'GALICIA', 'MONOBLOCK 350', 'CAMBIO TELA', 'CORTINA', 'CAMBIO CORTINA', 'SOLAPAS'])('marca corte PVC de %s', (modelo) => {
    expect(corteReadiness(modelo).ready).toBe(true);
  });
  it('avisa de modelos y materiales fuera de alcance sin generar geometría', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].model = 'HERA';
    expect(generar(order).cortes.conSacos).toEqual([]);
    order.awnings[0].model = 'GALICIA';
    order.fabric = 'ACRILICO|||120|||TELA ACRILICA|||ACRILICA';
    expect(generar(order).cortes.conSacos).toEqual([]);
    expect(generar(order).avisos.length).toBeGreaterThan(0);
  });
  it('sin la OF del toldo hace la vista previa con «SIN OF» y lo avisa (Iván, 21/10/2026)', () => {
    // Un pedido inventado en la web, con el toldo válido pero sin OF: «ver una vista previa del corte».
    const order = structuredClone(revision.order);
    order.awnings[0].of = '';
    const resultado = generar(order);
    expect(resultado.cortes.conSacos).toHaveLength(1);
    expect(resultado.sinOf).toEqual(['A']);
    expect(resultado.avisos).toEqual(['Toldo A: sin OF, es solo una vista previa; escribe la OF antes de guardarlo.']);
    expect(resultado.cortes.conSacos[0].dibujo.textos.map((t) => t.valor)).toContain('SIN OF');
    // Con OF, nada de eso.
    expect(generar().sinOf).toEqual([]);
  });

  it('corta un toldo de PVC azul con la bamba en PVC blanco en dos cortes, uno por tela', () => {
    const order = structuredClone(revision.order);
    order.fabric = 'ALPHAAZ5010P250|||250|||LONA ALPHA 1L 580 g/m²:AZUL 5010 :250 AN (580)|||PLASTICA (LONA)';
    Object.assign(order.awnings[0], { hasValance: true, valanceHeight: 25,
      valanceFabric: 'ALPHABL9016P250|||250|||LONA ALPHA 1L 580 g/m²:BLANCO 9016 :250 AN (580)|||PLASTICA (LONA)' });
    const resultado = generar(order);
    expect(resultado.avisos).toEqual([]);
    expect(resultado.cortes.conSacos.map((c) => c.material)).toEqual(['PVC 580 AZUL 5010', 'PVC 580 BLANCO 9016']);
  });

  it('rechaza una OF de stock ausente', () => {
    expect(() => generarCorteLona(revision.order)).toThrow(/stock/i);
  });
  it.each(['SUAVE', 'EXTRASUAVE'])('avisa de bamba %s y mantiene los demás toldos', (valanceCurve) => {
    const order = structuredClone(revision.order);
    order.awnings.push({ ...order.awnings[0], id: 'onda', of: '0232569', valanceCurve });
    const salida = generar(order);
    expect(salida.cortes.conSacos[0].piezas.map((p) => p.letra)).toEqual(['A']);
    expect(salida.avisos).toEqual([expect.stringContaining('bamba con onda')]);
  });
  it('avisa de ventana y excluye solo ese toldo', () => {
    const order = structuredClone(revision.order);
    order.awnings.push({ ...order.awnings[0], id: 'ventana', of: '0232569', curtainHasWindow: true });
    const salida = generar(order);
    expect(salida.cortes.conSacos[0].piezas).toHaveLength(1);
    expect(salida.avisos).toEqual([expect.stringContaining('ventana')]);
  });
  it('el plano agarra las cotas a las piezas y lleva los mininúmeros de los empates (Iván, 22/10/2026)', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].projection = 250;
    const salida = generar(order);
    expect(salida.cortes.conSacos[0].piezas[0].piezas.map((p) => p.nombre)).toEqual(['A1', 'A2', 'A BAMBA']);
    const modelo = registrosDxf(salida.plano[0].dxf).filter((r) => valor(r, 67) !== '1');
    // El dibujo, a la izquierda del corte.
    const finDibujo = salida.plano[0].geometria.zonas.toldos.x1;
    const segmentos = modelo.flatMap((r) => {
      if (r.tipo === 'LINE') return [[[numero(r, 10), numero(r, 20)], [numero(r, 11), numero(r, 21)]]];
      if (r.tipo !== 'LWPOLYLINE') return [];
      const xs = r.pares.filter(([k]) => k === 10).map(([, v]) => Number(v)), ys = r.pares.filter(([k]) => k === 20).map(([, v]) => Number(v));
      return xs.map((x, i) => [[x, ys[i]], [xs[(i + 1) % xs.length], ys[(i + 1) % ys.length]]]);
    });
    const sobre = ([x, y]) => segmentos.some(([[x1, y1], [x2, y2]]) => Math.abs((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)) < 1e-6
      && x >= Math.min(x1, x2) - 1e-6 && x <= Math.max(x1, x2) + 1e-6 && y >= Math.min(y1, y2) - 1e-6 && y <= Math.max(y1, y2) + 1e-6);
    const cotas = modelo.filter((r) => r.tipo === 'DIMENSION');
    expect(cotas.length).toBeGreaterThan(4);
    for (const c of cotas) {
      expect(sobre([numero(c, 13), numero(c, 23)]), `cota ${numero(c, 42)}`).toBe(true);
      expect(sobre([numero(c, 14), numero(c, 24)]), `cota ${numero(c, 42)}`).toBe(true);
    }
    // En el dibujo, a1 en cada punta del empate; los dos paños lo llevan en el mismo sitio, así que va una vez.
    const minis = modelo.filter((r) => r.tipo === 'MTEXT' && valor(r, 8) === 'ROTULADOR' && valor(r, 1) === 'a1');
    expect(minis.filter((r) => numero(r, 10) < finDibujo)).toHaveLength(2);
    expect(minis.filter((r) => numero(r, 10) > finDibujo).length).toBeGreaterThanOrEqual(4);
  });
  it('corta la cortina de AR2605193 con su ventana: lona y cristal en dos cortes y un solo plano', () => {
    // Iván, 22/10/2026: a suelo (75 → 57 dibujado), máquina interior, varilla y bamba recta de 15; ventana de 136
    // con laterales de 20. Tres unidades de 312.
    const order = {
      orderCode: 'AR2605193', customer: 'PRUEBA', technician: 'IVÁN', orderDate: '2026-10-22', structureColor: 'BLANCO',
      fabric: 'PVC580MAR|||250|||LONA PVC 580 MARFIL :250 AN|||PLASTICA (LONA)',
      awnings: [{
        id: 'a', of: '0233272', model: 'CORTINA', workType: 'FULL_AWNING', units: 3, width: 312, projection: 250,
        hasValance: true, valanceHeight: 15, valanceCurve: 'RECTA', device: 'MAQ. INTERIOR', crankHeight: 170,
        machineSide: 'M.F.IZQ', placement: 'TECHO', rotFabric: 'NO', rotValance: 'NO', remate: 'COMO TELA',
        curtainHasWindow: true, curtainFinish: 'NORMAL', curtainBottomFinish: 'TUBO DE CARGA', curtainWindowReference: 'SUELO',
        curtainWindowHeight: 136, curtainWindowCorner: 20, curtainWindowFloorHeight: 75,
        curtainFabricAdjustment: 'NINGUNO', curtainFabricAdjustmentCm: 0
      }]
    };
    const salida = generar(order);
    expect(salida.avisos).toEqual([]);
    expect(salida.modelos).toEqual(['CORTINA']);
    const [lona, cristal] = salida.cortes.conSacos;
    expect([lona.material, cristal.material, cristal.anchoRollo]).toEqual(['PVC 580 MARFIL', 'TRANSPARENTE 650 MI', 1400]);
    expect(lona.piezas[0].piezas.map((p) => [p.nombre, p.largo / 10, p.alto / 10])).toEqual([
      ['A1', 308, 60.5], ['A2', 308, 93.5], ['A3', 24, 140], ['A4', 24, 140], ['A BAMBA', 308, 21.5]
    ]);
    expect(cristal.piezas[0].piezas.map((p) => [p.nombre, p.largo / 10, p.alto / 10])).toEqual([['A CRISTAL', 264, 140]]);
    expect(cristal.colocadas).toHaveLength(3);
    expect(cristal.sacos).toEqual([]);
    expect(salida.cortes.trozoSeparado).toBeNull();
    // Como el corte a mano (Iván, 23/10/2026): el nombre de cada banda de mininúmero en su esquina del lado de la
    // ventana, una vez por cortina; solo el nombre en las piezas, y REVÉS y la OF una vez. Los laterales, con su nombre
    // (Iván, 27/10/2026, como AR2604988 a mano); el cristal, sin rótulo.
    const minis = lona.dibujo.textos.filter((t) => t.capa === 'ROTULADOR').map((t) => t.valor);
    expect(['A1', 'A2'].map((n) => minis.filter((v) => v === n).length)).toEqual([3, 3]);
    const rotulos = lona.dibujo.textos.filter((t) => t.capa === 'texto').map((t) => t.valor);
    expect(['REVÉS', '0233272', 'A1', 'A2', 'A', 'A3', 'A4'].map((v) => rotulos.filter((r) => r === v).length)).toEqual([1, 1, 3, 3, 3, 3, 3]);
    expect(cristal.dibujo.textos.filter((t) => t.capa === 'texto' && t.valor !== cristal.dibujo.textos.at(-1).valor)).toEqual([]);
    // Un solo plano: el del cristal es el de su lona.
    expect(salida.plano).toHaveLength(2);
    expect(salida.plano[1]).toMatchObject({ incluidoEn: salida.plano[0].codigoTela, dxf: salida.plano[0].dxf });
    expect(salida.plano[0].dxf).toContain('CRISTAL · TRANSPARENTE 650 MI');
    // Iván, 22/10/2026: las cotas agarradas a las piezas, no en el aire, y los mininúmeros también en el dibujo.
    const modelo = registrosDxf(salida.plano[0].dxf).filter((r) => valor(r, 67) !== '1');
    // El dibujo, a la izquierda del corte.
    const finDibujo = salida.plano[0].geometria.zonas.toldos.x1;
    const segmentos = modelo.flatMap((r) => {
      if (r.tipo === 'LINE') return [[[numero(r, 10), numero(r, 20)], [numero(r, 11), numero(r, 21)]]];
      if (r.tipo !== 'LWPOLYLINE') return [];
      const xs = r.pares.filter(([k]) => k === 10).map(([, v]) => Number(v)), ys = r.pares.filter(([k]) => k === 20).map(([, v]) => Number(v));
      return xs.map((x, i) => [[x, ys[i]], [xs[(i + 1) % xs.length], ys[(i + 1) % ys.length]]]);
    });
    const sobre = ([x, y]) => segmentos.some(([[x1, y1], [x2, y2]]) => Math.abs((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)) < 1e-6
      && x >= Math.min(x1, x2) - 1e-6 && x <= Math.max(x1, x2) + 1e-6 && y >= Math.min(y1, y2) - 1e-6 && y <= Math.max(y1, y2) + 1e-6);
    const alzado = modelo.filter((r) => r.tipo === 'DIMENSION' && numero(r, 13) < finDibujo);
    expect(alzado.length).toBeGreaterThan(8);
    for (const c of alzado) {
      expect(sobre([numero(c, 13), numero(c, 23)]), `cota ${numero(c, 42)}`).toBe(true);
      expect(sobre([numero(c, 14), numero(c, 24)]), `cota ${numero(c, 42)}`).toBe(true);
    }
    const minisAlzado = modelo.filter((r) => r.tipo === 'MTEXT' && valor(r, 8) === 'ROTULADOR' && numero(r, 10) < finDibujo).map((r) => valor(r, 1));
    expect(minisAlzado.sort()).toEqual(['A1', 'A2', 'A3', 'A4']);
    expect(modelo.some((r) => r.tipo === 'MTEXT' && valor(r, 1) === 'X3')).toBe(true);
  });
  it('corta el cuerpo cuando la bamba es de otra tela y deja aviso', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].valanceFabric = 'OTRATELA|||120|||TELA ACRILICA|||ACRILICA';
    const salida = generar(order);
    expect(salida.cortes.conSacos[0].piezas[0].piezas.map((p) => p.nombre)).toEqual(['A']);
    expect(salida.avisos).toEqual([expect.stringContaining('la bamba va en otro material')]);
  });
  it('no modifica el pedido ni sus parámetros o ajustes', () => {
    const order = structuredClone(revision.order);
    const original = structuredClone(order);
    const ajustes = { A: { empate: 'vertical', tiraPartida: false, varillaArribaMm: 80 } };
    const antes = structuredClone(ajustes);
    generar(order, { ajustes });
    expect(order).toEqual(original);
    expect(ajustes).toEqual(antes);
  });
  it('aplica ajustes por id y elige vertical solo al solicitarlo', () => {
    const order = structuredClone(revision.order);
    const normal = generar(order);
    expect(normal.cortes.conSacos[0].piezas[0].piezas[0].nombre).toBe('A');
    const salida = generar(order, { ajustes: { [order.awnings[0].id]: { empate: 'vertical', tiraPartida: false, lateralVerticalCm: 6 } } });
    const cuerpos = salida.cortes.conSacos[0].piezas[0].piezas.filter((p) => !p.nombre.includes('BAMBA'));
    expect(cuerpos.map((p) => p.nombre)).toEqual(['A1', 'A2']);
    expect(cuerpos[0].largo).toBe(2475);
  });
  it('genera las dos opciones desde un pedido con empate horizontal', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].projection = 350;
    order.awnings[0].width = 700;
    const salida = generar(order);
    expect(salida.cortes.trozoSeparado).toHaveLength(1);
    expect(salida.cortes.trozoSeparado[0].dxf).toContain('CORTAR DE RESTOS');
    expect(salida.cortes.trozoSeparado[0].dibujo.textos.filter((t) => t.valor === salida.cortes.conSacos[0].material.toUpperCase())).toHaveLength(1);
    expect(salida.cortes.conSacos[0].colocadas.filter((p) => p.saco).every((p) => p.of === '0230811')).toBe(true);
  });
  it('no genera corte para un planteamiento inválido ni sin medidas', () => {
    const order = structuredClone(revision.order);
    order.awnings[0].units = 0;
    expect(generar(order).cortes.conSacos).toEqual([]);
    order.awnings[0].units = 1;
    order.awnings[0].width = null;
    expect(generar(order).cortes.conSacos).toEqual([]);
  });

  it('corta CAMBIO CORTINA con varilla blanca de 5,5 (+3,5 arriba y raya de rotulador a 7) y con remachado B.N.(4,5) (+4,5 arriba sin raya)', () => {
    const baseOrder = {
      orderCode: 'AR2601829', customer: 'PRUEBA CAMBIO CORTINA', technician: 'IVÁN', orderDate: '2026-10-27',
      fabric: 'PVC580BL|||250|||LONA PVC 580 BLANCO :250 AN|||PLASTICA (LONA)',
      awnings: [{
        id: 'cc-1', of: '0230037', model: 'CAMBIO CORTINA', workType: 'FABRIC_ONLY', units: 1,
        width: 342, projection: 200, hasValance: false, valanceHeight: 0, rotFabric: 'NO',
        curtainHasWindow: false, curtainFinish: 'NORMAL', curtainBottomFinish: 'TUBO DE CARGA',
        curtainTopFinish: 'VARILLA', curtainFabricAdjustment: 'NINGUNO', curtainFabricAdjustmentCm: 0
      }]
    };
    const conVarilla = generar(baseOrder);
    expect(conVarilla.avisos).toEqual([]);
    expect(conVarilla.modelos).toEqual(['CAMBIO CORTINA']);
    const piezaVarilla = conVarilla.cortes.conSacos[0].piezas[0].piezas[0];
    // Frente 342 + 8 (B.N(4) por lado) = 350 cm = 3500 mm; caída 200 + 40 = 240 cm = 2400 mm
    expect([piezaVarilla.nombre, piezaVarilla.largo, piezaVarilla.alto]).toEqual(['A', 3500, 2400]);
    expect(piezaVarilla.marcas).toEqual([
      { lado: 'abajo', mm: 70, retiroMm: 40 },
      { lado: 'arriba', mm: 70, retiroMm: 40 }
    ]);
    expect(conVarilla.plano[0].dxf).toContain('VARILLA BLANCA (5,5)');
    expect(conVarilla.plano[0].dxf).not.toContain('VARILLA NEGRA O BLANCA');

    const remachadoOrder = structuredClone(baseOrder);
    remachadoOrder.awnings[0].curtainTopFinish = 'REMACHADO';
    const conRemachado = generar(remachadoOrder);
    expect(conRemachado.avisos).toEqual([]);
    const piezaRemachado = conRemachado.cortes.conSacos[0].piezas[0].piezas[0];
    expect([piezaRemachado.nombre, piezaRemachado.largo, piezaRemachado.alto]).toEqual(['A', 3500, 2400]);
    expect(piezaRemachado.marcas).toEqual([{ lado: 'abajo', mm: 70, retiroMm: 40 }]);
    expect(conRemachado.plano[0].dxf).toContain('REMACHADO · B.N.(4,5)');
  });

  it('refleja el velcro elegible (cara, lado, color, ancho y alto) en el plano de CORTINA y CAMBIO CORTINA', () => {
    const order = {
      orderCode: 'AR2604890', customer: 'PRUEBA VELCRO', technician: 'IVÁN', orderDate: '2026-10-27', structureColor: 'BLANCO',
      fabric: 'PVC580BL|||250|||LONA PVC 580 BLANCO :250 AN|||PLASTICA (LONA)',
      awnings: [{
        id: 'c-vel', of: '0232763', model: 'CORTINA', workType: 'FULL_AWNING', units: 1,
        width: 300, projection: 200, hasValance: false, valanceHeight: 0, device: 'MAQ. INTERIOR',
        crankHeight: 170, machineSide: 'M.F.IZQ', placement: 'TECHO', rotFabric: 'NO',
        curtainHasWindow: false, curtainFinish: 'VELCRO', curtainBottomFinish: 'TUBO DE CARGA',
        curtainVelcroType: 'BRAVO', curtainVelcroSide: 'POR REVÉS', curtainVelcroColor: 'NEGRO',
        curtainVelcroWidth: 5, curtainVelcroHeight: 215
      }]
    };
    const salida = generar(order);
    expect(salida.avisos).toEqual([]);
    expect(salida.plano[0].dxf).toContain('B.N(4) · VELCRO BRAVO (5) NEGRO POR REVÉS HASTA 215');
    // Y dibujado (Iván, 27/10/2026): una franja de 5 en cada lateral, después de la bastilla, rellena por ser bravo.
    const franjas = (o) => registrosDxf(generar(o).plano[0].dxf).filter((r) => r.tipo === 'HATCH' && valor(r, 8) === 'referencia-1');
    const bravo = franjas(order);
    expect(bravo).toHaveLength(2);
    expect(bravo.every((r) => valor(r, 2) === 'SOLID')).toBe(true);
    const anchos = bravo.map((r) => { const xs = r.pares.filter(([k]) => k === 10).map(([, v]) => Number(v)).slice(1); return Math.round((Math.max(...xs) - Math.min(...xs)) * 1000) / 10; });
    expect(anchos).toEqual([5, 5]);
    const suave = { ...order, awnings: [{ ...order.awnings[0], curtainVelcroType: 'SUAVE' }] };
    expect(franjas(suave).every((r) => valor(r, 2) === 'ANGLE')).toBe(true);
    // Sin velcro en los laterales, ni texto ni franjas.
    const normal = { ...order, awnings: [{ ...order.awnings[0], curtainFinish: 'NORMAL' }] };
    expect(franjas(normal)).toHaveLength(0);
    expect(generar(normal).plano[0].dxf).not.toContain('· VELCRO');
  });

  it('corta las 7 solapas de AR2604205 con empate en la oblicua D y avisa si lleva bastilla', () => {
    const velcro = { tipo: 'BRAVO', lado: 'POR REVÉS', color: 'BLANCO', anchoCm: 5 };
    const order = {
      orderCode: 'AR2604205', customer: 'CONSTRUCCIONES VALIÑAS, S.L', technician: 'IVÁN', orderDate: '2026-10-27',
      fabric: 'PVC650BL|||250|||LONA PVC 650 BLANCO BRILLO :250 AN|||PLASTICA (LONA)',
      awnings: [{
        id: 'sol-1', of: '0231643', model: 'SOLAPAS', workType: 'FABRIC_ONLY', units: 1,
        rotFabric: 'NO', bastilla: false,
        solapas: [
          { id: 's-a', nombre: 'A', largoCm: 275, oblicua: false, anchoCm: 51, velcroIzq: velcro, velcroDer: velcro, velcroDerDistinto: false },
          { id: 's-b', nombre: 'B', largoCm: 275, oblicua: false, anchoCm: 25.5, velcroIzq: velcro, velcroDer: velcro, velcroDerDistinto: false },
          { id: 's-c', nombre: 'C', largoCm: 275, oblicua: false, anchoCm: 35.5, velcroIzq: velcro, velcroDer: velcro, velcroDerDistinto: false },
          { id: 's-d', nombre: 'D', largoCm: 275, oblicua: true, anchoIzqCm: 40, anchoDerCm: 85, velcroIzq: velcro, velcroDer: velcro, velcroDerDistinto: false },
          { id: 's-e', nombre: 'E', largoCm: 275, oblicua: false, anchoCm: 37, velcroIzq: velcro, velcroDer: velcro, velcroDerDistinto: false },
          { id: 's-f', nombre: 'F', largoCm: 275, oblicua: false, anchoCm: 26.5, velcroIzq: velcro, velcroDer: velcro, velcroDerDistinto: false },
          { id: 's-g', nombre: 'G', largoCm: 275, oblicua: false, anchoCm: 35.5, velcroIzq: velcro, velcroDer: velcro, velcroDerDistinto: false }
        ]
      }]
    };
    const salida = generar(order);
    expect(salida.avisos).toEqual([]);
    expect(salida.modelos).toEqual(['SOLAPAS']);
    const corte = salida.cortes.conSacos[0];
    expect(corte.largo).toBe(3600);
    expect(corte.piezas[0].piezas.map((p) => p.nombre)).toEqual([
      'A', 'B', 'C', 'D1', 'D2', 'E', 'F', 'G'
    ]);
    expect(salida.plano[0].dxf).toContain('VELCRO BRAVO (5) BLANCO AL CORTE REVÉS');

    const conBastilla = structuredClone(order);
    conBastilla.awnings[0].bastilla = true;
    const salidaBastilla = generar(conBastilla);
    expect(salidaBastilla.cortes.conSacos).toEqual([]);
    expect(salidaBastilla.avisos).toEqual([expect.stringContaining('pendiente de Oficina Técnica')]);
  });
});
