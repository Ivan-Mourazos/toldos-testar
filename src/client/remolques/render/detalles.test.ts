import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { escenaDePrueba } from './casos-prueba';
import { piezasCierres } from './cierres';
import { piezasCuerpo } from './cuerpo';
import { piezasVentana } from './ventana';

const cierre = (recogida: string) =>
  escenaDePrueba({ recogeDelante: recogida }).cierres.filter((c) => c.esquina === 'delante-derecha');
const maxY = (geo: THREE.BufferGeometry) => { geo.computeBoundingBox(); return geo.boundingBox!.max.y; };

describe('cierres en 3D', () => {
  it('goma: oreja con ollaos en el borde y en el lateral, y la goma en zigzag entre ellos', () => {
    const r = piezasCierres(cierre('GOMA'));
    expect(r.piezas).toHaveLength(1);
    expect(r.ollaos).toHaveLength(5 + 4);
    expect(r.gomas).toHaveLength(1);
    expect(r.gomas[0]).toHaveLength(9);
  });

  it('cremallera hasta 4 cm por debajo de la cima, con su tirador', () => {
    const r = piezasCierres(cierre('CREMALLERA'));
    expect(r.piezas.map((p) => p.material)).toEqual(['oscuro', 'herraje']);
    expect(maxY(r.piezas[0].geometria)).toBeCloseTo(96, 1);
  });

  it('velcro: la oreja y la tira de 3 cm en su borde', () => {
    expect(piezasCierres(cierre('VELCRO')).piezas.map((p) => p.material)).toEqual(['lona', 'oscuro']);
  });

  it('puentes: solapa, una placa y una anilla por altura y la cincha blanca', () => {
    const r = piezasCierres(cierre('PUENTES HIJOS DE PEDRO LOPEZ'));
    expect(r.piezas).toHaveLength(1 + 5 * 2 + 1);
    expect(r.piezas.at(-1)!.material).toBe('cincha');
  });

  it('sin recogida no se dibuja nada', () => {
    expect(piezasCierres(cierre('NO'))).toEqual({ piezas: [], ollaos: [], gomas: [] });
  });
});

describe('ventana y acabados', () => {
  it('ventana: marco, malla, persiana enrollada y dos cintas', () => {
    const escena = escenaDePrueba({ ventana: true, ventanaAncho: 50, ventanaAlto: 35 });
    const piezas = piezasVentana(escena.ventana!);
    expect(piezas.map((p) => p.material)).toEqual(['oscuro', 'malla', 'lona', 'oscuro', 'oscuro']);
    // La persiana va encima de la ventana (su borde de arriba está en 95).
    expect(maxY(piezas[2].geometria)).toBeGreaterThan(95);
  });

  it('bastilla: cuatro franjas de 5 cm en el borde de abajo; costuras en las dos caras', () => {
    const sin = piezasCuerpo(escenaDePrueba().cuerpo);
    const con = piezasCuerpo(escenaDePrueba({ bastillaEnfundar: true }).cuerpo);
    expect(con.length - sin.length).toBe(4);
    expect(maxY(con.at(-1)!.geometria)).toBeCloseTo(5, 5);
    expect(sin.filter((p) => p.material === 'lonaOscura')).toHaveLength(2);
  });
});
