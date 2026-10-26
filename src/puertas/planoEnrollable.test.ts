import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { numero, registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { apilable, autorreparable, base, pedidoDe, puerta4638 } from './__fixtures__/ejemplos.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { dibujarAlzadoEnrollable } from './planoEnrollable.ts';

const cabecera = { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' };
/** Dónde empieza el corte en el modelo: la cota grande (XERA 20) más a la izquierda. */
const inicioCorte = (rs: ReturnType<typeof registrosDxf>) => Math.min(...rs.filter(r => r.tipo === 'DIMENSION' && valor(r, 3) === 'XERA 20').map(r => numero(r, 13)));
const puerta = () => ({ ...base('PUERTAENR', 212, 360), of: '0233175', cantidad: 3,
  observaciones: 'OBSERVACIÓN RPS QUE NO SE IMPRIME',
  entradas: [60, 131, 191].map(altura => ({ altura, diametro: 30 as const, largo: 212, alto: 8, huecos: [] })),
  enrollable: { T: 169, D: 60, margen: 6, empates: [] } });
const plano = () => escribirPlanoPuertas({ pedido: pedidoDe('AR2605134', puerta()), cabecera });
const modelo = (dxf: string) => registrosDxf(dxf).filter(r => valor(r, 67) !== '1');

describe('Plano de enrollables según el DWG de Iván AR2605134', () => {
  it('dibuja los paños y los solapes en DISCO1, las tres cabeceras y tres FLECHA2 de la oficina', () => {
    const ent = modelo(plano()).filter(r => numero(r, 10) < 105 && numero(r, 20) > 95);
    const horizontales = (capa: string, largo: number) => ent.filter(r => r.tipo === 'LINE' && valor(r, 8) === capa
      && Math.abs(Math.abs(numero(r, 11) - numero(r, 10)) - largo) < 1e-6 && numero(r, 20) === numero(r, 21));
    expect(horizontales('DISCO1', 2.12).map(r => numero(r, 20))).toContain(100.035);
    expect(horizontales('referencias', 2.12).map(r => numero(r, 20))).toContain(100);
    expect(horizontales('ROTULADOR', 2.12).map(r => numero(r, 20))).toContain(99.965);
    expect(ent.filter(r => r.tipo === 'INSERT' && valor(r, 2) === 'FLECHA2' && valor(r, 8) === 'ROTULADOR')).toHaveLength(3);
    const cajas = ent.filter(r => r.tipo === 'LWPOLYLINE' && valor(r, 8) === 'DISCO1').map(r => {
      const pares = r.pares as Array<[number, string]>;
      const xs = pares.filter(([k]) => k === 10).map(([, x]) => Number(x));
      const ys = pares.filter(([k]) => k === 20).map(([, y]) => Number(y));
      return [Math.round((Math.max(...xs) - Math.min(...xs)) * 1000) / 10,
        Math.round((Math.max(...ys) - Math.min(...ys)) * 1000) / 10];
    });
    expect(cajas).toContainEqual([204, 56.5]);
    expect(cajas.filter(c => c[0] === 7 && c[1] === 56.5)).toHaveLength(2);
    expect(modelo(plano()).filter(r => r.tipo === 'HATCH' && valor(r, 8) === 'referencia-1')).toHaveLength(2);
    expect(horizontales('ejes', 2.12)).toHaveLength(3);
    expect(horizontales('borrar', 2.12)).toHaveLength(1);
  });

  it('conserva las instrucciones, las notas y el detalle sin títulos ni observaciones de RPS', () => {
    const dxf = plano();
    for (const texto of ['MATERIALES:', 'TRANSP. 1000MI', 'LAC 900 AZUL 5002', 'LAC 900 NEGRO',
      'SOLDAR SACO Y E.T EN LA MISMA SOLDADURA', 'BOLSILLO NEGRO', '1 CM',
      'LAS ENTRADAS DE TUBO INTERIORES DE LAS PUERTAS ENROLLABLES TIENEN QUE IR DE 5 CM.',
      'NO PONER NUNCA LAS ETIQUETAS EN LA PROPIA LONA', 'AL CORTE', 'COSER VELCRO', '0233175']) expect(dxf.includes(texto), texto).toBe(true);
    for (const texto of ['PUERTA A ·', 'CORTE ·', 'OBSERVACIÓN RPS']) expect(dxf.includes(texto), texto).toBe(false);
    // La nota de la raya del pie, que faltaba (Iván, 24/10/2026).
    for (const texto of ['CERRAR E.T', '2 CM MÁXIMO']) expect(dxf.includes(texto), texto).toBe(true);
    const ent = registrosDxf(dxf);
    // Iván, 22/10/2026: también en Portanova el cajetín de la oficina al día (CAJETIN TGM), con las notas de su plantilla.
    expect(ent.filter(r => r.tipo === 'INSERT' && valor(r, 67) === '1' && valor(r, 2) === 'CAJETIN')).toHaveLength(0);
    expect(ent.filter(r => r.tipo === 'INSERT' && valor(r, 67) === '1' && valor(r, 2) === 'CAJETIN TGM')).toHaveLength(1);
    const alzado = modelo(dxf).filter(r => numero(r, 10) < 105 && numero(r, 20) > 95);
    for (const texto of ['X3', 'A1', 'A2', 'REVÉS', '0233175']) expect(alzado.some(r => valor(r, 1) === texto)).toBe(true);
  });

  it('conserva las cinco ventanas de Portanova, con el alzado a la izquierda y el corte a la derecha', () => {
    const vistas = registrosDxf(plano()).filter(r => r.tipo === 'VIEWPORT' && numero(r, 69) > 1);
    const izquierda = vistas.find(r => numero(r, 69) === 2)!;
    const derecha = vistas.find(r => numero(r, 69) === 4)!;
    expect(vistas).toHaveLength(5);
    expect(numero(izquierda, 40)).toBeGreaterThan(140);
    expect(numero(izquierda, 41)).toBeGreaterThan(170);
    expect(numero(izquierda, 10)).toBeLessThan(100);
    expect(numero(derecha, 10)).toBeGreaterThan(210);
    expect(numero(derecha, 20) - numero(derecha, 41) / 2).toBeGreaterThan(55);
    const plantilla = registrosDxf(readFileSync(new URL('./plantillas/portanova.dxf', import.meta.url), 'utf8'));
    // Las ventanas del detalle del saco siguen al detalle, que va dentro del recuadro DIBUJO (23/10/2026): solo cambia su vista.
    const sinVista = (r?: { pares: unknown }) => (r?.pares as Array<[number, string]>).filter(([k]) => ![12, 22].includes(k));
    for (const id of [3, 5, 6]) expect(sinVista(vistas.find(r => numero(r, 69) === id))).toEqual(sinVista(plantilla.find(r => r.tipo === 'VIEWPORT' && numero(r, 69) === id)));
    const desplazamiento = (id: number) => [12, 22].map(k => numero(vistas.find(r => numero(r, 69) === id)!, k) - numero(plantilla.find(r => r.tipo === 'VIEWPORT' && numero(r, 69) === id)!, k));
    expect(desplazamiento(3)[0]).toBeCloseTo(desplazamiento(5)[0], 6);
    expect(desplazamiento(3)[1]).toBeCloseTo(desplazamiento(5)[1], 6);
    expect(desplazamiento(6)).toEqual([0, 0]);
    const atributos = registrosDxf(plano()).filter(r => r.tipo === 'ATTRIB');
    for (const [tag, dato] of [['PEDIDO', 'AR2605134'], ['OF', '0233175'], ['CLIENTE', 'PORTANOVA'], ['TECNICO', 'IVÁN'], ['REVISOR', 'DAVID'], ['FECHA', '22/10/26']]) {
      expect(atributos.find(r => valor(r, 2) === tag) && valor(atributos.find(r => valor(r, 2) === tag)!, 1)).toBe(dato);
    }
  });

  it('X3 y REVÉS una sola vez (Iván, 22/10/2026): en A1 del alzado y en el primer paño del corte, con la OF', () => {
    const textos = modelo(plano()).filter(r => r.tipo === 'MTEXT');
    const alzado = textos.filter(r => numero(r, 10) < 105 && numero(r, 20) > 95);
    const corte = textos.filter(r => numero(r, 10) > inicioCorte(registrosDxf(plano())) - 1);
    const cuenta = (lista: typeof textos, v: string) => lista.filter(r => valor(r, 1) === v).length;
    for (const [v, n] of [['X3', 1], ['A1', 1], ['REVÉS', 1], ['0233175', 1], ['A2', 1]] as const) expect(cuenta(alzado, v), v).toBe(n);
    const y = (v: string) => numero(alzado.find(r => valor(r, 1) === v)!, 20);
    expect(y('X3')).toBeGreaterThan(y('A1'));
    expect(y('REVÉS')).toBeLessThan(y('A1'));
    expect(y('A2')).toBeLessThan(y('0233175'));
    // El corte lleva los textos del bot, uno a uno (corteEnPlano.test.ts): es el corte que se manda (Iván, 24/10/2026).
    expect(cuenta(corte, 'REVÉS')).toBeGreaterThan(0);
  });

  it('MATERIALES abajo, junto a las notas, y el corte arriba con cotas que se leen al imprimir (Iván, 22/10/2026)', () => {
    const ent = registrosDxf(plano());
    const materiales = ent.find(r => r.tipo === 'MTEXT' && valor(r, 67) === '1' && /^MATERIALES/.test(valor(r, 1) ?? ''))!;
    expect(numero(materiales, 10)).toBeCloseTo(162.526, 2);
    expect(numero(materiales, 20)).toBeCloseTo(77.012, 2);
    const vista = ent.find(r => r.tipo === 'VIEWPORT' && numero(r, 69) === 4)!;
    expect(numero(vista, 20) - numero(vista, 41) / 2).toBeGreaterThanOrEqual(79.9);
    expect(numero(vista, 20) + numero(vista, 41) / 2).toBeCloseTo(201.882, 2);
    // El dibujo del corte empieza arriba del todo de su ventana; en el modelo, alineado arriba con la puerta (23/10/2026).
    expect(numero(vista, 22) + numero(vista, 45) / 2).toBeCloseTo(100.4, 2);
    // Las de la plantilla (detalle del saco, más a la derecha en el modelo) no cambian.
    const x0 = Math.min(...ent.filter(r => r.tipo === 'DIMENSION' && valor(r, 3) === 'XERA 20').map(r => numero(r, 13)));
    const cotas = ent.filter(r => r.tipo === 'DIMENSION' && numero(r, 13) >= x0 && numero(r, 13) < x0 + 10);
    expect(cotas).toHaveLength(6);
    expect(cotas.every(r => valor(r, 3) === 'XERA 20')).toBe(true);
    const estilo = registrosDxf(plano(), 'TABLES').find(r => r.tipo === 'DIMSTYLE' && valor(r, 2) === 'XERA 20')!;
    expect(numero(estilo, 140)).toBe(.2);
  });

  it('acota el saco, el cristal y la lona según el corte recibido, sin fijar su colocación', () => {
    const pedido = pedidoDe('AR2605134', puerta());
    const corte = generarCortePuertas(pedido).cortes;
    const ent = registrosDxf(escribirPlanoPuertas({ pedido, cabecera }));
    const medidas = ent.filter(r => r.tipo === 'DIMENSION').map(r => numero(r, 42));
    for (const medida of [218.5, 26, 204, 56.5, 300]) expect(medidas).toContain(medida);
    for (const c of corte.filter(c => c.colocadas.some(t => t.pieza.clase === 'pano'))) expect(medidas).toContain(c.largo / 10);
    // El transparente conserva el multiplicador del bot aunque solo se anide una muestra: va en sus textos, que son los del
    // bot (corteEnPlano.test.ts).
    const muestras = modelo(escribirPlanoPuertas({ pedido, cabecera })).filter(r => numero(r, 10) > inicioCorte(ent) - 0.2 && numero(r, 20) > 88);
    expect(muestras.some(r => r.tipo === 'MTEXT' && /X3/.test(valor(r, 1) ?? ''))).toBe(true);
  });
  it('las rayas de rotulador del alzado son las del corte, también con una E.T. encima del ventanal (AR2605220)', () => {
    const ar5220 = { ...base('PUERTAENR', 366, 410), of: '0233291',
      entradas: [50, 121, 181, 231].map(altura => ({ altura, diametro: 30 as const, largo: 366, alto: 8, huecos: [] })),
      enrollable: { T: 229, D: 60, margen: 8, empates: [] } };
    for (const p of [puerta(), ar5220]) {
      const { lienzo } = dibujarAlzadoEnrollable(p, 'A');
      const rayas = lienzo.lineas.filter(t => t.capa === 'ROTULADOR' && t.y1 === t.y2 && t.x1 === 0 && t.x2 === p.frente).map(t => t.y1);
      const { piezas } = calcularPuerta(p);
      // Cada paño en el alzado: A1 desde su borde de abajo (-T - 3,75) y A2 desde el suyo (-H + 11).
      for (const [nombre, abajo] of [['Paño superior', -p.enrollable.T - 3.75], ['Paño inferior', -p.alto + 11]] as const) {
        const marcas = piezas.find(x => x.nombre === nombre)!.marcas.filter(([x1, y1, x2, y2]) => y1 === y2 && x2 - x1 > p.frente / 2);
        for (const [, y] of marcas) expect(rayas.some(r => Math.abs(r - (abajo + y)) < 1e-6), `${p.frente}: ${nombre} a ${y}`).toBe(true);
      }
    }
    // Los sacos de stock que rellenan el rollo no salen como piezas sueltas de la puerta.
    const pedido = pedidoDe('AR2605220', ar5220);
    const conStock = generarCortePuertas(pedido, { ofStockSacos: '0230811' }).cortes;
    expect(conStock.some(c => c.colocadas.some(t => t.pieza.id.startsWith('stock-')))).toBe(true);
    // En el plano, una vez cada uno: lo comprueba corteEnPlano.test.ts contra los textos del bot.
    const textos = modelo(escribirPlanoPuertas({ pedido, cabecera, ofStockSacos: '0230811' })).filter(r => r.tipo === 'MTEXT').map(r => valor(r, 1) ?? '');
    expect(textos.filter(t => t.includes('STOCK')).length).toBe(generarCortePuertas(pedido, { ofStockSacos: '0230811' }).archivo!.entidades.textos.filter(t => t.valor.includes('STOCK')).length);
  });
  it('el rollo usa las rayas DISCO1 ya fusionadas del corte, sin cerrar los orillos', () => {
    const pedido = pedidoDe('AR2605134', puerta());
    const corte = generarCortePuertas(pedido).cortes.find(c => c.colocadas.some(t => t.pieza.clase === 'pano'))!;
    const ent = modelo(escribirPlanoPuertas({ pedido, cabecera }));
    const largo = ent.find(r => r.tipo === 'DIMENSION' && numero(r, 42) === corte.largo / 10)!;
    const x0 = numero(largo, 13), y0 = numero(largo, 23), y1 = y0 + corte.anchoRollo / 1000;
    const lineas = ent.filter(r => r.tipo === 'LINE' && valor(r, 8) === 'DISCO1' && numero(r, 10) >= x0
      && numero(r, 20) >= y0 - 1e-6 && numero(r, 20) <= y1 + 1e-6);
    const maquina = corte.entidades.lineas.filter(r => r.capa === 'DISCO1');
    expect(lineas).toHaveLength(maquina.length);
    for (const l of maquina) expect(lineas.some(r => Math.abs(numero(r, 10) - (x0 + l.x1 / 1000)) < 1e-6
      && Math.abs(numero(r, 11) - (x0 + l.x2 / 1000)) < 1e-6
      && Math.abs(numero(r, 20) - (y0 + l.y1 / 1000)) < 1e-6
      && Math.abs(numero(r, 21) - (y0 + l.y2 / 1000)) < 1e-6)).toBe(true);
  });
});

describe('Regresión: planos de oficina y presentación compartida', () => {
  // Huellas del nuevo plano CAD (renovadas el 22/10/2026 por el cajetín de la oficina, CAJETIN TGM, y las líneas
  // de referencia de las cotas hasta la pieza); la de
  // enrollable de main se comprueba en planoTaller.test.ts.
  it.each([
    // Renovadas por las correcciones de taller: huecos abiertos, marcas, rótulos y anclajes de cotas; la
    // autorreparable, también porque ahora sí se crea el estilo XERA 20 en la plantilla de toldos.
    // 23/10/2026: «SACO DE 100», sin la DIN A3 vacía, la cota del corte hasta la pieza más alta sin rayas del rollo
    // y los refuerzos centrados en su hueco con una raya a cada uno; sin los «a2» del saco partido en el dibujo
    // del saco (correcciones de Iván sobre AR2605035). Después, cotas verticales más juntas, nota BOLSILLO y
    // cajetín algo más pequeño (23/10/2026). Luego, presentación «PUERTA A», el corte en fila con la puerta y ventanas con la proporción justa. Después, el corte a la derecha y los recuadros DIBUJO y CORTE pegados, con margen del 20 %.
    ['apilable', apilable, 'deba5a3bd8eee4e66bb12d6e9abbcae394cdb7b8c588a1ce585da64916af991a'],
    // Tetris coloca las dos E.T. sobre los paños: baja de 711 a 700 cm sin cambiar el alzado.
    ['autorreparable', autorreparable, '1dd06496b64f865819301b8659b348277a94fcf9ff14af809be6c62b7d9ec08b'], // Solo cambia «SACO DE 110» (23/10/2026).,
  ] as const)('%s conserva el DXF byte por byte', (_, crear, hash) => {
    const pedido = { ...pedidoDe('AR2600001', crear()), cabecera: { clienteRps: { codigo: '009999' } } };
    expect(createHash('sha256').update(escribirPlanoPuertas({ pedido, cabecera })).digest('hex')).toBe(hash);
  });
  it.each([apilable, autorreparable])('Portanova cambia la hoja, manteniendo el dibujo del otro modelo', crear => {
    const p = crear(), pedido = pedidoDe('AR2600001', p);
    const propio = escribirPlanoPuertas({ pedido, cabecera });
    const anterior = escribirPlanoPuertas({ pedido: { ...pedido, cabecera: { clienteRps: { codigo: '009999' } } }, cabecera });
    // Sin el detalle del saco de la plantilla de Portanova, que es de su hoja.
    const detalle = new Set(registrosDxf(readFileSync(new URL('./plantillas/portanova.dxf', import.meta.url), 'utf8')).filter(r => valor(r, 330) === '1F').map(r => valor(r, 5)));
    const geometria = (dxf: string) => registrosDxf(dxf).filter(r => valor(r, 67) !== '1' && !detalle.has(valor(r, 5)) && valor(r, 8) !== 'RECUADROS' && numero(r, 20) > 50 && numero(r, 10) > 99)
      // El sentido de los textos (11/21 del MTEXT, 53 de la cota) puede cambiar si la hoja gira la vista del corte.
      .map(r => ({ tipo: r.tipo, pares: (r.pares as Array<[number, string]>).filter(([k]) => ![5, 330, 62, 53].includes(k) && !(k === 2 && r.tipo === 'DIMENSION')
        && !([11, 21].includes(k) && r.tipo === 'MTEXT'))
        .map(([k, v]) => [k, numero(r, 10) > 150 && [10, 11, 12, 13, 14].includes(k) && !(k === 11 && r.tipo === 'MTEXT') ? (Number(v) - 100).toFixed(6) : v]) }));
    expect(geometria(propio)).toEqual(geometria(anterior));
    expect(registrosDxf(propio).filter(r => r.tipo === 'VIEWPORT' && numero(r, 69) > 1)).toHaveLength(5);
  });
  it('AR2605134 de otro cliente lleva la hoja web con el cajetín de la oficina y el nuevo dibujo de enrollable', () => {
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2605134', puerta()), cabecera: { ...cabecera, cliente: 'OTRO CLIENTE' } });
    expect(registrosDxf(dxf).some(r => r.tipo === 'INSERT' && valor(r, 67) === '1' && valor(r, 2) === 'CAJETIN TGM')).toBe(true);
    expect(registrosDxf(dxf).some(r => r.tipo === 'INSERT' && valor(r, 67) !== '1' && valor(r, 2) === 'FLECHA2')).toBe(true);
  });
  it('la presentación de toldos conserva su resultado byte por byte', () => {
    const vacio = { lineas: [], polilineas: [], textos: [], cotas: [] };
    const toldo = { ...vacio, lineas: [{ capa: 'corte', x1: 10, y1: 10, x2: 14, y2: 12 }],
      corte: { ...vacio, lineas: [{ capa: 'DISCO1', x1: 20, y1: 20, x2: 23, y2: 22 }] },
      zonas: { toldos: { x0: 9, y0: 9, x1: 15, y1: 13 }, corte: { x0: 19, y0: 19, x1: 24, y1: 23 } } };
    const dxf = escribirDxfPlano(toldo, { pedido: 'AR2600001', of: '0232309', ...cabecera, fecha: '22/10/26', pagina: '1/1', material: 'LAC900 BLANCO' }).dxf;
    expect(createHash('sha256').update(dxf).digest('hex')).toBe('6383dcfb81e796a03e5ad233215521ac7944ad261b93c88c39dac25c2f8ca6c6');
  });
});

// Iván, 26/10/2026: en el PDF de AR2605220 «no salía el texto de saco de 80».
describe('rótulo del saco en el plano de enrollables', () => {
  it('lleva «SACO DE …» bajo la puerta, como las apilables', () => {
    const p = { ...puerta4638(), enrollable: { ...puerta4638().enrollable, saco: 80 } };
    expect(escribirPlanoPuertas({ pedido: pedidoDe('AR2605220', p), cabecera })).toContain('SACO DE 80');
  });
});
