import * as THREE from 'three';

// Materiales del render: lona de PVC (tejido con algo de brillo), chapa galvanizada, latón de
// los ollaos, goma blanca y herrajes; y, del remolque genérico, neumáticos, pilotos rojos y ámbar. Las texturas se pintan en un canvas; en las pruebas (sin
// DOM) se piden sin texturas.

export type ClaveMaterial =
  | 'lona' | 'lonaOscura' | 'chapa' | 'laton' | 'hueco' | 'goma' | 'oscuro' | 'malla' | 'cincha' | 'herraje'
  | 'guardabarros' | 'neumatico' | 'piloto' | 'ambar';
export type Materiales = Record<ClaveMaterial, THREE.Material>;

function lienzo(lado: number, pintar: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  pintar(ctx);
  const textura = new THREE.CanvasTexture(canvas);
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  return textura;
}

/** Trama y urdimbre del tejido: las UV van en centímetros, así que se repite cada 2 cm. */
function texturaTejido() {
  const t = lienzo(64, (ctx) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 4) {
      ctx.fillStyle = i % 8 ? '#9a9a9a' : '#6a6a6a';
      ctx.fillRect(i, 0, 2, 64);
      ctx.fillRect(0, i, 64, 2);
    }
  });
  t?.repeat.set(0.5, 0.5);
  return t;
}

/**
 * Ondulaciones suaves de la lona tensada (cada 1,6 m): la lona nunca queda plana como una chapa y
 * el brillo del PVC se ve justo en esas ondas. Es un mapa de normales hecho de senos con
 * frecuencias enteras, así que se repite sin costuras. Va en la capa de barniz (clearcoat): la
 * trama del tejido sigue en el bumpMap de la base, y three.js no mezcla bumpMap y normalMap en la
 * misma capa.
 */
const PERIODO_ONDAS = 200;
const ONDAS: Array<[number, number, number, number]> = [
  // [frecuencia u, frecuencia v, amplitud, fase]
  [1, 0, 1, 0.3], [0, 1, 0.8, 1.7], [1, 1, 0.55, 2.9], [2, -1, 0.4, 0.8],
  [2, 1, 0.2, 4.1], [-1, 2, 0.18, 5.2],
];
function texturaOndas() {
  const lado = 256;
  const t = lienzo(lado, (ctx) => {
    const imagen = ctx.createImageData(lado, lado);
    for (let y = 0; y < lado; y += 1) {
      for (let x = 0; x < lado; x += 1) {
        let du = 0;
        let dv = 0;
        for (const [fu, fv, a, fase] of ONDAS) {
          const c = a * Math.cos(2 * Math.PI * (fu * x + fv * y) / lado + fase);
          du += c * fu;
          dv += c * fv;
        }
        const n = new THREE.Vector3(-du * 0.05, -dv * 0.05, 1).normalize();
        const i = (y * lado + x) * 4;
        imagen.data[i] = (n.x * 0.5 + 0.5) * 255;
        imagen.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
        imagen.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
        imagen.data[i + 3] = 255;
      }
    }
    ctx.putImageData(imagen, 0, 0);
  });
  t?.repeat.set(1 / PERIODO_ONDAS, 1 / PERIODO_ONDAS);
  return t;
}

/** Malla mosquitera de la ventana: hilos opacos y huecos transparentes de 1,5 mm. A la distancia del
 *  render los hilos no se distinguen (como en las fotos): los mipmaps los funden en una trama gris
 *  translúcida en vez de dibujar un damero que no existe. */
function texturaRejilla() {
  const t = lienzo(32, (ctx) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 32; i += 8) {
      ctx.fillRect(i, 0, 2, 32);
      ctx.fillRect(0, i, 32, 2);
    }
  });
  t?.repeat.set(1 / 0.6, 1 / 0.6);
  return t;
}

