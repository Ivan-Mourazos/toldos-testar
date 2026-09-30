import * as THREE from 'three';
import { RADIO_LLANTA } from '../../../remolques/escena/constantes.ts';
import type { ChasisEscena, RuedaEscena, TuboEscena, Vec3 } from '../../../remolques/escena/tipos.ts';
import { v3, type Pieza } from './piezas';

// Remolque genérico bajo el cajón, para que se vea dónde está delante y detrás: lanza en V con el
// enganche de bola y la rueda jockey, eje con dos ruedas (neumático y llanta galvanizada) y sus
// guardabarros, y dos pilotos rojos con su parte ámbar en la cara de atrás (como en IMG_3930).

const EJE_Z = new THREE.Vector3(0, 0, 1);
const EJE_Y = new THREE.Vector3(0, 1, 0);

/** Tubo cuadrado de `seccion` de `desde` a `hasta`. */
function barra({ desde, hasta }: TuboEscena, seccion: number): THREE.BufferGeometry {
  const a = v3(desde);
  const d = v3(hasta).sub(a);
  const largo = d.length();
  const geo = new THREE.BoxGeometry(seccion, seccion, largo);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(EJE_Z, d.normalize()));
  return geo.translate(...a.add(v3(hasta)).multiplyScalar(0.5).toArray());
}

/** Tubo redondo de `desde` a `hasta`. */
function cilindro({ desde, hasta }: TuboEscena, radio: number): THREE.BufferGeometry {
  const a = v3(desde);
  const d = v3(hasta).sub(a);
  const geo = new THREE.CylinderGeometry(radio, radio, d.length(), 16);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(EJE_Y, d.clone().normalize()));
  return geo.translate(...a.add(v3(hasta)).multiplyScalar(0.5).toArray());
}

/** Disco de `radio` y `ancho` con el eje a lo ancho del remolque (x), centrado en `centro`. */
const disco = (centro: Vec3, radio: number, ancho: number, lados = 32) =>
  new THREE.CylinderGeometry(radio, radio, ancho, lados).rotateZ(Math.PI / 2).translate(...centro);

function rueda(r: RuedaEscena, radioLlanta: number): Pieza[] {
  return [
    { geometria: disco(r.centro, r.radio, r.ancho), material: 'neumatico' },
    // La llanta asoma un poco por las dos caras del neumático, y el buje algo más.
    { geometria: disco(r.centro, radioLlanta, r.ancho + 0.6), material: 'chapa' },
    { geometria: disco(r.centro, radioLlanta * 0.3, r.ancho + 1.6, 16), material: 'chapa' },
  ];
}

/** Chapa curvada por encima de la rueda, de atrás adelante, abierta por abajo. */
function guardabarros(g: RuedaEscena): THREE.BufferGeometry {
  // En el cilindro de three.js el ángulo va de +z hacia +x; al girarlo al eje x, ese +x pasa a ser +y.
  return new THREE.CylinderGeometry(g.radio, g.radio, g.ancho, 32, 1, true, 0.1 * Math.PI, 0.8 * Math.PI)
    .rotateZ(Math.PI / 2).translate(...g.centro);
}

export function piezasChasis(ch: ChasisEscena): Pieza[] {
  const piezas: Pieza[] = [];
  const poner = (geometria: THREE.BufferGeometry, material: Pieza['material']) => piezas.push({ geometria, material });

  ch.lanza.forEach((tubo) => poner(barra(tubo, ch.seccionLanza), 'chapa'));
  poner(barra(ch.eje, ch.seccionLanza * 0.8), 'chapa');

  // Cabeza del enganche: caja con el morro redondo sobre la bola, y la palanca encima.
  const { cabeza, bola, radioBola } = ch.enganche;
  const [cx, cy, cz] = cabeza.centro;
  const morro = cabeza.ancho / 2;
  const largoCaja = cabeza.largo - morro;
  poner(new THREE.BoxGeometry(cabeza.ancho, cabeza.alto, largoCaja).translate(cx, cy, cz - cabeza.largo / 2 + largoCaja / 2), 'chapa');
  poner(new THREE.CylinderGeometry(morro, morro, cabeza.alto, 24).translate(cx, cy, cz + cabeza.largo / 2 - morro), 'chapa');
  poner(new THREE.BoxGeometry(2, 1.5, cabeza.largo * 0.6).translate(cx, cy + cabeza.alto / 2 + 0.75, cz - 2), 'oscuro');
  poner(new THREE.SphereGeometry(radioBola, 16, 12).translate(...bola), 'oscuro');

  // Rueda jockey: tubo vertical con la rueda pequeña en el suelo.
  const { rueda: jockey, tubo } = ch.ruedaJockey;
  poner(cilindro(tubo, 2.4), 'chapa');
  poner(disco(jockey.centro, jockey.radio, jockey.ancho), 'neumatico');
  poner(disco(jockey.centro, jockey.radio * 0.5, jockey.ancho + 0.6), 'chapa');

  ch.ruedas.forEach((r) => rueda(r, RADIO_LLANTA).forEach((p) => piezas.push(p)));
  ch.guardabarros.forEach((g) => poner(guardabarros(g), 'guardabarros'));

  // Pilotos: la parte roja hacia dentro y la ámbar hacia la esquina, como los de las fotos.
  for (const p of ch.pilotos) {
    const [x, y, z] = p.centro;
    const fuera = Math.sign(x) || 1;
    const ambar = p.ancho * 0.3;
    const rojo = p.ancho - ambar;
    poner(new THREE.BoxGeometry(rojo, p.alto, p.fondo).translate(x - fuera * (ambar / 2), y, z), 'piloto');
    poner(new THREE.BoxGeometry(ambar, p.alto, p.fondo).translate(x + fuera * (rojo / 2), y, z), 'ambar');
  }
  return piezas;
}
