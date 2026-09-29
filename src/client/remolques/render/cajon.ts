import * as THREE from 'three';
import type { Cajon } from '../../../remolques/escena/tipos.ts';
import type { Pieza } from './piezas';

/** Caja de chapa de y = −alto a y = 0, más ancha delante o detrás si el remolque va sesgado. */
export function geometriaCajon(c: Cajon): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const t = pos.getZ(i) + 0.5;
    const semi = (c.anchoAtras + (c.anchoDelante - c.anchoAtras) * t) / 2;
    pos.setXYZ(i, pos.getX(i) * 2 * semi, (pos.getY(i) - 0.5) * c.alto, c.zDesde + c.largo * t);
  }
  geo.computeVertexNormals();
  return geo;
}

const ensanchar = (c: Cajon, cm: number, alto: number): Cajon => ({
  ...c, alto,
  anchoDelante: c.anchoDelante + 2 * cm, anchoAtras: c.anchoAtras + 2 * cm,
  largo: c.largo + 2 * cm, zDesde: c.zDesde - cm, zHasta: c.zHasta + cm,
});

/** El cajón, su nervio a media altura y, en la lona, el perfil de arriba. En el baquetón el
 *  perfil de arriba asomaría a través del faldón, que va medio centímetro por fuera. */
export function piezasCajon(c: Cajon, conBorde: boolean): Pieza[] {
  const piezas: Pieza[] = [
    { geometria: geometriaCajon(c), material: 'chapa' },
    { geometria: geometriaCajon(ensanchar(c, 0.6, 3)).translate(0, -c.alto / 2 + 1.5, 0), material: 'chapa' },
  ];
  if (conBorde) piezas.push({ geometria: geometriaCajon(ensanchar(c, 1.2, 5)), material: 'chapa' });
  // La cubierta del baquetón es plana en y = 0, igual que la cara de arriba del cajón: con las
  // dos en el mismo plano el render parpadea (z-fighting). Se baja el cajón 3 mm.
  else piezas.forEach((p) => p.geometria.translate(0, -0.3, 0));
  return piezas;
}
