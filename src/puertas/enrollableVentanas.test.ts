import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { calcularPuerta, yEnTramo } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { geometriaAlzado } from './alzado.ts';
import { dibujarAlzadoEnrollable } from './planoEnrollable.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { notaPlanoEnrollable } from './ventanalesEnrollable.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { enrollable5470 } from './__fixtures__/enrollable5470.ts';
import { puertaPlanoReal } from './__fixtures__/planosReales.ts';
import { escribirPlanoPuertas } from './plano.ts';
import huellas from './__fixtures__/sha-portanova-1734a4d.json';
import { anchoArial } from '../domain/corteLona/texto.js';

const centrada5470 = () => {
  const p=enrollable5470();
  return {...p,ventanas:p.ventanas.map((v,i)=>{const tramo=i<3?1:2;return {...v,tramo,y:yEnTramo(p,tramo,v.alto)!};})};
};

describe('Enrollable Portanova con ventanas pequeñas · AR2605470', () => {
  it('centra las ventanas nuevas entre las E.T. de la enrollable, como las apilables', () => {
    const p=enrollable5470();
    expect(yEnTramo(p,1,40)).toBe(75.5);
    expect(yEnTramo(p,2,40)).toBe(141);
    expect(yEnTramo(p,0,40)).toBeNull();
    expect(yEnTramo(p,5,40)).toBeNull();
  });
  it('despieza seis huecos y cristales de 126 × 44 sobre un cuerpo continuo, sin cachos', () => {
    const p = centrada5470(), r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.piezas.flatMap(x => x.huecos)).toHaveLength(6);
    // Iván, 10/11/2026: se proponen centradas entre E.T.; él ajusta después en el corte.
    expect([...new Set(p.ventanas.map(v => v.y))]).toEqual([75.5, 141]);
    expect(r.piezas.filter(x => x.clase === 'cristal').map(x => [x.ancho, x.alto, x.radio])).toEqual(Array(6).fill([126, 44, 4]));
    expect(r.piezas.some(x => x.clase === 'cacho')).toBe(false);
    expect(r.piezas.filter(x => x.clase === 'pano').reduce((s, x) => s + x.alto, 0)).toBe(532);
    expect(r.uniones).toEqual([expect.objectContaining({ altura: 301, solape: 7.5, tubo: 5 })]);
    expect(r.piezas.filter(x => x.clase === 'entrada')).toHaveLength(4);
    expect(notaPlanoEnrollable(p)).toBe('');
  });

  it('dibuja y corta los huecos con CUTTER y el cristal con DISCO1 y CUTTER, agrupado X6', () => {
    const p = centrada5470(), vista = generarCortePuertas(pedidoDe('AR2605470', p));
    expect(vista.archivo?.dxf).toContain('EOF');
    const cristal = vista.cortes.find(c => c.material === p.materialCristal)!;
    expect(cristal.colocadas).toHaveLength(1);
    expect(cristal.colocadas[0].pieza.multiplicador).toBe(6);
    expect(cristal.entidades.arcos.every(a => a.capa === 'CUTTER')).toBe(true);
    expect(cristal.entidades.lineas.some(a => a.capa === 'DISCO1')).toBe(true);
    expect(geometriaAlzado(p, calcularPuerta(p)).formas.filter(f => f.tipo === 'rect' && f.clase === 'puerta-cristal')).toHaveLength(6);
    const l = dibujarAlzadoEnrollable(p, 'A').lienzo;
    expect(l.polilineas.filter(a => a.capa === 'curv')).toHaveLength(6);
    expect(l.polilineas.filter(a => a.capa === 'corte (vent)')).toHaveLength(6);
    expect(l.cotas.filter(c => c.valor === 122)).toHaveLength(6);
    for(const y of [75.5,141]) {
      expect(geometriaAlzado(p,calcularPuerta(p)).formas.filter(f=>f.tipo==='rect'&&f.clase==='puerta-cristal'&&f.y===530-y-40)).toHaveLength(3);
      expect(l.polilineas.filter(f=>f.capa==='curv'&&Math.min(...f.puntos.map(q=>q[1]))===-530+y)).toHaveLength(3);
    }
    const r=calcularPuerta(p);
    expect(r.piezas.filter(x=>x.clase==='pano').flatMap(x=>x.huecos.map(v=>v.y+x.origenAlzado![1])).sort((a,b)=>a-b)).toEqual([75.5,75.5,75.5,141,141,141]);
  });

  it('conserva la opción al guardar y rechaza valores mal formados', () => {
    const pedido = pedidoDe('AR2605470', enrollable5470());
    expect(leerPedidoPuertas(pedido).elementos[0].input.enrollable.ventanasPequenas).toBe(true);
    expect(() => leerPedidoPuertas({ ...pedido, elementos: [{ id: 'puerta-1', input: { ...enrollable5470(), enrollable: { ...enrollable5470().enrollable, ventanasPequenas: 'sí' } } }] })).toThrow();
  });

  it('detecta una ventana que invade una entrada, un remate o un empate y los solapes entre ventanas', () => {
    const p = enrollable5470();
    for (const y of [58, 299, 0]) {
      const r = calcularPuerta({ ...p, ventanas: [{ ...p.ventanas[0], y }] });
      expect(r.avisos.some(a => a.nivel === 'error' && a.codigo.startsWith('VENTANA'))).toBe(true);
    }
    expect(calcularPuerta({ ...p, ventanas: [p.ventanas[0], p.ventanas[0]] }).avisos.some(a => a.codigo === 'VENTANAS_SOLAPADAS')).toBe(true);
  });

  it('conserva y permite editar las alturas fijas antiguas en alzado, plano y corte', () => {
    const p = enrollable5470();
    p.ventanas = p.ventanas.map(v => v.y === 81 ? { ...v, y: 84 } : v);
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const posiciones = r.piezas.filter(x => x.clase === 'pano').flatMap(x => x.huecos.map(v => v.y + x.origenAlzado![1]));
    expect(posiciones.sort((a,b) => a-b)).toEqual([84,84,84,141,141,141]);
    expect(geometriaAlzado(p,r).formas.filter(f => f.tipo === 'rect' && f.clase === 'puerta-cristal' && f.y === 530-84-40)).toHaveLength(3);
    expect(dibujarAlzadoEnrollable(p,'A').lienzo.polilineas.filter(f => f.capa === 'curv' && Math.min(...f.puntos.map(q => q[1])) === -530+84)).toHaveLength(3);
    expect(generarCortePuertas(pedidoDe('AR2605470',p)).cortes.flatMap(c => c.colocadas).filter(t => t.pieza.clase === 'pano').flatMap(t => t.pieza.huecos).some(v => v.y === 75)).toBe(true);
  });

  it('los rótulos de los paños del bot quedan fuera de los huecos de ventana', () => {
    const vista = generarCortePuertas(pedidoDe('AR2605470', enrollable5470()));
    for (const c of vista.cortes) for (const t of c.colocadas.filter(t => t.pieza.clase === 'pano')) {
      for (const texto of c.entidades.textos.filter(x => /^(A\d+|0233871)$/.test(x.valor))) {
        const x = (t.girada ? texto.y-t.y : texto.x-t.x)/10;
        const y = t.girada ? t.pieza.alto-(texto.x-t.x)/10 : (texto.y-t.y)/10;
        if (x < 0 || x > t.pieza.ancho || y < 0 || y > t.pieza.alto) continue;
        const w = anchoArial(texto.valor,texto.h/10), h = texto.h/10;
        expect(t.pieza.huecos.some(v => x+w/2 > v.x && x-w/2 < v.x+v.ancho && y+h/2 > v.y && y-h/2 < v.y+v.alto), texto.valor).toBe(false);
      }
    }
  });
});

describe('Portanova conserva los archivos de main 1734a4d', () => {
  it.each(Object.entries(huellas))('%s · plano y bot idénticos por SHA-256', (codigo, esperado) => {
    const pedido = pedidoDe(codigo, puertaPlanoReal(codigo));
    const sha = (s: string) => createHash('sha256').update(s).digest('hex');
    expect(sha(escribirPlanoPuertas({ pedido, cabecera: { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: '', fecha: '10/11/2026' } }))).toBe(esperado.plano);
    expect(sha(generarCortePuertas(pedido).archivo!.dxf)).toBe(esperado.bot);
  });
});
