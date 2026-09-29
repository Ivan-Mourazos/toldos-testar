import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { emptyBaqueton } from '../../../remolques/entradas-vacias.ts';
import { calcBaqueton } from '../../../remolques/calc/baqueton.ts';
import { DEFAULT_PARAMS } from '../../../remolques/calc/params.ts';
import { construirEscena } from '../../../remolques/escena/index.ts';
import { escenaDePrueba } from './casos-prueba';
import { geometriaContorno } from './cuerpo';
import { construirMallas, liberarGrupo } from './mallas';
import { crearMateriales } from './materiales';

const mallasCon = (grupo: THREE.Group, material: THREE.Material) => {
  const lista: THREE.Mesh[] = [];
  grupo.traverse((o) => { if (o instanceof THREE.Mesh && o.material === material) lista.push(o); });
  return lista;
};

describe('mallas del render', () => {
  it('el contorno de la lona ocupa la lona hecha, con arrugas de pocos milímetros', () => {
    const escena = escenaDePrueba();
    if (escena.cuerpo.tipo !== 'lona') throw new Error('no es lona');
    const geo = geometriaContorno(escena.cuerpo);
    geo.computeBoundingBox();
    const caja = geo.boundingBox!;
    expect(caja.min.x).toBeCloseTo(-100.5, 0);
    expect(caja.max.x).toBeCloseTo(100.5, 0);
    expect(caja.min.y).toBeCloseTo(0, 0);
    expect(caja.max.y).toBeCloseTo(100, 0);
    expect(caja.min.z).toBeCloseTo(0, 5);
    expect(caja.max.z).toBeCloseTo(301, 5);
  });

  it('un aro de latón por ollao, un gancho por gancho y un tubo de goma por lado', () => {
    const escena = escenaDePrueba();
    const materiales = crearMateriales(escena.color, { texturas: false });
    const grupo = construirMallas(escena, materiales);
    const [ollaos] = mallasCon(grupo, materiales.laton) as THREE.InstancedMesh[];
    expect(ollaos.count).toBe(escena.ollaos.length);
    const [ganchos] = mallasCon(grupo, materiales.herraje) as THREE.InstancedMesh[];
    expect(ganchos.count).toBe(escena.ganchos.length);
    expect(mallasCon(grupo, materiales.goma)).toHaveLength(escena.gomas.length);
    expect(mallasCon(grupo, materiales.chapa).length).toBeGreaterThanOrEqual(2);
    liberarGrupo(grupo);
  });

  it('el baquetón es una cubierta y cuatro faldones', () => {
    const input = { ...emptyBaqueton(), largo: 181, ancho: 121, baqueton: 22, modoOllaos: 'REPARTIDOS' as const, material: 'PVC ROJO' };
    const escena = construirEscena({ tipo: 'baqueton', input, res: calcBaqueton(input, DEFAULT_PARAMS) }, DEFAULT_PARAMS)!;
    const materiales = crearMateriales(escena.color, { texturas: false });
    expect(mallasCon(construirMallas(escena, materiales), materiales.lona)).toHaveLength(5);
  });
});
