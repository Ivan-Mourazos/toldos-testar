import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { EscenaRemolque, Vec3, Vista } from '../../../remolques/escena/tipos.ts';
import { aMundo, crearCamara, encuadre, ESPEJO } from './camaras';
import { CapaCotas } from './CapaCotas';
import { construirMallas, liberarGrupo } from './mallas';
import { crearMateriales, liberarMateriales, type Materiales } from './materiales';
import { cotasVisibles, type CotasPantalla } from './proyeccion';

// Render 3D de la lona o el baquetón (fase 2b). Se carga aparte (React.lazy desde
// DibujoRemolque) para que three.js no pese en el resto de la web. Pinta a demanda: al cambiar
// la escena, la vista, el tamaño o al girar, no en bucle.

interface Motor {
  renderer: THREE.WebGLRenderer;
  escena: THREE.Scene;
  sol: THREE.DirectionalLight;
  suelo: THREE.Mesh;
  camara: THREE.Camera | null;
  controles: OrbitControls | null;
  grupo: THREE.Group | null;
  materiales: Materiales | null;
  /** Color con el que se crearon `materiales`: si no cambia, se reutilizan (y sus texturas). */
  color: string | null;
  /** La 3/4 se ha girado con el ratón: hasta volver a la vista fija, sin cotas. */
  girada: boolean;
  ancho: number;
  alto: number;
}

export interface RenderRemolqueProps {
  escena: EscenaRemolque;
  vista: Vista;
  conCotas: boolean;
  onFallo: () => void;
}

/**
 * De dónde viene el sol en cada vista, en ejes de la escena. Con un sol fijo, la cara de detrás
 * salía casi negra y la de delante lavada: cada vista fija lo pone delante de la cara que enseña,
 * alto y a la izquierda de quien mira. La 3/4, por delante a la derecha, como su cámara.
 */
const DIRECCION_SOL: Record<Vista, Vec3> = {
  'tres-cuartos': [0.6, 1.3, 0.9],
  delante: [0.4, 1, 1.2],
  detras: [-0.4, 1, -1.2],
  lateral: [1.2, 1, -0.4],
  arriba: [0.4, 1.6, 0.6],
};

/** Sol y su caja de sombras alrededor del remolque, para la vista que toca. */
function colocarSol(sol: THREE.DirectionalLight, caja: EscenaRemolque['caja'], vista: Vista) {
  const { centro, tamano } = encuadre(caja);
  const radio = tamano.length() / 2;
  sol.position.copy(centro).add(aMundo(DIRECCION_SOL[vista]).normalize().multiplyScalar(radio * 3));
  sol.target.position.copy(centro);
  const sombra = sol.shadow.camera;
  sombra.left = -radio; sombra.right = radio; sombra.top = radio; sombra.bottom = -radio;
  sombra.near = 1; sombra.far = radio * 6;
  sombra.updateProjectionMatrix();
}

