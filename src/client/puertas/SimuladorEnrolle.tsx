import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { centros, construir, posicionLona, radioMedioTubo, type ModeloEnrolle } from '../../puertas/enrolle/geometria.ts';
import type { EnrolleTgm } from '../../puertas/tgm.ts';
import { InputDecimal } from '../remolques/InputDecimal';
import { numeroPuerta as numero } from './medidasPuertas';

const DURACION = 6000;
const LADO_LIENZO = 440;
const RESOLUCION_LIENZO = 2;

function dibujar(canvas: HTMLCanvasElement, modelo: ModeloEnrolle, avance: number, enrolle: EnrolleTgm) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const css = getComputedStyle(canvas);
  const color = (nombre: string) => css.getPropertyValue(nombre).trim();
  const { cfg, colocacion, ajustes, conSaco, anchoEt, cierreBajo } = enrolle;
  const apoyo = posicionLona(modelo, avance);
  const radioTubo = cfg.diametroTubo / 2;
  const radioTira = radioMedioTubo(cfg);
  const tubos = centros(modelo, avance);
  const tiras = cfg.conFunda ? tubos.map((t, i) => {
    const { marca, angulo } = modelo.tubos[i];
    const a = marca <= avance ? angulo : apoyo.a;
    const ancho = !conSaco && i === tubos.length - 1 ? cierreBajo : anchoEt;
    const cola = Math.max(0, (ancho * 10 - Math.PI * radioTira) / 2);
    return { ...t, marca, a, c: Math.cos(a), s: Math.sin(a), alcance: radioTira + cola };
  }) : [];
  const finLona = modelo.largo + (conSaco ? 0 : tiras.at(-1)?.alcance ?? 0);
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

  // Pasado el punto de apoyo, el tramo libre sigue su tangente.
  const seno = Math.sin(apoyo.a), coseno = Math.cos(apoyo.a);
  const trazarLona = (desde: number, hasta: number, continuar = false) => {
    const pasos = Math.max(1, Math.min(700, Math.ceil((hasta - desde) / 4)));
    for (let i = 0; i <= pasos; i++) {
      const marca = desde + (hasta - desde) * i / pasos;
      const libre = marca - avance;
      const p = libre <= 0 ? posicionLona(modelo, marca) : { x: apoyo.x - libre * seno, y: apoyo.y + libre * coseno, a: apoyo.a };
      let { x, y } = p;
      // Fuera del medio tubo, el paño y la tira comparten la recta de las soldaduras.
      let pesoMaximo = 0;
      for (const tira of tiras) {
        const distancia = marca - tira.marca;
        const peso = Math.min(1, 1 - (Math.abs(distancia) - tira.alcance) / radioTubo);
        if (peso <= pesoMaximo) continue;
        pesoMaximo = peso;
        const planoX = tira.x - distancia * tira.s;
        const planoY = tira.y + distancia * tira.c;
        x = p.x + peso * (planoX - p.x);
        y = p.y + peso * (planoY - p.y);
      }
      if (i === 0 && !continuar) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  };
  ctx.beginPath();
  const finVisible = Math.min(finLona, avance + LADO_LIENZO / escala);
  let desde = 0;
  for (const tira of tiras) {
    const antes = tira.marca - radioTira, despues = tira.marca + radioTira;
    if (antes < desde || despues > finVisible) continue;
    trazarLona(desde, antes, desde > 0);
    const a = tira.a - Math.PI / 2;
    ctx.arc(tira.x, tira.y, radioTira, a, a - Math.PI, true);
    desde = despues;
  }
  trazarLona(desde, finVisible, desde > 0);
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
  for (const tira of tiras) {
    ctx.save();
    ctx.translate(tira.x, tira.y);
    ctx.rotate(tira.a - Math.PI / 2);
    ctx.strokeStyle = colorTira;
    ctx.lineWidth = cfg.grosor;
    ctx.beginPath();
    ctx.moveTo(tira.alcance, 0);
    ctx.lineTo(radioTira, 0);
    ctx.arc(0, 0, radioTira, 0, Math.PI);
    ctx.lineTo(-tira.alcance, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.setTransform(RESOLUCION_LIENZO, 0, 0, RESOLUCION_LIENZO, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = color('--text');
  const cos = Math.cos(giro), sin = Math.sin(giro);
  tubos.forEach(({ x, y }, i) => ctx.fillText(`T${i + 1}`, cx + escala * (x * cos - y * sin), cy - escala * (x * sin + y * cos)));
}

export function SimuladorEnrolle({ enrolle, manual = false, cambiarManual }: {
  enrolle: EnrolleTgm;
  manual?: boolean;
  cambiarManual?: (marcas: number[] | null) => void;
}) {
  const { largo, cfg, colocacion, ajustes, conSaco } = enrolle;
  const modelo = useMemo(() => construir(cfg, colocacion.marcas, largo), [cfg, colocacion.marcas, largo]);
  const [fraccion, setFraccion] = useState(1);
  const [inicio, setInicio] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [tema, setTema] = useState(() => globalThis.document?.documentElement.dataset.theme ?? '');
  const lienzo = useRef<HTMLCanvasElement>(null);
  const id = useId();
  const avance = fraccion * modelo.largo;
  const justa = colocacion.parejas[0];
  const haySolape = justa && justa.separacion < ajustes.margen;
  const textoAvance = `${numero(avance)} de ${numero(modelo.largo)} mm de avance`;

  useEffect(() => {
    if (inicio === null) return;
    let idFotograma: number;
    let primero: number | undefined;
    const paso = (t: number) => {
      primero ??= t;
      const siguiente = Math.min(1, inicio + (t - primero) / DURACION);
      setFraccion(siguiente);
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
    if (lienzo.current) dibujar(lienzo.current, modelo, avance, enrolle);
  }, [modelo, avance, enrolle, tema]);

  function mover(mm: number) {
    setInicio(null);
    setFraccion(Math.max(0, Math.min(mm / modelo.largo, 1)));
  }

  function reproducir() {
    if (inicio !== null) setInicio(null);
    else {
      const desde = fraccion === 1 ? 0 : fraccion;
      setFraccion(desde);
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
          <input id={`${id}-avance`} type="range" min={0} max={modelo.largo} step="any" value={avance}
            aria-valuetext={textoAvance} onChange={e => mover(e.currentTarget.valueAsNumber)} />
          <output htmlFor={`${id}-avance`} aria-live="off">{textoAvance}</output>
          <div className="simulador-enrolle__acciones">
            <button type="button" className="ghost-button" onClick={reproducir}>{inicio === null ? 'Reproducir' : 'Pausar'}</button>
            <button type="button" className="ghost-button" disabled={!justa} onClick={() => justa && mover(justa.donde)}>Ir al punto más justo</button>
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
        {cambiarManual && <label className="puerta-casilla">
          <input type="checkbox" checked={manual} onChange={e => { setError(''); cambiarManual(e.target.checked ? [...colocacion.marcas] : null); }} />
          Colocar los tubos a mano
        </label>}
        <table className="simulador-enrolle__tabla">
          <caption>Marcas en lona plana desde el perfil fleco (mm)</caption>
          <thead><tr><th scope="col">Tubo</th><th scope="col">Reparto igual</th><th scope="col">Colocado</th><th scope="col">Diferencia</th><th scope="col">Ángulo al perfil</th></tr></thead>
          <tbody>{colocacion.marcas.map((m, k) => <tr key={k}>
            <th scope="row">{k + 1}</th>
            <td>{numero(colocacion.iguales[k])}</td>
            <td>{manual && (conSaco || k !== colocacion.marcas.length - 1)
              ? <InputDecimal aria-label={`Marca del tubo ${k + 1} (mm)`} value={m} onValor={v => cambiarMarca(k, v)} />
              : numero(m)}</td>
            <td>{numero(m - colocacion.iguales[k])}</td>
            <td>{numero(colocacion.angulos[k])}°</td>
          </tr>)}</tbody>
        </table>
        {manual && !conSaco && <p className="puerta-ayuda">El último tubo queda fijo en el cierre.</p>}
        {error && <p className="simulador-enrolle__error" role="status">{error}</p>}
      </div>
    </div>
  </section>;
}
