import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { construir, radioMedioTubo } from '../../puertas/enrolle/geometria.ts';
import type { EnrolleTgm } from '../../puertas/tgm.ts';
import { InputDecimal } from '../remolques/InputDecimal';
import { numeroPuerta as numero } from './medidasPuertas';

import { avancePorGiro, colasSoldadas, fotograma, giroPorAvance, prepararTrayectoria } from './trayectoriaEnrolle';

const formatoAvance = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, useGrouping: false });
const DURACION = 15000;
const LADO_LIENZO = 440;
const RESOLUCION_LIENZO = 2;

function dibujar(canvas: HTMLCanvasElement, trayectoria: ReturnType<typeof prepararTrayectoria>, avance: number, enrolle: EnrolleTgm, color: (nombre: string) => string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { modelo } = trayectoria;
  const { cfg, colocacion, ajustes, conSaco, anchoEt, cierreBajo } = enrolle;
  const { apoyo, tubos, punto, lados } = fotograma(trayectoria, avance);
  const radioTubo = cfg.diametroTubo / 2;
  const radioTira = radioMedioTubo(cfg);
  const tiras = cfg.conFunda ? tubos.map((t, i) => {
    const ancho = !conSaco && i === tubos.length - 1 ? cierreBajo : anchoEt;
    const cola = Math.max(0, (ancho * 10 - Math.PI * radioTira) / 2);
    return { ...t, cola };
  }) : [];
  const colorLona = color('--control-active-border');
  const colorTira = color('--tramo-holgado');
  const escala = LADO_LIENZO / (Math.max(colocacion.diametroFinal, cfg.diametroEnrolle) * 1.22);
  const giro = Math.PI - apoyo.a;
  const cx = LADO_LIENZO / 2, cy = LADO_LIENZO * 0.47;
  const circulo = (x: number, y: number, radio: number, relleno: string, borde: string) => {
    ctx.beginPath();
    ctx.arc(x, y, radio, 0, 2 * Math.PI);
    ctx.fillStyle = relleno;
    ctx.fill();
    ctx.strokeStyle = borde;
    ctx.stroke();
  };

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(RESOLUCION_LIENZO, 0, 0, RESOLUCION_LIENZO, 0, 0);
  ctx.translate(cx, cy);
  ctx.scale(escala, -escala);
  ctx.rotate(giro);
  ctx.lineWidth = 2 / escala;
  circulo(0, 0, cfg.diametroEnrolle / 2, color('--surface-2'), color('--text-muted'));
  if (cfg.altoPerfil > 0 && cfg.anchoPerfil > 0) {
    const radio = cfg.anchoPerfil / 2;
    circulo(cfg.diametroEnrolle / 2 + cfg.altoPerfil - radio, 0, radio, color('--control-active-border'), color('--control-active-border'));
  }

  const trazar = (puntos: ReadonlyArray<{ x: number; y: number }>) => {
    ctx.moveTo(puntos[0].x, puntos[0].y);
    for (let i = 1; i < puntos.length; i++) ctx.lineTo(puntos[i].x, puntos[i].y);
  };
  ctx.beginPath();
  if (!tiras.length) {
    const fin = Math.min(modelo.largo, avance + LADO_LIENZO / escala);
    const pasos = Math.max(1, Math.ceil(fin / trayectoria.paso));
    trazar(Array.from({ length: pasos + 1 }, (_, i) => punto(i * fin / pasos)));
  }
  for (const [i, tira] of tiras.entries()) {
    const [antes, despues] = lados[i];
    trazar(antes);
    const a = tira.a - Math.PI / 2;
    ctx.moveTo(antes[0].x, antes[0].y);
    ctx.arc(tira.x, tira.y, radioTira, a, a - Math.PI, true);
    trazar(despues);
  }
  ctx.strokeStyle = colorLona;
  ctx.lineWidth = cfg.grosor;
  ctx.stroke();

  const justa = colocacion.parejas[0];
  tubos.forEach((t, k) => {
    const riesgo = justa && justa.separacion < ajustes.margen && (k === justa.i || k === justa.j);
    const borde = riesgo ? color('--tramo-ajustado') : color('--text');
    ctx.lineWidth = (riesgo || !cfg.conFunda ? 2 : 0.75) / escala;
    circulo(t.x, t.y, radioTubo, color('--surface'), borde);
  });
  for (const [i, tira] of tiras.entries()) {
    const [antes, despues] = lados[i].map(lona => colasSoldadas(lona, tira.cola));
    // Las dos capas soldadas deben poder distinguirse incluso ampliando el dibujo.
    ctx.beginPath();
    trazar(antes);
    trazar(despues);
    ctx.lineWidth = 2 * cfg.grosor;
    ctx.strokeStyle = colorLona;
    ctx.stroke();
    ctx.beginPath();
    trazar(antes);
    const a = tira.a - Math.PI / 2;
    ctx.moveTo(antes[0].x, antes[0].y);
    ctx.arc(tira.x, tira.y, radioTira, a, a + Math.PI);
    trazar(despues);
    ctx.lineWidth = cfg.grosor;
    ctx.strokeStyle = colorTira;
    ctx.stroke();
  }
  ctx.setTransform(RESOLUCION_LIENZO, 0, 0, RESOLUCION_LIENZO, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = color('--text');
  const cos = Math.cos(giro), sin = Math.sin(giro);
  tubos.forEach(({ x, y }, i) => ctx.fillText(`T${i + 1}`, cx + escala * (x * cos - y * sin), cy - escala * (x * sin + y * cos)));
}

export function SimuladorEnrolle({ enrolle, manual = false, soloManual = false, cambiarManual }: {
  enrolle: EnrolleTgm;
  manual?: boolean;
  soloManual?: boolean;
  cambiarManual?: (marcas: number[] | null) => void;
}) {
  const { largo, cfg, colocacion, ajustes, conSaco } = enrolle;
  const ultimoFijo = enrolle.ultimoFijo ?? !conSaco;
  const modelo = useMemo(() => construir(cfg, colocacion.marcas, largo), [cfg, colocacion.marcas, largo]);
  const radio = radioMedioTubo(cfg);
  const extension = conSaco ? 0 : radio + Math.max(0, (enrolle.cierreBajo * 10 - Math.PI * radio) / 2);
  const trayectoria = useMemo(() => prepararTrayectoria(modelo, extension), [modelo, extension]);
  const fraccion = useRef(1);
  const barra = useRef<HTMLInputElement>(null);
  const salida = useRef<HTMLOutputElement>(null);
  const pintar = useRef<(f: number) => void>(() => {});
  // La reproducción avanza por giro del rollo, no por mm de lona: así no se para en los tramos rectos.
  const fraccionDeGiro = useRef((g: number) => g);
  const [inicio, setInicio] = useState<number | null>(null);
  const [enPausa, setEnPausa] = useState(false);
  const [error, setError] = useState('');
  const [tema, setTema] = useState(() => globalThis.document?.documentElement.dataset.theme ?? '');
  const lienzo = useRef<HTMLCanvasElement>(null);
  const id = useId();
  const justa = colocacion.parejas[0];
  const haySolape = justa && justa.separacion < ajustes.margen;
  const textoAvance = `${numero(largo)} de ${numero(largo)} mm de avance`;

  useEffect(() => {
    if (inicio === null) return;
    let idFotograma: number;
    let primero: number | undefined;
    const paso = (t: number) => {
      primero ??= t;
      const siguiente = Math.min(1, inicio + (t - primero) / DURACION);
      pintar.current(fraccionDeGiro.current(siguiente));
      if (siguiente < 1) idFotograma = requestAnimationFrame(paso);
      else setInicio(null);
    };
    idFotograma = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(idFotograma);
  }, [inicio]);

  useEffect(() => {
    const raiz = document.documentElement;
    const cambios = new MutationObserver(() => setTema(raiz.dataset.theme ?? ''));
    cambios.observe(raiz, { attributes: true, attributeFilter: ['data-theme'] });
    return () => cambios.disconnect();
  }, []);

  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;
    const css = getComputedStyle(canvas);
    const colores = new Map(['--surface-2', '--text-muted', '--control-active-border', '--tramo-holgado',
      '--tramo-ajustado', '--text', '--surface'].map(nombre => [nombre, css.getPropertyValue(nombre).trim()]));
    const color = (nombre: string) => colores.get(nombre)!;
    const max = numero(largo);
    pintar.current = f => {
      fraccion.current = f;
      const mm = f * largo;
      dibujar(canvas, trayectoria, modelo.proyectar(mm), enrolle, color);
      const texto = `${formatoAvance.format(mm)} de ${max} mm de avance`;
      if (barra.current) {
        barra.current.valueAsNumber = mm;
        barra.current.setAttribute('aria-valuetext', texto);
      }
      if (salida.current?.firstChild) salida.current.firstChild.nodeValue = texto;
    };
    fraccionDeGiro.current = g => g >= 1 ? 1 : Math.min(1, modelo.desplegar(avancePorGiro(trayectoria, g)) / largo);
    pintar.current(fraccion.current);
  }, [modelo, trayectoria, enrolle, tema, largo]);

  function mover(mm: number) {
    setInicio(null);
    setEnPausa(false);
    pintar.current(Math.max(0, Math.min(mm / largo, 1)));
  }

  function reproducir() {
    setEnPausa(inicio !== null);
    if (inicio !== null) setInicio(null);
    else {
      const desde = fraccion.current === 1 ? 0 : giroPorAvance(trayectoria, modelo.proyectar(fraccion.current * largo));
      pintar.current(fraccionDeGiro.current(desde));
      setInicio(desde);
    }
  }

  function cambiarMarca(i: number, valor: number | null) {
    const anterior = colocacion.marcas[i - 1] ?? 0;
    const siguiente = colocacion.marcas[i + 1] ?? largo;
    if (valor === null || valor <= anterior || valor >= siguiente) {
      setError(`Pon la marca del tubo ${i + 1} entre ${numero(anterior)} y ${numero(siguiente)} mm.`);
      return;
    }
    setError('');
    cambiarManual?.(colocacion.marcas.map((marca, k) => k === i ? valor : marca));
  }

  return <section className="simulador-enrolle panel panel-vidrio" aria-labelledby={`${id}-titulo`}>
    <h2 id={`${id}-titulo`}>Simulador de enrolle</h2>
    <div className="simulador-enrolle__cuerpo">
      <div className="simulador-enrolle__dibujo">
        <canvas ref={lienzo} width={LADO_LIENZO * RESOLUCION_LIENZO} height={LADO_LIENZO * RESOLUCION_LIENZO} aria-hidden="true" />
        <div className="simulador-enrolle__mandos">
          <label htmlFor={`${id}-avance`}>Enrollado</label>
          <input id={`${id}-avance`} type="range" min={0} max={largo} step="any" ref={barra} defaultValue={largo}
            aria-valuetext={textoAvance} onChange={e => mover(e.currentTarget.valueAsNumber)} />
          <output ref={salida} htmlFor={`${id}-avance`} aria-live="off">{textoAvance}</output>
          <div className="simulador-enrolle__acciones">
            <button type="button" className="ghost-button" onClick={reproducir}>{inicio !== null ? 'Pausar' : enPausa ? 'Seguir' : 'Reproducir'}</button>
            <button type="button" className="ghost-button" disabled={!justa} onClick={() => justa && mover(modelo.desplegar(justa.donde))}>Ir al punto más justo</button>
          </div>
        </div>
      </div>
      <div className="simulador-enrolle__resultados">
        <dl className="simulador-enrolle__datos">
          <div className={haySolape ? 'es-error' : undefined}>
            <dt>Separación mínima</dt>
            <dd>{justa ? `${numero(justa.separacion)} mm` : '—'}</dd>
            {justa && <dd className="simulador-enrolle__detalle">Tubos {justa.i + 1} y {justa.j + 1}</dd>}
          </div>
          <div><dt>Diámetro final</dt><dd>{numero(colocacion.diametroFinal)} mm</dd></div>
        </dl>
        {cambiarManual && !soloManual && <label className="puerta-casilla">
          <input type="checkbox" checked={manual} onChange={e => { setError(''); cambiarManual(e.target.checked ? [...colocacion.marcas] : null); }} />
          Colocar los tubos a mano
        </label>}
        <table className="simulador-enrolle__tabla">
          <caption>Marcas en lona plana desde el perfil fleco (mm)</caption>
          <thead><tr><th scope="col">Tubo</th><th scope="col">Reparto igual</th><th scope="col">Colocado</th><th scope="col">Diferencia</th><th scope="col">Ángulo al perfil</th></tr></thead>
          <tbody>{colocacion.marcas.map((m, k) => <tr key={k}>
            <th scope="row">{k + 1}</th>
            <td>{numero(colocacion.iguales[k])}</td>
            <td>{manual && (!ultimoFijo || k !== colocacion.marcas.length - 1)
              ? <InputDecimal aria-label={`Marca del tubo ${k + 1} (mm)`} value={m} onValor={v => cambiarMarca(k, v)} />
              : numero(m)}</td>
            <td>{numero(m - colocacion.iguales[k])}</td>
            <td>{numero(colocacion.angulos[k])}°</td>
          </tr>)}</tbody>
        </table>
        {manual && ultimoFijo && <p className="puerta-ayuda">{conSaco ? 'La E.T. inferior queda fija en la soldadura del saco.' : 'El último tubo queda fijo en el cierre.'}</p>}
        {error && <p className="simulador-enrolle__error" role="status">{error}</p>}
      </div>
    </div>
  </section>;
}
