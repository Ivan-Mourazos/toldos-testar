import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { crearCamara } from './camaras';
import { escenaDePrueba } from './casos-prueba';
import { COLOR_ARISTA, construirMallas, liberarGrupo } from './mallas';
import { crearMaterialesImpresion, liberarMateriales } from './materiales';
import { cotasVisibles } from './proyeccion';

// La hoja de taller (fase 4) se imprime en blanco y negro: mismas mallas que la pantalla, con
// materiales grises, aristas oscuras y una segunda 3/4 desde detrás.

const gris = (m: THREE.Material) => (m as THREE.MeshStandardMaterial).color;

describe('materiales de la hoja impresa', () => {
  it('todos son grises: la impresora del taller es de blanco y negro', () => {
    const materiales = crearMaterialesImpresion();
    for (const [clave, material] of Object.entries(materiales)) {
      const c = gris(material);
      expect(c.r, clave).toBeCloseTo(c.g, 5);
      expect(c.g, clave).toBeCloseTo(c.b, 5);
    }
    liberarMateriales(materiales);
  });

  it('lona gris claro, cajón en otro gris y goma y ollaos en negro', () => {
    const m = crearMaterialesImpresion();
    expect(gris(m.lona).r).toBeGreaterThan(0.7);
    expect(gris(m.chapa).r).toBeLessThan(gris(m.lona).r - 0.2);
    expect(gris(m.goma).r).toBeLessThan(0.05);
    expect(gris(m.laton).r).toBeLessThan(0.05);
    liberarMateriales(m);
  });
});

describe('aristas', () => {
  const lineas = (g: THREE.Group) => {
    const lista: THREE.LineSegments[] = [];
    g.traverse((o) => { if (o instanceof THREE.LineSegments) lista.push(o); });
    return lista;
  };

  it('en la hoja, la lona y el cajón llevan su contorno en línea oscura; en pantalla, no', () => {
    const escena = escenaDePrueba();
    const m = crearMaterialesImpresion();
    const sin = construirMallas(escena, m);
    const con = construirMallas(escena, m, { aristas: true });
    expect(lineas(sin)).toHaveLength(0);
    expect(lineas(con).length).toBeGreaterThan(3);
    expect(lineas(con).every((l) => (l.material as THREE.LineBasicMaterial).color.getHexString() === COLOR_ARISTA.slice(1))).toBe(true);
    liberarGrupo(sin);
    liberarGrupo(con);
    liberarMateriales(m);
  });
});

describe('3/4 desde detrás', () => {
  const escena = escenaDePrueba();
  const esquinas = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(
    i & 1 ? escena.caja.max[0] : escena.caja.min[0],
    i & 2 ? escena.caja.max[1] : escena.caja.min[1],
    i & 4 ? escena.caja.max[2] : escena.caja.min[2],
  ).multiply(new THREE.Vector3(-1, 1, 1)));

  it('enseña el remolque entero, con perspectiva', () => {
    const camara = crearCamara('tres-cuartos-detras', escena.caja, 104 / 56);
    expect(camara).toBeInstanceOf(THREE.PerspectiveCamera);
    for (const p of esquinas) {
      const ndc = p.clone().project(camara);
      expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1);
    }
  });

  it('mira la trasera desde el lado izquierdo del remolque (la otra 3/4 mira el frente desde el derecho)', () => {
    const detras = crearCamara('tres-cuartos-detras', escena.caja, 1.6);
    const delante = crearCamara('tres-cuartos', escena.caja, 1.6);
    expect(detras.position.z).toBeLessThan(escena.caja.min[2]);
    expect(delante.position.z).toBeGreaterThan(escena.caja.max[2]);
    // Con el espejo del render (x del mundo = −x de la escena), el lado izquierdo queda en x > 0.
    expect(detras.position.x).toBeGreaterThan(0);
    expect(delante.position.x).toBeLessThan(0);
  });
});

describe('hacia dónde va el número de cada ollao y gancho', () => {
  it('los ollaos, hacia arriba (sobre la lona); los ganchos del pedido, hacia abajo (sobre el cajón)', () => {
    const escena = escenaDePrueba({
      modoOllaos: 'SEGUN GANCHOS',
      ganchos: { laterales: [5, 150, 295], atras: [10, 100, 190], delante: [10, 100, 190] },
    });
    const marcas = cotasVisibles(escena, 'delante', crearCamara('delante', escena.caja, 1.6), 800, 500).marcas;
    expect(marcas.find((m) => m.texto === '2,5')?.hacia).toBe('arriba');
    expect(marcas.find((m) => m.texto === '10,5')?.hacia).toBe('abajo');
    expect(escena.etiquetas.every((e) => e.hacia === 'arriba' || e.hacia === 'abajo')).toBe(true);
  });
});