export function crearMateriales(color: string, { texturas }: { texturas: boolean }): Materiales {
  const tejido = texturas ? texturaTejido() : null;
  const rejilla = texturas ? texturaRejilla() : null;
  const ondas = texturas ? texturaOndas() : null;
  const lona = (tono: THREE.Color) => new THREE.MeshPhysicalMaterial({
    color: tono, roughness: 0.42, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.3,
    side: THREE.DoubleSide, bumpMap: tejido, bumpScale: 0.15,
    clearcoatNormalMap: ondas, clearcoatNormalScale: new THREE.Vector2(0.45, 0.45),
  });
  return {
    lona: lona(new THREE.Color(color)),
    lonaOscura: lona(new THREE.Color(color).multiplyScalar(0.8)),
    // Galvanizado: gris plata claro. Del todo metálico solo refleja la sala del entorno y salía
    // gris oscuro, no la chapa brillante de las fotos.
    chapa: new THREE.MeshStandardMaterial({ color: '#d3d8dc', metalness: 0.55, roughness: 0.34 }),
    laton: new THREE.MeshStandardMaterial({ color: '#d9b45a', metalness: 1, roughness: 0.32 }),
    hueco: new THREE.MeshBasicMaterial({ color: '#1b1b1b' }),
    goma: new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.7 }),
    oscuro: new THREE.MeshStandardMaterial({ color: '#202225', roughness: 0.8, side: THREE.DoubleSide }),
    malla: new THREE.MeshStandardMaterial({
      color: '#7d8286', roughness: 0.9, side: THREE.DoubleSide,
      transparent: true, alphaMap: rejilla, opacity: rejilla ? 1 : 0.55,
    }),
    cincha: new THREE.MeshStandardMaterial({ color: '#f4f4f1', roughness: 0.85, side: THREE.DoubleSide }),
    herraje: new THREE.MeshStandardMaterial({ color: '#d4d7da', metalness: 0.9, roughness: 0.3 }),
    // La chapa curvada del guardabarros se ve por dentro y por fuera.
    guardabarros: new THREE.MeshStandardMaterial({ color: '#d3d8dc', metalness: 0.55, roughness: 0.34, side: THREE.DoubleSide }),
    neumatico: new THREE.MeshStandardMaterial({ color: '#232426', roughness: 0.85 }),
    // Algo de luz propia: con el sol de frente o de espaldas los pilotos se siguen viendo rojos.
    piloto: new THREE.MeshStandardMaterial({ color: '#c3141b', emissive: '#5a0306', roughness: 0.25 }),
    ambar: new THREE.MeshStandardMaterial({ color: '#e8871e', emissive: '#4a2200', roughness: 0.25 }),
  };
}

/**
 * Materiales de la hoja de taller (fase 4). La impresora del taller es de blanco y negro, así que
 * el dibujo se piensa en grises: lona gris claro, cajón y chasis en otro gris, goma y ollaos en
 * negro. Mismas claves que en pantalla y sin texturas: en papel la trama del tejido solo ensucia.
 */
export function crearMaterialesImpresion(): Materiales {
  // Las caras, un pelo hacia el fondo: las aristas (líneas justo en su borde) ganan siempre la
  // pelea de profundidad y salen enteras, no a trazos.
  const mate = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, ...extra,
  });
  const doble = { side: THREE.DoubleSide };
  return {
    lona: mate('#e6e6e6', doble),
    lonaOscura: mate('#a6a6a6', doble),
    chapa: mate('#9c9c9c'),
    laton: mate('#111111'),
    hueco: new THREE.MeshBasicMaterial({ color: '#000000' }),
    goma: mate('#111111'),
    oscuro: mate('#2b2b2b', doble),
    malla: mate('#8c8c8c', { ...doble, transparent: true, opacity: 0.55 }),
    cincha: mate('#f2f2f2', doble),
    herraje: mate('#3c3c3c'),
    guardabarros: mate('#b0b0b0', doble),
    neumatico: mate('#2e2e2e'),
    piloto: mate('#707070'),
    ambar: mate('#8f8f8f'),
  };
}

export function liberarMateriales(materiales: Materiales) {
  const texturas = new Set<THREE.Texture>();
  for (const material of Object.values(materiales)) {
    for (const valor of Object.values(material)) if (valor instanceof THREE.Texture) texturas.add(valor);
    material.dispose();
  }
  texturas.forEach((t) => t.dispose());
}
