import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { escenaDePrueba } from './casos-prueba';
import { piezasCierres } from './cierres';
import { piezasCuerpo } from './cuerpo';
import { construirMallas } from './mallas';
import { crearMateriales } from './materiales';
import { piezasVentana } from './ventana';
import type { CierreEsquina, EscenaRemolque } from '../../../remolques/escena/tipos.ts';

const cierre = (recogida: string) =>
  escenaDePrueba({ recogeDelante: recogida }).cierres.filter((c) => c.esquina === 'delante-derecha');
const maxY = (geo: THREE.BufferGeometry) => { geo.computeBoundingBox(); return geo.boundingBox!.max.y; };

describe('cierres en 3D', () => {
  it('goma en pared baja: la oreja, un ollao en su borde por par, un gancho cercano por par y una goma que dobla la esquina', () => {
    const c = escenaDePrueba({ recogeDelante: 'GOMA', altoDelante: 90 }).cierres.find((x) => x.esquina === 'delante-derecha')!;
    const r = piezasCierres([c]);
    expect(r.piezas).toHaveLength(1);
    expect(r.ollaos).toHaveLength(3);
    expect(r.ganchos).toHaveLength(3);
    expect(r.gomas).toHaveLength(3);
    r.ollaos.forEach((o) => expect(o.normal).toEqual(c.normal));
    r.ganchos.forEach((g, i) => {
      expect(g.normal).toEqual([0, 0, 1]);
      expect(g.punto).toEqual(c.gomaDiagonal[i].gancho);
    });
    r.gomas.forEach((tramo, i) => {
      expect(tramo).toHaveLength(3);
      // Del ollao a la arista de la esquina y de ahí al gancho, algo por fuera de las caras:
      // nunca atraviesa la lona.
      const { ollao, esquina, gancho } = c.gomaDiagonal[i];
      expect(tramo[0].x).toBeGreaterThan(ollao[0]);
      expect(tramo[0].y).toBeCloseTo(ollao[1], 5);
      expect(tramo[1].x).toBeGreaterThan(esquina[0]);
      expect(tramo[1].z).toBeGreaterThan(esquina[2]);
      expect(tramo[1].y).toBeCloseTo(esquina[1], 5);
      expect(tramo[2].z).toBeGreaterThan(gancho[2]);
      expect(tramo[2].y).toBeCloseTo(gancho[1], 5);
    });
  });

  it('goma en pared alta: tres gomas que se juntan en un solo gancho, el del centro de la cara', () => {
    const c = escenaDePrueba({ recogeDelante: 'GOMA', altoDelante: 120 }).cierres.find((x) => x.esquina === 'delante-derecha')!;
    const r = piezasCierres([c]);
    expect(r.ollaos).toHaveLength(3);
    expect(r.gomas).toHaveLength(3);
    expect(r.ganchos).toEqual([{ punto: [0, -8, c.gomaDiagonal[0].gancho[2]], normal: [0, 0, 1] }]);
    r.gomas.forEach((tramo) => expect(tramo[2].x).toBeCloseTo(0, 5));
  });

  it('gancho del centro: las dos esquinas de una cara lo comparten y no se repite', () => {
    const escena = escenaDePrueba({ recogeDelante: 'GOMA', recogeAtras: 'GOMA', altoDelante: 120 });
    const r = piezasCierres(escena.cierres);
    expect(r.gomas).toHaveLength(12);
    expect(r.ganchos.map((g) => g.punto)).toEqual([[0, -8, escena.cajon.zHasta], [0, -8, escena.cajon.zDesde]]);
  });

  it('gancho del centro: si ya hay un gancho de la goma perimetral a menos de 3 cm, no se añade otro', () => {
    const escena = escenaDePrueba({ recogeDelante: 'GOMA', recogeAtras: 'GOMA', altoDelante: 120 });
    const z = escena.cajon.zHasta;
    const cerca = piezasCierres(escena.cierres, [{ punto: [2, -8, z], normal: [0, 0, 1] }]);
    expect(cerca.ganchos.map((g) => g.punto)).toEqual([[0, -8, escena.cajon.zDesde]]);
    const lejos = piezasCierres(escena.cierres, [{ punto: [4, -8, z], normal: [0, 0, 1] }]);
    expect(lejos.ganchos).toHaveLength(2);
  });

  it('goma en una esquina de atrás: el gancho mira hacia atrás', () => {
    const c = escenaDePrueba({ recogeAtras: 'GOMA', altoDelante: 90 }).cierres.find((x) => x.esquina === 'atras-derecha')!;
    const r = piezasCierres([c]);
    expect(r.ganchos).toHaveLength(3);
    r.ganchos.forEach((g) => expect(g.normal).toEqual([0, 0, -1]));
    r.gomas.forEach((tramo, i) => {
      expect(tramo[1].z).toBeLessThan(c.gomaDiagonal[i].esquina[2]);
      expect(tramo[2].z).toBeLessThan(c.gomaDiagonal[i].gancho[2]);
    });
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
    expect(piezasCierres(cierre('NO'))).toEqual({ piezas: [], ollaos: [], ganchos: [], gomas: [] });
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

  it('ventana: cada cinta rodea el rollo de la persiana y la trama de la lona no se estira', () => {
    const escena = escenaDePrueba({ ventana: true, ventanaAncho: 50, ventanaAlto: 35 });
    const piezas = piezasVentana(escena.ventana!);
    const caja = (geo: THREE.BufferGeometry) => { geo.computeBoundingBox(); return geo.boundingBox!; };
    const rollo = caja(piezas[2].geometria);
    for (const cinta of piezas.slice(3)) {
      const c = caja(cinta.geometria);
      // Envuelve el rollo en y y en z, y solo ocupa su ancho de cinta en x.
      expect(c.max.y).toBeGreaterThan(rollo.max.y);
      expect(c.min.y).toBeLessThan(rollo.min.y);
      expect(c.max.z).toBeGreaterThan(rollo.max.z);
      expect(c.min.z).toBeLessThan(rollo.min.z);
      expect(c.max.x - c.min.x).toBeCloseTo(2.5, 5);
    }
    // UV en cm: el contorno del rollo (2πr) por su largo (ancho + marcos).
    const uv = piezas[2].geometria.getAttribute('uv');
    let maxU = 0;
    let maxV = 0;
    for (let i = 0; i < uv.count; i += 1) { maxU = Math.max(maxU, uv.getX(i)); maxV = Math.max(maxV, uv.getY(i)); }
    expect(maxU).toBeCloseTo(2 * Math.PI * 1.8, 5);
    expect(maxV).toBeCloseTo(50 + 2 * 2, 5);
  });

  it('bastilla: cuatro franjas de 5 cm en el borde de abajo; costuras en las dos caras', () => {
    const sin = piezasCuerpo(escenaDePrueba().cuerpo);
    const con = piezasCuerpo(escenaDePrueba({ bastillaEnfundar: true }).cuerpo);
    expect(con.length - sin.length).toBe(4);
    expect(maxY(con.at(-1)!.geometria)).toBeCloseTo(5, 5);
    expect(sin.filter((p) => p.material === 'lonaOscura')).toHaveLength(2);
  });
});

const centro = (geo: THREE.BufferGeometry) => {
  geo.computeBoundingBox();
  return geo.boundingBox!.getCenter(new THREE.Vector3());
};
const semiancho = (escena: EscenaRemolque, z: number) => {
  const c = escena.cuerpo;
  if (c.tipo !== 'lona') throw new Error('no es lona');
  const t = z / c.largo;
  const a = c.perfilAtras.at(-1)![0];
  const d = c.perfilDelante.at(-1)![0];
  return a + (d - a) * t;
};
/** Distancia de un punto a la esquina a lo largo del lateral (`haciaLateral`). */
const alLargo = (c: CierreEsquina, p: THREE.Vector3) =>
  p.clone().sub(new THREE.Vector3(...c.base)).dot(new THREE.Vector3(...c.haciaLateral));
const esquinaDerecha = (recogida: string) =>
  escenaDePrueba({ recogeDelante: recogida }).cierres.find((c) => c.esquina === 'delante-derecha')!;

describe('colocación de los cierres sobre la lona', () => {
  for (const [recogida, alto] of [['GOMA', 90], ['GOMA', 120], ['PUENTES HIJOS DE PEDRO LOPEZ', 100]] as const) {
    it(`${recogida} (pared de ${alto}): en las cuatro esquinas todo queda en el lateral, dentro de la oreja`, () => {
      const escena = escenaDePrueba({ recogeDelante: recogida, recogeAtras: recogida, altoDelante: alto });
      expect(escena.cierres).toHaveLength(4);
      for (const c of escena.cierres) {
        const r = piezasCierres([c]);
        const lado = c.normal[0];
        const enFlap = (p: THREE.Vector3) => {
          expect(lado * p.x).toBeGreaterThanOrEqual(semiancho(escena, p.z) - 1e-6);
          expect(lado * p.x).toBeLessThanOrEqual(semiancho(escena, p.z) + 2);
          const a = alLargo(c, p);
          expect(a).toBeGreaterThanOrEqual(-1e-6);
          expect(a).toBeLessThanOrEqual(c.oreja + 1e-6);
        };
        r.piezas.forEach((p) => enFlap(centro(p.geometria)));
        // Todos los ollaos del cierre van en la oreja: ya no hay ollaos sueltos en el lateral.
        r.ollaos.forEach((o) => enFlap(new THREE.Vector3(...o.punto)));
        // Los ganchos de la goma, en la cara del paño del cajón, entre la esquina y el centro.
        const zCara = c.esquina.startsWith('delante') ? escena.cajon.zHasta : escena.cajon.zDesde;
        r.ganchos.forEach((g) => {
          expect(g.punto[2]).toBe(zCara);
          expect(lado * g.punto[0]).toBeGreaterThanOrEqual(0);
          expect(lado * g.punto[0]).toBeLessThan(lado * c.base[0]);
        });
        if (recogida === 'GOMA') expect(r.ganchos).toHaveLength(alto >= 100 ? 1 : 3);
        // La goma va por fuera: ningún punto de sus tramos cae dentro de la lona ni del cajón.
        const largo = escena.cuerpo.tipo === 'lona' ? escena.cuerpo.largo : 0;
        for (const tramo of r.gomas) {
          for (let i = 1; i < tramo.length; i += 1) {
            for (let t = 0; t <= 1; t += 0.05) {
              const p = tramo[i - 1].clone().lerp(tramo[i], t);
              const dentro = Math.abs(p.x) < semiancho(escena, Math.min(Math.max(p.z, 0), largo)) && p.z > 0 && p.z < largo && p.y < c.alto;
              expect(dentro).toBe(false);
            }
          }
        }
      }
    });
  }

  it('con una solapa estrecha los puentes y la cincha siguen sobre la solapa', () => {
    const c: CierreEsquina = { ...esquinaDerecha('PUENTES HIJOS DE PEDRO LOPEZ'), oreja: 3 };
    const r = piezasCierres([c]);
    expect(r.piezas.length).toBeGreaterThan(1);
    for (const p of r.piezas) {
      const a = alLargo(c, centro(p.geometria));
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(3);
    }
  });

  it('sin oreja no se dibuja nada que dependa de ella', () => {
    for (const recogida of ['GOMA', 'VELCRO', 'PUENTES HIJOS DE PEDRO LOPEZ']) {
      const r = piezasCierres([{ ...esquinaDerecha(recogida), oreja: 0 }]);
      expect(r).toEqual({ piezas: [], ollaos: [], ganchos: [], gomas: [] });
    }
  });
});

describe('bastilla y ollaos', () => {
  const instanciada = (grupo: THREE.Group, material: THREE.Material) => {
    let inst: THREE.InstancedMesh | undefined;
    grupo.traverse((o) => { if (o instanceof THREE.InstancedMesh && o.material === material) inst = o; });
    return inst!;
  };
  /** Cuánto se separa de su ollao (hacia fuera) la instancia `i` de una malla instanciada. */
  const separacion = (inst: THREE.InstancedMesh, o: { punto: number[]; normal: number[] }, i: number) => {
    const m = new THREE.Matrix4();
    inst.getMatrixAt(i, m);
    return new THREE.Vector3().setFromMatrixPosition(m)
      .sub(new THREE.Vector3(...(o.punto as [number, number, number])))
      .dot(new THREE.Vector3(...(o.normal as [number, number, number])));
  };

  it('con bastilla los aros y los huecos quedan por fuera del dobladillo', () => {
    const escena = escenaDePrueba({ bastillaEnfundar: true });
    const franja = piezasCuerpo(escena.cuerpo).slice(-4)[0].geometria;
    franja.computeBoundingBox();
    // La franja de atrás está en z = −desfase.
    const desfase = -franja.boundingBox!.max.z;
    expect(desfase).toBeGreaterThan(0);
    const materiales = crearMateriales(escena.color, { texturas: false });
    const grupo = construirMallas(escena, materiales);
    for (const m of [materiales.laton, materiales.hueco]) {
      const inst = instanciada(grupo, m);
      escena.ollaos.forEach((o, i) => expect(separacion(inst, o, i)).toBeGreaterThan(desfase));
    }
  });

  it('sin bastilla los ollaos no se mueven', () => {
    const escena = escenaDePrueba();
    const materiales = crearMateriales(escena.color, { texturas: false });
    const grupo = construirMallas(escena, materiales);
    expect(separacion(instanciada(grupo, materiales.laton), escena.ollaos[0], 0)).toBeCloseTo(0.25, 5);
  });
});
