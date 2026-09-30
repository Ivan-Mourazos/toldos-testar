import React, { Suspense, useMemo, useState } from 'react';
import type { CalcParams } from '../../remolques/calc/params.ts';
import { construirEscena } from '../../remolques/escena/index.ts';
import type { ElementoEscena, Vista } from '../../remolques/escena/tipos.ts';
import { soporteWebGL } from './soporteWebGL';
import { useDiferido } from './useDiferido';

// El dibujo del elemento activo (fase 2b): el render 3D y, si el equipo no puede con él o
// falla, el dibujo técnico de siempre. three.js va en un trozo aparte que solo se pide aquí.
const RenderRemolque = React.lazy(() => import('./render/RenderRemolque'));

const VISTAS: Array<{ vista: Vista; nombre: string }> = [
  { vista: 'tres-cuartos', nombre: '3/4' },
  { vista: 'delante', nombre: 'Delante' },
  { vista: 'detras', nombre: 'Detrás' },
  { vista: 'lateral', nombre: 'Lateral' },
  { vista: 'arriba', nombre: 'Arriba' },
];

/** Si el render (o la descarga de su trozo) revienta, se avisa y se pasa al dibujo técnico. */
class LimiteFallo extends React.Component<{ onFallo: () => void; children: React.ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() { return { fallo: true }; }
  componentDidCatch() { this.props.onFallo(); }
  render() { return this.state.fallo ? null : this.props.children; }
}

type Props = ElementoEscena & {
  params: CalcParams;
  observaciones: string;
  onObservacionesChange: (valor: string) => void;
  /** El dibujo técnico (Escena3D), para cuando no hay 3D o falta la forma. */
  respaldo: React.ReactNode;
};

export function DibujoRemolque(props: Props) {
  const { tipo, input, res, params } = props;
  // Se difiere el elemento entero: tipo, entrada y resultado cambian juntos al pasar de una
  // lona a un baquetón y nunca deben mezclarse. `input` y `res` llegan memoizados de
  // useRemolques, así que la escena solo se rehace (y el render solo recoloca la cámara) cuando
  // cambia algo de verdad.
  const elemento = useMemo(() => ({ tipo, input, res }) as ElementoEscena, [tipo, input, res]);
  const diferido = useDiferido(elemento);
  const escena = useMemo(() => construirEscena(diferido, params), [diferido, params]);
  const [puede3D] = useState(soporteWebGL);
  const [fallo, setFallo] = useState(false);
  const [vista, setVista] = useState<Vista>('tres-cuartos');
  const [conCotas, setConCotas] = useState(false);
  const usar3D = puede3D && !fallo && escena != null;

  return (
    <section className="rem-dibujo" aria-label="Dibujo del remolque">
      {usar3D ? (
        <>
          <header className="rem-dibujo-cabecera">
            <p className="rem-dibujo-etiqueta">Render</p>
            <span className="rem-dibujo-separador" aria-hidden="true" />
            <div className="tira-3d cabecera-pestanas rem-dibujo-vistas" role="group" aria-label="Vista">
              {VISTAS.map(({ vista: v, nombre }) => (
                <button key={v} type="button" className={v === vista ? 'pestana pestana-activa' : 'pestana'}
                  aria-pressed={v === vista} onClick={() => setVista(v)}>
                  {nombre}
                </button>
              ))}
            </div>
            {/* Encendido = la ficha activa de CoordinaOT (`glass-chip-activo`), como un filtro puesto. */}
            <button type="button" className={`chip-3d rem-dibujo-cotas${conCotas ? ' glass-chip-activo' : ''}`}
              aria-pressed={conCotas} onClick={() => setConCotas(!conCotas)}>
              Cotas
            </button>
          </header>
          <LimiteFallo onFallo={() => setFallo(true)}>
            <Suspense fallback={<div className="rem-render rem-render-cargando" role="status">Cargando el 3D…</div>}>
              <RenderRemolque escena={escena} vista={vista} conCotas={conCotas} onFallo={() => setFallo(true)} />
            </Suspense>
          </LimiteFallo>
        </>
      ) : (
        <>
          {props.respaldo}
          {escena != null && (
            <p className="rem-render-aviso" role="status">Este equipo no puede mostrar el 3D: se ve el dibujo técnico.</p>
          )}
        </>
      )}
      <div className="rem-dibujo-pie">
        <label className="rem-observaciones">
          <span>Observaciones</span>
          <input
            name="observaciones"
            autoComplete="off"
            placeholder="Añadir indicaciones para producción…"
            value={props.observaciones}
            onChange={(evento) => props.onObservacionesChange(evento.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
