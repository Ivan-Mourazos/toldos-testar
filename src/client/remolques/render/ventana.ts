import * as THREE from 'three';
import type { VentanaEscena } from '../../../remolques/escena/tipos.ts';
import { escalarUV, plano, type Pieza } from './piezas';

// Ventana de malla con borde negro y, encima, la persiana de lona enrollada y sujeta con dos
// cintas (fotos IMG_3931 e IMG_3932).
const MARCO = 2;
const RADIO_PERSIANA = 1.8;
const ANCHO_CINTA = 2.5;
const HOLGURA_CINTA = 0.15;

export function piezasVentana(v: VentanaEscena): Pieza[] {
  const [cx, cy, z] = v.centro;
  const fuera = z + 0.3;
  const w = v.ancho / 2;
  const h = v.alto / 2;
  const exterior = new THREE.Shape([
    new THREE.Vector2(-w - MARCO, -h - MARCO), new THREE.Vector2(w + MARCO, -h - MARCO),
    new THREE.Vector2(w + MARCO, h + MARCO), new THREE.Vector2(-w - MARCO, h + MARCO),
  ]);
  exterior.holes.push(new THREE.Path([
    new THREE.Vector2(-w, -h), new THREE.Vector2(-w, h), new THREE.Vector2(w, h), new THREE.Vector2(w, -h),
  ]));
  const yPersiana = cy + h + RADIO_PERSIANA;
  const zPersiana = fuera + RADIO_PERSIANA + 0.2;
  // Cada cinta es una banda que rodea la persiana enrollada, un pelo más ancha que el rollo.
  const cinta = (x: number) => new THREE.CylinderGeometry(RADIO_PERSIANA + HOLGURA_CINTA, RADIO_PERSIANA + HOLGURA_CINTA, ANCHO_CINTA, 24, 1, true)
    .rotateZ(Math.PI / 2).translate(cx + x, yPersiana, zPersiana);
  const largoPersiana = v.ancho + 2 * MARCO;
  return [
    { geometria: new THREE.ShapeGeometry(exterior).translate(cx, cy, fuera), material: 'oscuro' },
    { geometria: plano(v.ancho, v.alto).translate(cx, cy, fuera - 0.1), material: 'malla' },
    {
      // UV en centímetros: el contorno del rollo por su largo, para no estirar la trama.
      geometria: escalarUV(new THREE.CylinderGeometry(RADIO_PERSIANA, RADIO_PERSIANA, largoPersiana, 24), 2 * Math.PI * RADIO_PERSIANA, largoPersiana)
        .rotateZ(Math.PI / 2).translate(cx, yPersiana, zPersiana),
      material: 'lona',
    },
    { geometria: cinta(-v.ancho / 3), material: 'oscuro' },
    { geometria: cinta(v.ancho / 3), material: 'oscuro' },
  ];
}
