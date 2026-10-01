import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Minus, Plus, Scan } from 'lucide-react';
import type { EscenaRemolque, Vista } from '../../../remolques/escena/tipos.ts';
import { aMundo, crearCamara, encuadre, encuadrarPantalla, espejar } from './camaras';
import { CapaCotas, CapaRotulos } from './CapaCotas';
import { colocarSol, montarEscenaBase } from './escenaBase';
import { construirMallas, liberarGrupo } from './mallas';
import { crearMateriales, liberarMateriales, type Materiales } from './materiales';
import { cotasVisibles, rotulosVisibles, type CotasPantalla, type RotuloPantalla } from './proyeccion';

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
  /** La caja de la última escena (en texto): si no cambia, la 3/4 girada se queda como está. */
  caja: string | null;
  ancho: number;
  alto: number;
}

export interface RenderRemolqueProps {
  escena: EscenaRemolque;
  vista: Vista;
  conCotas: boolean;
  onFallo: () => void;
  /** Texto al pie de la vista (la recogida de frente y de espaldas), como en la hoja de taller. */
  nota?: string | null;
}

/** Cómo se nombra cada vista en la etiqueta del lienzo, para quien usa lector de pantalla. */
const NOMBRE_VISTA: Record<Vista, string> = {
  'tres-cuartos': 'en tres cuartos',
  delante: 'de delante',
  detras: 'de detrás',
  lateral: 'lateral',
  arriba: 'desde arriba',
};

