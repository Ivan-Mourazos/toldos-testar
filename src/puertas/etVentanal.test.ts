import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { calcularPuerta, nuevaPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { dxfACmt } from '../cmt/index.ts';
import type { Puerta } from './tipos.ts';

// AR2605639 (Portanova): T 154, D 60 en 345 de alto; la hoja pide E.T. a 60, 131 y 191 y se guardó solo la de 60.
function puerta5639(alturas: number[]): Puerta {
  const p = nuevaPuerta('PUERTAENR');
  return { ...p, frente: 312, alto: 345, of: '0234164', confirmada: true, ventanasConfirmadas: true,
    material: 'LAC900', color: 'GRIS 7038',
    enrollable: { ...p.enrollable, T: 154, D: 60, margen: 6, saco: 80, sacoPartido: true },
    entradas: alturas.map(altura => ({ altura, diametro: 30 as const, largo: 312, alto: 8, huecos: [] })) };
}

describe('E.T. de los bordes del ventanal de enrollable', () => {
  it('avisa si falta la E.T. de arriba o de abajo del ventanal', () => {
    const r = calcularPuerta(puerta5639([60]));
    const aviso = r.avisos.find(a => a.codigo === 'ET_FALTA');
    expect(aviso?.nivel).toBe('error');
    expect(aviso?.texto).toContain('191 y 131');
  });
  it('no avisa con las tres E.T. de la hoja', () => {
    const r = calcularPuerta(puerta5639([60, 131, 191]));
    expect(r.avisos.some(a => a.codigo === 'ET_FALTA')).toBe(false);
    expect(r.piezas.filter(x => x.clase === 'entrada').length).toBe(3);
  });
  it('sin E.T. encima del ventanal no pide la de arriba', () => {
    const p = puerta5639([60, 131]);
    const r = calcularPuerta({ ...p, enrollable: { ...p.enrollable, sinEtArriba: true } });
    expect(r.avisos.some(a => a.codigo === 'ET_FALTA')).toBe(false);
  });
});

describe('E.T. enteras de restos en el mismo corte', () => {
  const stock = { ofStockSacos: '0230811' };
  it('5639 completo coloca las cinco puertas y sus 15 E.T. dentro de 18,92 ML', () => {
    const a = puerta5639([60, 131, 191]);
    const b = { ...a, frente: 322, cantidad: 2, of: '0234165', entradas: a.entradas.map(e => ({ ...e, largo: 322 })) };
    const c = { ...a, alto: 360, cantidad: 2, of: '0234166', enrollable: { ...a.enrollable, T: 169 } };
    const pedido = pedidoDe('AR2605639', a, b, c);
    const lona = generarCortePuertas(pedido, stock).cortes[0];
    expect(lona.largo).toBeLessThanOrEqual(18920);
    expect(lona.colocadas.filter(t => t.pieza.clase === 'entrada')).toHaveLength(15);
    expect(lona.extensionDibujo).toBeUndefined();
    expect(lona.colocadas.filter(t => t.pieza.clase === 'pano')).toHaveLength(10);
    expect(lona.colocadas.filter(t => t.pieza.clase === 'cacho')).toHaveLength(10);
    expect(lona.colocadas.filter(t => t.pieza.id.startsWith('stock-'))).toHaveLength(2);
    const cajas = lona.colocadas.map(t => ({ x: t.x, y: t.y,
      w: 10 * (t.girada ? t.pieza.alto : t.pieza.ancho), h: 10 * (t.girada ? t.pieza.ancho : t.pieza.alto) }));
    cajas.forEach((a,i) => {
      expect(a.x + a.w).toBeLessThanOrEqual(lona.largo);
      expect(a.y + a.h).toBeLessThanOrEqual(lona.anchoRollo);
      expect(cajas.slice(i+1).some(b => a.x < b.x+b.w && b.x < a.x+a.w && a.y < b.y+b.h && b.y < a.y+a.h)).toBe(false);
    });
  });
  it('5639 conserva todas las piezas y sus bordes, con el consumo acotado al rollo principal', () => {
    const pedido = pedidoDe('AR2605639', puerta5639([60,131,191]));
    const {cortes, archivo, resultados} = generarCortePuertas(pedido, stock);
    const lona = cortes[0], aparte = lona.colocadas.filter(t => t.x >= lona.largo + 1500);
    expect(lona.largo).toBe(3120);
    expect(aparte).toHaveLength(3);
    expect(aparte.every(t => t.pieza.clase === 'entrada')).toBe(true);
    const ids = cortes.flatMap(c => c.colocadas.filter(t=>!t.pieza.id.startsWith('stock-')).map(t=>t.pieza.id)).sort();
    expect(ids).toEqual(resultados.flatMap(r=>r.piezas.flatMap(p=>Array(p.cantidad).fill(p.id))).sort());
    for (const t of aparte) {
      const bordes = lona.entidades.lineas.filter(l=>l.capa==='DISCO1' && l.x1>=lona.largo+1500);
      for (const y of [t.y, t.y+10*t.pieza.alto])
        expect(bordes.some(l=>l.y1===y && l.y2===y && Math.min(l.x1,l.x2)<=t.x && Math.max(l.x1,l.x2)>=t.x+10*t.pieza.ancho)).toBe(true);
    }
    expect(escribirPlanoPuertas({pedido,...stock,cabecera:{cliente:'PORTANOVA',tecnico:'IVÁN',revisor:'',fecha:'2026-11-19'}})).toContain('CORTAR DE RESTOS');
    const convertido=dxfACmt(archivo!.dxf,{sinTextos:true});
    expect(convertido.dudas).toEqual([]);
    expect(convertido.cmt).toBeTruthy();
    // El CMT usa puntos de 1/72 de pulgada y traslada el origen del dibujo.
    const puntos = convertido.objetos.filter(o => o.layer === 'DISCO1').flatMap(o => o.paths.flat());
    const derecha = Math.max(...puntos.map(p => p.x));
    const ox = derecha - lona.extensionDibujo! * 72/25.4;
    const oy = Math.min(...puntos.filter(p => Math.abs(p.x-derecha)<.1).map(p => p.y));
    for (const t of aparte) {
      for (const x of [t.x, t.x + t.pieza.ancho*10]) for (const y of [t.y, t.y + t.pieza.alto*10]) {
        expect(puntos.some(p => Math.abs((p.x-ox)*25.4/72-x)<.1 && Math.abs((p.y-oy)*25.4/72-y)<.1)).toBe(true);
      }
    }
  });
  it('coloca una E.T. sobre los paños si cabe en el largo base', () => {
    const p = puerta5639([60, 131, 191]);
    p.alto = 337;
    p.enrollable.T = 146;
    const c = generarCortePuertas(pedidoDe('AR2605639', p), stock).cortes[0];
    expect(c.largo).toBe(3120);
    expect(c.colocadas.filter(t => t.pieza.clase === 'entrada' && !t.aparte)).toHaveLength(1);
    expect(c.colocadas.filter(t => t.aparte)).toHaveLength(2);
  });
  it.each([[49, 3], [50, 0]])('tres E.T. de %i cm frente a medio rollo de 150 cm', (alto, apartes) => {
    const p = puerta5639([60, 131, 191]);
    p.enrollable.anchoEt = alto;
    const c = generarCortePuertas(pedidoDe('AR2605639', p), stock).cortes[0];
    expect(c.colocadas.filter(t => t.aparte)).toHaveLength(apartes);
  });
  it('mantiene en el rollo las tiras numerosas y completa huecos con stock', () => {
    const p=puerta5639([60, 131, 191, ...Array.from({length:19},(_,i)=>15+i*8)].sort((a,b)=>a-b));
    const c=generarCortePuertas(pedidoDe('AR2605639',p),stock).cortes[0];
    expect(c.colocadas.filter(t=>t.pieza.clase==='entrada')).toHaveLength(22);
    expect(c.colocadas.every(t=>t.x<c.largo)).toBe(true);
    expect(c.colocadas.some(t=>t.pieza.id.startsWith('stock-'))).toBe(true);
  });
  it('con todo dentro conserva el corte de una sola pieza de rollo', () => {
    const p=puerta5639([60,131,191]); p.alto=310; p.enrollable.T=119;
    const c=generarCortePuertas(pedidoDe('AR2605639',p),stock).cortes[0];
    expect(c.largo).toBe(3120);
    expect(c.colocadas.filter(t=>t.pieza.clase==='entrada')).toHaveLength(3);
    expect(c.extensionDibujo).toBeUndefined();
    // La colocación completa ya cabía en main. Se conservan entidades, posiciones y rótulos.
    expect(createHash('sha256').update(JSON.stringify(c)).digest('hex')).toBe('9f2c6500aa0806d8aec03463a0fb56ded8353f5ffcaebaf70274691b26159026');
  });
});
