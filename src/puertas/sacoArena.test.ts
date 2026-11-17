import { describe, expect, it } from 'vitest';
import { nuevaPuerta, calcularPuerta } from './calcular.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { medidasSacoArena } from './sacoArena.ts';
import { puertasDesdeRps } from './rps.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { crearPedidoPuertas, pedidoParaEditar, elementosAprobacion } from './flujo/pedido.ts';
import { corteDelPlano, entidadesBot } from '../flujoDwg/corteDwg.js';
import type { EntidadesPuertas, PedidoPuertas } from './tipos.ts';

const saco = () => ({ ...nuevaPuertaDeCliente('portanova', 'saco-confeccionado'), frente: 2000, alto: 9, of: '0234043', confirmada: true });
const pedido = (): PedidoPuertas => ({ schemaVersion: 1, kind: 'puertas', orderCode: 'AR2605585', elementos: [{ id: 'saco-1', input: saco() }] });

describe('Saco confeccionado de Portanova', () => {
  it.each([
    [2000, 9, 21, 24, 2013, 1007.5],
    [2500, 9, 21, 24, 2513, 1257.5],
    [1500, 7.5, 18, 21, 1513, 757.5],
  ])('calcula %s × %s con la regla de los planos recientes', (largo, aplastado, confeccionado, ancho, corte, mitad) => {
    expect(medidasSacoArena({ frente: largo, alto: aplastado })).toEqual({ largo, aplastado, confeccionado, anchoCorte: ancho, largoCorte: corte, largoMitad: mitad });
    const r = calcularPuerta({ ...saco(), frente: largo, alto: aplastado });
    expect(r.avisos).toEqual([]);
    expect(r.piezas.map(p => [p.ancho, p.alto])).toEqual([[corte, ancho]]);
  });

  it('avisa de medidas, confirmación, cantidad, material, OF y rollo insuficiente', () => {
    expect(calcularPuerta({ ...saco(), frente: 0 }).avisos.some(a => a.codigo === 'MEDIDAS')).toBe(true);
    expect(calcularPuerta({ ...saco(), rollo: 23 }).avisos.some(a => a.codigo === 'NO_CABE')).toBe(true);
    expect(calcularPuerta({ ...saco(), rollo: 30 }).avisos.some(a => a.codigo === 'EMPATE_POR_SEPARADO')).toBe(true);
    expect(calcularPuerta({ ...saco(), cantidad: 1.5, confirmada: false, material: '', of: '' }).avisos.map(a => a.codigo)).toEqual(expect.arrayContaining(['CANTIDAD', 'MODELO', 'MATERIAL', 'SIN_OF']));
  });

  // Transcripción mínima de rps.json (solo lectura); conserva MEDIAS y la ausencia de X de RPS.
  it.each([
    ['5585', 'SACOTGM', 'POR CONFECCION DE SACO RELLENABLE DE MEDIAS 2000X 9 CM( MEDIDO EN PLANO), FABRICADO EN LONA PVC PLATA/ NEGRO.', 2000, 9, '0234043'],
    ['4808', 'SACOTGM', 'POR CONFECCION DE SACO PARA RELLENO ARENA DE MEDIDAS 2500 CM X 9 CM , CONFECCIONADA EN PVC PLATA/NEGRO.', 2500, 9, '0232618'],
    ['1724', 'SACOTGM', 'POR CONFECCION DE SACO DE MEDIAS 2000 CM DE LARGO  X 10 CM DE DIAMETRO,FABRICADO EN LONA PVC PLATA/ NEGRO.', 2000, 10, '0227321'],
    ['0111', 'SACOTGM', 'POR CONFECCION DE SACO PARA RELLENO ARENA DE MEDIDAS 3000 X 9 CM, FABRICADO EN LONA PVC PLATA/NEGRO', 3000, 9, '0224165'],
    ['2823', 'SACOTGM', 'POR CONFECCION DE SACO PARA RELLENO DE ARENA DE MEDIDAS 2000 9 CM , FABRICADO EN LONA PVC, PLATA/NEGRO', 2000, 9, '0229283'],
    ['antiguo', 'FUNDA', 'SACO DE MEDIDAS 1500 X 7,5 CM', 1500, 7.5, '0210000'],
  ])('lee %s sin confundirlo con una puerta', (_pedido, articulo, comentario, frente, alto, of) => {
    const linea = { articulo, comentario, descripcion: 'SACO CONFECCIONADO EN LONA, REJILLA, ACRILICO, ETC PARA DISTINTOS USOS', cantidad: 1, of };
    const r = puertasDesdeRps([linea], { clienteCodigo: '001336' });
    expect(r.puertas).toHaveLength(1);
    expect(r.puertas[0]).toMatchObject({ modelo: 'SACOARENA', frente, alto, of, cantidad: 1, confirmada: false, material: 'TENTALU', color: 'PLATA/NEGRO', rollo: 300 });
    expect(puertasDesdeRps([linea], { clienteCodigo: '000460' }).puertas).toEqual([]);
  });

  it('deja el aplastado vacío con aviso y conserva PUERTA*', () => {
    const r = puertasDesdeRps([
      { articulo: 'SACOTGM', descripcion: '', comentario: 'SACO RELLENABLE DE MEDIDAS 1500 CM', cantidad: 1, of: '0232794' },
      { articulo: 'PUERTAUTO', descripcion: '', comentario: 'DE MEDIDAS 199 X 318 CM', cantidad: 1, of: '0231022' },
    ], { clienteCodigo: '001336' });
    expect(r.puertas.map(p => [p.modelo, p.frente, p.alto])).toEqual([['SACOARENA', 1500, 0], ['PUERTAUTO', 199, 318]]);
    expect(r.avisos.join(' ')).toMatch(/aplastado/i);
  });

  it('un DXF del bot, dos opciones en mm, marcas en negro, OF y cantidad sin REVÉS', () => {
    const r = generarCortePuertas(pedido());
    expect(r.archivo).not.toBeNull();
    const c = r.cortes[0], textos = c.entidades.textos.map(t => t.valor).join(' ');
    expect(textos).toMatch(/SIN EMPATE/);
    expect(textos).toMatch(/PARA EMPATAR/);
    expect(textos).toMatch(/0234043/);
    expect(textos).toMatch(/CANTIDAD: 1/);
    expect(textos).toMatch(/MARCAR POR LADO NEGRO/);
    expect(textos).not.toMatch(/REVÉS/);
    expect(c.colocadas.map(t => [t.pieza.ancho * 10, t.pieza.alto * 10])).toEqual([[20130, 240], [10075, 240], [10075, 240]]);
    expect(c.entidades.lineas.some(l => l.capa === 'ROTULADOR')).toBe(true);
    expect(r.archivo?.dxf).toContain('DISCO1');
  });

  it('plano con confección y ambas opciones, cotas reales y plantilla de Portanova', () => {
    const dxf = escribirPlanoPuertas({ pedido: pedido(), cabecera: { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: '', fecha: '2026-11-17' } });
    for (const texto of ['SACO CONFECCIONADO', 'SIN EMPATE', 'PARA EMPATAR', 'PISAR 3CM', 'SOLDAR 3CM PARA CERRAR EL CILINDRO', 'MARCAR POR LADO NEGRO', 'NEGRO HACIA EL EXTERIOR', '1007,5']) expect(dxf).toContain(texto);
    expect(dxf).toContain('DIMENSION');
    expect(dxf).toContain('CAJET');
  });

  it('guarda y reabre con el mismo circuito de Pedidos y aprobación de OF', () => {
    const p = leerPedidoPuertas(pedido());
    const guardado = crearPedidoPuertas({ pedido: p, cabecera: { cliente: 'PORTANOVA', fecha: '2026-11-17' }, autoria: { technician: 'IVÁN', reviewer: '' }, existente: null, ahora: '2026-11-17T10:00:00Z' });
    expect(pedidoParaEditar(guardado).elementos).toEqual(p.elementos);
    expect(elementosAprobacion(guardado)).toEqual([{ letter: 'A', of: '0234043' }]);
    expect(guardado.summary.models).toEqual(['Saco confeccionado']);
    expect(nuevaPuerta('PUERTAENR').modelo).toBe('PUERTAENR');
  });

  it('el corte extraído del DWG conserva la escala real, separado del esquema de papel', () => {
    const dxf = escribirPlanoPuertas({ pedido: pedido(), cabecera: { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: '', fecha: '2026-11-17' } });
    const extraido = corteDelPlano(dxf);
    expect(extraido.error).toBeNull();
    const bot = entidadesBot(extraido.entidades) as EntidadesPuertas & {noConvertibles:unknown[]};
    expect(bot.noConvertibles).toEqual([]);
    const largos = bot.lineas.filter(l=>l.capa==='DISCO1').map(l=>Math.hypot(l.x2-l.x1,l.y2-l.y1));
    expect(largos.filter(n=>Math.abs(n-20130)<.01)).toHaveLength(2);
    expect(largos.filter(n=>Math.abs(n-10075)<.01)).toHaveLength(4);
    expect(largos.filter(n=>Math.abs(n-240)<.01)).toHaveLength(6);
  });

  it('admite una puerta y un saco en el mismo pedido sin alterar el corte de la puerta', () => {
    const p = pedido();
    p.elementos.push({id:'puerta-2',input:{...nuevaPuertaDeCliente('portanova','autorreparable'),frente:200,alto:250,of:'0231022',color:'BLANCO',confirmada:true,ventanasConfirmadas:true}});
    const antes = generarCortePuertas({...p,elementos:[p.elementos[1]]});
    const mixto = generarCortePuertas(p);
    expect(mixto.archivo).not.toBeNull();
    expect(mixto.resultados[1]).toEqual(antes.resultados[0]);
    const dxf = escribirPlanoPuertas({pedido:p,cabecera:{cliente:'PORTANOVA',tecnico:'IVÁN',revisor:'',fecha:'2026-11-17'}});
    const corte = corteDelPlano(dxf);
    expect(corte.error).toBeNull();
    const bot = entidadesBot(corte.entidades) as EntidadesPuertas;
    expect(bot.lineas.some(l=>Math.abs(Math.hypot(l.x2-l.x1,l.y2-l.y1)-20130)<.01)).toBe(true);
  });
});