export default function RenderRemolque({ escena, vista, conCotas, onFallo, nota = null }: RenderRemolqueProps) {
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
  const [rotulos, setRotulos] = useState<RotuloPantalla[] | null>(null);
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });
  const [movida, setMovida] = useState(false);
  const [zoom, setZoom] = useState(100);

  const pintar = useCallback(() => {
    const m = motor.current;
    if (!m?.camara) return;
    m.renderer.render(m.escena, m.camara);
    const d = datos.current;
    // Las cotas son de la vista fija: al girar, las de las caras de atrás se pintarían encima de la lona.
    const nuevas = d.conCotas && !m.girada ? cotasVisibles(d.escena, d.vista, m.camara, m.ancho, m.alto) : null;
    // Sin nada que rotular, null: al girar no se vuelve a pintar el componente en cada movimiento.
    setCotas(nuevas && (nuevas.lineas.length > 0 || nuevas.marcas.length > 0) ? nuevas : null);
    // DELANTE y DETRÁS, siempre en las vistas rectas; la 3/4 no los lleva (y al girarla sigue en null).
    const conRotulos = m.girada ? [] : rotulosVisibles(d.escena, d.vista, m.camara, m.ancho, m.alto);
    setRotulos(conRotulos.length > 0 ? conRotulos : null);
  }, []);

  const colocarCamara = useCallback(() => {
    const m = motor.current;
    if (!m || m.ancho === 0 || m.alto === 0) return;
    const d = datos.current;
    m.controles?.dispose();
    m.controles = null;
    const camara = crearCamara(d.vista, d.escena.caja, m.ancho / m.alto);
    if (m.grupo) {
      const puntos = d.escena.rotulos.filter((r) => r.vistas.includes(d.vista)).map((r) => aMundo(r.punto));
      if (d.conCotas) {
        for (const c of d.escena.cotas.filter((c) => c.vistas.includes(d.vista))) {
          puntos.push(aMundo(c.desde), aMundo(c.hasta));
          if (c.hueco) puntos.push(aMundo(c.hueco.borde), aMundo(c.hueco.dentro.desde), aMundo(c.hueco.dentro.hasta));
        }
        puntos.push(...d.escena.etiquetas.filter((e) => e.vistas.includes(d.vista)).map((e) => aMundo(e.punto)));
      }
      encuadrarPantalla(camara, m.grupo, m.ancho, m.alto, puntos, d.conCotas ? 40 : 32);
    }
    m.renderer.domElement.setAttribute('aria-label', `Render ${d.escena.cuerpo.tipo === 'lona' ? 'de la lona' : 'del baquetón'} sobre el remolque, vista ${NOMBRE_VISTA[d.vista]}`);
    m.camara = camara;
    colocarSol(m.sol, d.escena.caja, d.vista);
    // Desde arriba la sombra del suelo sale como una losa gris pegada a un lado del remolque; en
    // las vistas de frente el suelo queda de canto y no se ve. Solo la 3/4 lo necesita para asentarse.
    m.suelo.visible = d.vista !== 'arriba';
    if (d.vista === 'tres-cuartos') {
      const controles = new OrbitControls(camara, m.renderer.domElement);
      controles.target.copy(encuadre(d.escena.caja).centro);
      controles.enablePan = false;
      // La rueda desplaza la página; el zoom se maneja con los botones del visor.
      controles.enableZoom = false;
      // Girar alrededor sin meterse bajo el suelo.
      controles.minPolarAngle = 0.15;
      controles.maxPolarAngle = Math.PI / 2 - 0.05;
      controles.addEventListener('change', () => {
        // Al girar, la nueva silueta sigue dentro del visor. Se encuadra a escala normal y después
        // se conserva el zoom elegido para inspeccionar un detalle.
        if (m.girada && m.grupo && camara instanceof THREE.PerspectiveCamera) {
          const zoomActual = camara.zoom;
          camara.zoom = 1;
          encuadrarPantalla(camara, m.grupo, m.ancho, m.alto, [], 32);
          camara.zoom = zoomActual;
          camara.updateProjectionMatrix();
        }
        pintar();
      });
      controles.addEventListener('start', () => {
        m.girada = true;
        setMovida(true);
      });
      controles.update();
      m.controles = controles;
    }
    m.girada = false;
    setMovida(false);
    setZoom(100);
    pintar();
  }, [pintar]);

  const cambiarZoom = useCallback((paso: number) => {
    const m = motor.current;
    if (!m) return;
    const camara = m.camara;
    if (!(camara instanceof THREE.PerspectiveCamera || camara instanceof THREE.OrthographicCamera)) return;
    const siguiente = Math.min(250, Math.max(50, Math.round(camara.zoom * 100) + paso));
    camara.zoom = siguiente / 100;
    camara.updateProjectionMatrix();
    setZoom(siguiente);
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
    // Neutral (y no ACES) respeta el color de la lona: con ACES el gris 7038 salía casi blanco y
    // los colores, lavados. La exposición baja y la luz ambiente suave dejan que cada cara tenga
    // su tono, como en las fotos del taller, y que el brillo del PVC se note.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.7;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute('role', 'img');
    caja.appendChild(renderer.domElement);

    // Luces, entorno y suelo de sombras: los mismos que la hoja de taller, en color (escenaBase.ts).
    const base = montarEscenaBase(renderer);
    const { escena: escena3D, sol, suelo } = base;
    motor.current = {
      renderer, escena: escena3D, sol, suelo, camara: null, controles: null, grupo: null, materiales: null, color: null, girada: false, caja: null, ancho: 0, alto: 0,
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
      base.liberar();
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
    espejar(m.grupo);
    m.escena.add(m.grupo);
    const { centro, tamano: t } = encuadre(escena.caja);
    m.suelo.scale.set(t.x * 4, t.z * 4, 1);
    m.suelo.position.set(centro.x, escena.caja.min[1] - 0.05, centro.z);
    // Si la 3/4 está girada y el remolque ocupa lo mismo (otro color, otra recogida…), se cambian
    // las mallas y se repinta sin devolver la cámara a la vista fija.
    const caja = JSON.stringify(escena.caja);
    const mismaCaja = m.caja === caja;
    m.caja = caja;
    if (m.girada && mismaCaja) pintar();
    else colocarCamara();
  }, [escena, colocarCamara, pintar]);

  useEffect(() => { colocarCamara(); }, [vista, colocarCamara]);
  useEffect(() => { colocarCamara(); }, [conCotas, colocarCamara]);

  return (
    <div className="rem-render" data-vista={vista} data-cotas={conCotas}>
      {/* React no toca los hijos de este div: ahí va el lienzo de three.js. */}
      <div className="rem-render-lienzo" ref={lienzo} />
      {rotulos && <CapaRotulos rotulos={rotulos} ancho={tamano.ancho} alto={tamano.alto} />}
      {cotas && <CapaCotas cotas={cotas} ancho={tamano.ancho} alto={tamano.alto} />}
      {nota && <p className="rem-render-nota">{nota}</p>}
      <div className="rem-render-zoom" role="group" aria-label="Zoom del dibujo">
        <button type="button" className="chip-3d" aria-label="Alejar dibujo" title="Alejar dibujo" disabled={zoom <= 50} onClick={() => cambiarZoom(-25)}><Minus aria-hidden="true" /></button>
        <span className="rem-render-zoom-valor">{zoom.toLocaleString('es-ES')} %</span>
        <button type="button" className="chip-3d" aria-label="Acercar dibujo" title="Acercar dibujo" disabled={zoom >= 250} onClick={() => cambiarZoom(25)}><Plus aria-hidden="true" /></button>
        <button type="button" className="chip-3d" aria-label="Encuadrar dibujo" title="Encuadrar dibujo" onClick={colocarCamara}><Scan aria-hidden="true" /></button>
      </div>
      {vista === 'tres-cuartos' && movida && (
        <button type="button" className="chip-3d rem-render-reiniciar" onClick={colocarCamara}>
          Volver a la vista fija
        </button>
      )}
    </div>
  );
}
