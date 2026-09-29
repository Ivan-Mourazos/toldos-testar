import * as THREE from 'three';

// Materiales del render: lona de PVC (tejido con algo de brillo), chapa galvanizada, latón de
// los ollaos, goma blanca y herrajes. Las texturas se pintan en un canvas; en las pruebas (sin
// DOM) se piden sin texturas.

export type ClaveMaterial = 'lona' | 'lonaOscura' | 'chapa' | 'laton' | 'hueco' | 'goma' | 'oscuro' | 'malla' | 'cincha' | 'herraje';
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

/** Malla de la ventana: hilos opacos y huecos transparentes, cada 1,5 cm. */
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
  t?.repeat.set(1 / 1.5, 1 / 1.5);
  return t;
}

export function crearMateriales(color: string, { texturas }: { texturas: boolean }): Materiales {
  const tejido = texturas ? texturaTejido() : null;
  const rejilla = texturas ? texturaRejilla() : null;
  const lona = (tono: THREE.Color) => new THREE.MeshPhysicalMaterial({
    color: tono, roughness: 0.62, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.55,
    side: THREE.DoubleSide, bumpMap: tejido, bumpScale: 0.15,
  });
  return {
    lona: lona(new THREE.Color(color)),
    lonaOscura: lona(new THREE.Color(color).multiplyScalar(0.8)),
    chapa: new THREE.MeshStandardMaterial({ color: '#b9bfc4', metalness: 0.85, roughness: 0.38 }),
    laton: new THREE.MeshStandardMaterial({ color: '#c8a24a', metalness: 1, roughness: 0.28 }),
    hueco: new THREE.MeshBasicMaterial({ color: '#1b1b1b' }),
    goma: new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.7 }),
    oscuro: new THREE.MeshStandardMaterial({ color: '#202225', roughness: 0.8, side: THREE.DoubleSide }),
    malla: new THREE.MeshStandardMaterial({
      color: '#2a2c2e', roughness: 0.9, side: THREE.DoubleSide,
      transparent: true, alphaMap: rejilla, opacity: rejilla ? 1 : 0.55,
    }),
    cincha: new THREE.MeshStandardMaterial({ color: '#f4f4f1', roughness: 0.85, side: THREE.DoubleSide }),
    herraje: new THREE.MeshStandardMaterial({ color: '#d4d7da', metalness: 0.9, roughness: 0.3 }),
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