export default function RenderRemolque({ escena, vista, conCotas, onFallo }: RenderRemolqueProps) {
  const lienzo = useRef<HTMLDivElement>(null);
  const motor = useRef<Motor | null>(null);
  const datos = useRef({ escena, vista, conCotas });
  const onFalloRef = useRef(onFallo);
  // Antes que los efectos de abajo: `pintar` y `colocarCamara` leen siempre las props de este render.
  useLayoutEffect(() => {
    datos.current = { escena, vista, conCotas };
    onFalloRef.current = onFallo;
  });
  const [cotas, setCotas] = useState<CotasPantalla | null>(null);
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });
  const [movida, setMovida] = useState(false);

  const pintar = useCallback(() => {
    const m = motor.current;
    if (!m?.camara) return;
    m.renderer.render(m.escena, m.camara);
    const d = datos.current;
    // Las cotas son de la vista fija: al girar, las de las caras de atrás se pintarían encima de la lona.
    const nuevas = d.conCotas && !m.girada ? cotasVisibles(d.escena, d.vista, m.camara, m.ancho, m.alto) : null;
    // Sin nada que rotular, null: al girar no se vuelve a pintar el componente en cada movimiento.
    setCotas(nuevas && (nuevas.lineas.length > 0 || nuevas.marcas.length > 0) ? nuevas : null);
  }, []);

  const colocarCamara = useCallback(() => {
    const m = motor.current;
    if (!m || m.ancho === 0 || m.alto === 0) return;
    const d = datos.current;
    m.controles?.dispose();
    m.controles = null;
    const camara = crearCamara(d.vista, d.escena.caja, m.ancho / m.alto);
    m.camara = camara;
    colocarSol(m.sol, d.escena.caja, d.vista);
    if (d.vista === 'tres-cuartos') {
      const { centro, tamano: t } = encuadre(d.escena.caja);
      const controles = new OrbitControls(camara, m.renderer.domElement);
      controles.target.copy(centro);
      controles.enablePan = false;
      // Girar alrededor, sin meterse bajo el suelo ni dentro de la caja de las cotas, y sin
      // alejarse más allá del plano lejano de la cámara.
      controles.minPolarAngle = 0.15;
      controles.maxPolarAngle = Math.PI / 2 - 0.05;
      const distancia = camara.position.distanceTo(centro);
      controles.minDistance = Math.min(t.length() / 2, distancia);
      controles.maxDistance = distancia * 3;
      controles.addEventListener('change', pintar);
      controles.addEventListener('start', () => {
        m.girada = true;
        setMovida(true);
      });
      controles.update();
      m.controles = controles;
    }
    m.girada = false;
    setMovida(false);
    pintar();
  }, [pintar]);

  useEffect(() => {
    const caja = lienzo.current;
    if (!caja) return undefined;
    let renderer: THREE.WebGLRenderer;
    try {
      // preserveDrawingBuffer: la e2e lee los píxeles y la fase 4 capturará cada vista para el PDF.
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      onFalloRef.current();
      return undefined;
    }
    // Si el navegador tira el contexto (driver, demasiados lienzos), se vuelve al dibujo técnico.
    const alPerderContexto = () => onFalloRef.current();
    renderer.domElement.addEventListener('webglcontextlost', alPerderContexto);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute('role', 'img');
    caja.appendChild(renderer.domElement);

    const escena3D = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const sala = new RoomEnvironment();
    const entorno = pmrem.fromScene(sala, 0.04);
    sala.dispose();
    pmrem.dispose();
    escena3D.environment = entorno.texture;
    // La sala tiene un panel de luz justo detrás de la cámara de delante: a plena intensidad y sin
    // girar, la lona de frente salía rosa y la de detrás, granate. Girada 45° y más suave, las
    // cinco vistas enseñan el color de la lona.
    escena3D.environmentIntensity = 0.6;
    escena3D.environmentRotation.y = Math.PI / 4;
    escena3D.add(new THREE.HemisphereLight(0xffffff, 0x9aa0a6, 0.8));
    const sol = new THREE.DirectionalLight(0xffffff, 2.2);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    sol.shadow.bias = -0.0004;
    escena3D.add(sol, sol.target);
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.16 }));
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    escena3D.add(suelo);
    motor.current = {
      renderer, escena: escena3D, sol, suelo, camara: null, controles: null, grupo: null, materiales: null, color: null, girada: false, ancho: 0, alto: 0,
    };

    const observador = new ResizeObserver(([entrada]) => {
      const m = motor.current;
      const { width, height } = entrada.contentRect;
      if (!m || width === 0 || height === 0) return;
      m.ancho = width;
      m.alto = height;
      renderer.setSize(width, height, false);
      setTamano({ ancho: width, alto: height });
      // Aunque llegue antes que las mallas, solo pinta el suelo; el efecto de la escena vuelve a colocarla.
      colocarCamara();
    });
    observador.observe(caja);

    return () => {
      observador.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', alPerderContexto);
      const m = motor.current;
      m?.controles?.dispose();
      if (m?.grupo) liberarGrupo(m.grupo);
      if (m?.materiales) liberarMateriales(m.materiales);
      entorno.dispose();
      suelo.geometry.dispose();
      (suelo.material as THREE.Material).dispose();
      renderer.dispose();
      // Suelta ya el contexto WebGL: el navegador admite pocos a la vez y, en desarrollo, StrictMode
      // monta, desmonta y vuelve a montar.
      renderer.forceContextLoss();
      renderer.domElement.remove();
      motor.current = null;
    };
  }, [colocarCamara]);

  useEffect(() => {
    const m = motor.current;
    if (!m) return;
    if (m.grupo) {
      m.escena.remove(m.grupo);
      liberarGrupo(m.grupo);
      m.grupo = null;
    }
    try {
      if (!m.materiales || m.color !== escena.color) {
        if (m.materiales) {
          liberarMateriales(m.materiales);
          m.materiales = null;
        }
        m.materiales = crearMateriales(escena.color, { texturas: true });
        m.color = escena.color;
      }
      m.grupo = construirMallas(escena, m.materiales);
    } catch {
      onFalloRef.current();
      return;
    }
    m.grupo.scale.copy(ESPEJO);
    m.escena.add(m.grupo);
    m.renderer.domElement.setAttribute('aria-label', escena.cuerpo.tipo === 'lona'
      ? 'Render de la lona sobre el remolque'
      : 'Render del baquetón sobre el remolque');
    const { centro, tamano: t } = encuadre(escena.caja);
    m.suelo.scale.set(t.x * 4, t.z * 4, 1);
    m.suelo.position.set(centro.x, escena.caja.min[1] - 0.05, centro.z);
    colocarCamara();
  }, [escena, colocarCamara]);

  useEffect(() => { colocarCamara(); }, [vista, colocarCamara]);
  useEffect(() => { pintar(); }, [conCotas, pintar]);

  return (
    <div className="rem-render">
      {/* React no toca los hijos de este div: ahí va el lienzo de three.js. */}
      <div className="rem-render-lienzo" ref={lienzo} />
      {cotas && <CapaCotas cotas={cotas} ancho={tamano.ancho} alto={tamano.alto} />}
      {vista === 'tres-cuartos' && movida && (
        <button type="button" className="chip-3d rem-render-reiniciar" onClick={colocarCamara}>
          Volver a la vista fija
        </button>
      )}
    </div>
  );
}
