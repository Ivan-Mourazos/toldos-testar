import * as THREE from 'three';
import type { EscenaRemolque, Vec3, Vista } from '../../../remolques/escena/tipos.ts';
import { aMundo } from './camaras';

/** `textoDebajo`: el número va por debajo de la línea (ver CotaEscena). */
export interface LineaCota { x1: number; y1: number; x2: number; y2: number; texto: string; tx: number; ty: number; textoDebajo?: boolean }
export interface MarcaCota { x: number; y: number; texto: string; hacia: 'arriba' | 'abajo' }
export interface CotasPantalla { lineas: LineaCota[]; marcas: MarcaCota[] }
export interface RotuloPantalla { x: number; y: number; texto: string; alinear: 'start' | 'middle' | 'end' }

/** Punto de la escena en píxeles del lienzo (origen arriba a la izquierda), por el mismo espejo que las mallas. */
export function aPantalla(p: Vec3, camara: THREE.Camera, ancho: number, alto: number) {
  const v = aMundo(p).project(camara);
  return { x: ((v.x + 1) / 2) * ancho, y: ((1 - v.y) / 2) * alto };
}

export function cotasVisibles(escena: EscenaRemolque, vista: Vista, camara: THREE.Camera, ancho: number, alto: number): CotasPantalla {
  camara.updateMatrixWorld();
  const lineas = escena.cotas.filter((c) => c.vistas.includes(vista)).map((c) => {
    const a = aPantalla(c.desde, camara, ancho, alto);
    const b = aPantalla(c.hasta, camara, ancho, alto);
    return {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y, texto: c.texto, tx: (a.x + b.x) / 2, ty: (a.y + b.y) / 2,
      ...(c.textoDebajo ? { textoDebajo: true } : {}),
    };
  });
  const marcas = escena.etiquetas.filter((e) => e.vistas.includes(vista))
    .map((e) => ({ ...aPantalla(e.punto, camara, ancho, alto), texto: e.texto, hacia: e.hacia }));
  return { lineas, marcas };
}

/** DELANTE y DETRÁS de la vista, en píxeles del lienzo. */
export function rotulosVisibles(escena: EscenaRemolque, vista: Vista, camara: THREE.Camera, ancho: number, alto: number): RotuloPantalla[] {
  camara.updateMatrixWorld();
  return escena.rotulos.filter((r) => r.vistas.includes(vista))
    .map((r) => ({ ...aPantalla(r.punto, camara, ancho, alto), texto: r.texto, alinear: r.alinear }));
}
