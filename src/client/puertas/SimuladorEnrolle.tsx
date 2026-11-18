import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { centros, construir, posicionLona, type ModeloEnrolle } from '../../puertas/enrolle/geometria.ts';
import type { EnrolleTgm } from '../../puertas/tgm.ts';
import { InputDecimal } from '../remolques/InputDecimal';
import { numeroPuerta as numero } from './medidasPuertas';

const DURACION = 6000;

function dibujar(canvas: HTMLCanvasElement, modelo: ModeloEnrolle, avance: number, enrolle: EnrolleTgm) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const css = getComputedStyle(canvas);
  const color = (nombre: string) => css.getPropertyValue(nombre).trim();
  const { cfg, colocacion, largo, ajustes, conSaco, anchoEt, cierreBajo } = enrolle;
  const apoyo = posicionLona(modelo, avance);
  const radioTubo = cfg.diametroTubo / 2;
  const finLona = largo + (cfg.conFunda && !conSaco ? radioTubo : 0);
  const colorLona = color('--control-active-border');
  const escala = canvas.height / (Math.max(colocacion.diametroFinal, cfg.diametroEnrolle) * 1.5);
  const giro = Math.PI - apoyo.a;
  const cx = canvas.width / 2, cy = canvas.height * 0.44;
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
  ctx.setTransform(escala, 0, 0, -escala, cx, cy);
  ctx.rotate(giro);
  ctx.lineWidth = 2 / escala;
  circulo(0, 0, cfg.diametroEnrolle / 2, color('--surface-2'), color('--text-muted'));
  if (cfg.altoPerfil > 0 && cfg.anchoPerfil > 0) {
    const radio = cfg.anchoPerfil / 2;
    circulo(cfg.diametroEnrolle / 2 + cfg.altoPerfil - radio, 0, radio, color('--control-active-border'), color('--control-active-border'));
  }

  // Pasado el punto de apoyo, el tramo libre sigue su tangente.
  const seno = Math.sin(apoyo.a), coseno = Math.cos(apoyo.a);
  const trazarLona = (desde: number, hasta: number, desplazamiento: number, continuar = false) => {
    const pasos = Math.max(1, Math.min(700, Math.ceil((hasta - desde) / 4)));
    for (let i = 0; i <= pasos; i++) {
      const marca = desde + (hasta - desde) * i / pasos;
      const libre = marca - avance;
      const p = libre <= 0 ? posicionLona(modelo, marca) : { x: apoyo.x - libre * seno, y: apoyo.y + libre * coseno, a: apoyo.a };
      const x = p.x + desplazamiento * Math.cos(p.a), y = p.y + desplazamiento * Math.sin(p.a);
      if (i === 0 && !continuar) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  };
  ctx.beginPath();
  trazarLona(0, avance, 0);
  trazarLona(avance, Math.min(finLona, avance + canvas.height / escala), 0, true);
  ctx.strokeStyle = colorLona;
  ctx.lineWidth = cfg.grosor;
  ctx.stroke();

  const justa = colocacion.parejas[0];
  const tubos = centros(modelo, avance);
  tubos.forEach((t, k) => {
    const riesgo = justa && justa.separacion < ajustes.margen && (k === justa.i || k === justa.j);
    const borde = riesgo ? color('--tramo-ajustado') : color('--text');
    if (!cfg.conFunda) {
      ctx.lineWidth = 2 / escala;
      circulo(t.x, t.y, radioTubo, color('--surface'), borde);
      return;
    }

    // El perímetro se mide por la línea media de la funda. Las colas se sueldan en la cara exterior del paño.
    const marca = modelo.marcas[k];
    const esCierre = !conSaco && k === tubos.length - 1;
    const radioFunda = radioTubo + cfg.grosor / 2;
    const cola = Math.max(0, ((esCierre ? cierreBajo : anchoEt) * 10 - 2 * Math.PI * radioFunda) / 2);
    ctx.strokeStyle = colorLona;
    ctx.lineWidth = cfg.grosor;
    if (cola > 0) {
      ctx.beginPath();
      trazarLona(Math.max(0, marca - cola), marca, cfg.grosor);
      trazarLona(marca, Math.min(finLona, marca + cola), cfg.grosor, true);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(t.x, t.y, radioFunda, 0, 2 * Math.PI);
    ctx.fillStyle = color('--surface');
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = (riesgo ? 2 : 0.75) / escala;
    circulo(t.x, t.y, radioTubo, color('--surface'), borde);
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
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
  const avance = fraccion * largo;
  const justa = colocacion.parejas[0];
  const haySolape = justa && justa.separacion < ajustes.margen;
  const textoAvance = `${numero(avance)} de ${numero(largo)} mm enrollados`;

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
    setFraccion(Math.max(0, Math.min(mm / largo, 1)));
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
        <canvas ref={lienzo} width={420} height={420} aria-hidden="true" />
        <div className="simulador-enrolle__mandos">
          <label htmlFor={`${id}-avance`}>Enrollado</label>
          <input id={`${id}-avance`} type="range" min={0} max={largo} step={0.1} value={Number(avance.toFixed(1))}
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
          <caption>Marcas desde el perfil fleco (mm)</caption>
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
