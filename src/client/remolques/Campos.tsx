import React, { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { Material } from '../../remolques/calc/materiales-seed.ts';
import { FabricStockCodeLine } from '../components/FabricStockLine';
import { enUnRenglon, useAltoAjustado } from '../hooks/useAltoAjustado';
import { useFloatingMenu } from '../hooks/useFloatingMenu';
import { InputDecimal } from './InputDecimal';
import { codigoStockMaterial } from './stockMaterial';

// Los campos del formulario de remolques (los de `campos.tsx` de la web de remolques) hechos con
// el marcado y las clases de los campos de las tarjetas de toldo: `field`, `select-field` /
// `select-control` / `select-options`, `segmented-field` / `segmented-control`, `fabric-combobox`
// (la bobina). Así entran en el estilo de `nuevo-pedido.css` sin reglas propias. Lo que cambia
// respecto a toldos: las opciones llevan valor y etiqueta (el valor guardado no cambia; solo
// se ve mejor), el error es el texto de `validar-planteamiento` bajo el campo, y los avisos
// se ven solo tras tocar el campo (eso lo decide `erroresVisibles`, no estos componentes).

export type Opcion = { value: string; label: string };
type Rejilla = 1 | 2 | 3 | 4;

const cols = (span?: Rejilla) => (span && span > 1 ? ` rem-span-${span}` : '');

function MensajeError({ id, mensaje }: { id: string; mensaje?: string }) {
  return mensaje ? <small id={id} className="rem-error">{mensaje}</small> : null;
}

/** Un paso numerado del formulario, como los grupos de la tarjeta de toldo. */
/** `recogidas`: dos columnas que se reparten lo que deja un Sí / No a su ancho. */
export function PasoFormulario({ numero, titulo, children, columnas = 3 }: {
  numero?: number; titulo: string; children: ReactNode; columnas?: 3 | 4 | 'recogidas';
}) {
  return (
    <section className="rem-paso">
      <header className="rem-paso-titulo">
        {numero != null && <span className="rem-paso-numero" aria-hidden="true">{numero}</span>}
        <h3>{titulo}</h3>
      </header>
      <div className={`rem-rejilla rem-rejilla-${columnas}`}>{children}</div>
    </section>
  );
}

export function CampoNum(props: {
  label: string; value: number; onChange: (v: number) => void; span?: Rejilla; name?: string; error?: string;
}) {
  const errorId = useId();
  return (
    <label className={`rem-campo${props.error ? ' is-invalido' : ''}${cols(props.span)}`}>
      <span>{props.label}</span>
      <InputDecimal
        name={props.name}
        data-campo={props.name}
        aria-invalid={Boolean(props.error)}
        aria-describedby={props.error ? errorId : undefined}
        value={props.value === 0 ? undefined : props.value}
        onValor={(valor) => props.onChange(valor ?? 0)}
      />
      <MensajeError id={errorId} mensaje={props.error} />
    </label>
  );
}

export function CampoTexto(props: {
  label: string; value: string; onChange: (v: string) => void; span?: Rejilla; name?: string; error?: string;
}) {
  const errorId = useId();
  return (
    <label className={`rem-campo${props.error ? ' is-invalido' : ''}${cols(props.span)}`}>
      <span>{props.label}</span>
      <input
        name={props.name}
        data-campo={props.name}
        autoComplete="off"
        aria-invalid={Boolean(props.error)}
        aria-describedby={props.error ? errorId : undefined}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <MensajeError id={errorId} mensaje={props.error} />
    </label>
  );
}

/**
 * Sí / No que arranca vacío.
 *
 * Una casilla no vale aquí: marcada o desmarcada siempre afirma algo, y lo que hace falta es
 * distinguir «no lleva» —una decisión— de «nadie lo ha mirado».
 */
export function CampoSiNo(props: {
  label: string; value: boolean | null; onChange: (v: boolean) => void; name?: string; error?: string; span?: Rejilla;
}) {
  const errorId = useId();
  const opcion = (valor: boolean, texto: string) => (
    <button
      type="button"
      data-campo={props.name}
      className={props.value === valor ? 'segmented-option tecla-3d active' : 'segmented-option tecla-3d'}
      aria-pressed={props.value === valor}
      onClick={() => props.onChange(valor)}
    >
      {texto}
    </button>
  );
  return (
    <div className={`field segmented-field rem-campo${props.error ? ' is-invalido' : ''}${cols(props.span)}`}>
      <span>{props.label}</span>
      <div
        className={`segmented-control${props.value === null ? ' is-empty' : ''}`}
        role="group"
        aria-label={props.label}
        aria-invalid={Boolean(props.error)}
        aria-describedby={props.error ? errorId : undefined}
      >
        {opcion(true, 'Sí')}
        {opcion(false, 'No')}
      </div>
      <MensajeError id={errorId} mensaje={props.error} />
    </div>
  );
}

export function CampoSelect(props: {
  label: string;
  value: string;
  opciones: Array<string | Opcion>;
  onChange: (v: string) => void;
  span?: Rejilla;
  name?: string;
  error?: string;
  /** Texto mientras no se ha elegido nada. Sin él, un valor vacío se pinta como la primera
   *  opción y el campo aparenta estar decidido. */
  sinElegir?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const listaId = useId();
  const errorId = useId();
  const estiloMenu = useFloatingMenu(abierto, disparador, { maxHeight: 236, preferredWidth: 240 });
  const opciones: Opcion[] = props.opciones.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const indiceActual = opciones.findIndex((o) => o.value === props.value);
  const sinElegir = Boolean(props.sinElegir) && !props.value;
  const etiqueta = sinElegir
    ? props.sinElegir!
    : (opciones.find((o) => o.value === props.value)?.label ?? props.value ?? opciones[0]?.label ?? '');

  useEffect(() => {
    if (!abierto) return undefined;
    const cerrarFuera = (evento: PointerEvent) => {
      const destino = evento.target as Node;
      if (!raiz.current?.contains(destino) && !menu.current?.contains(destino)) setAbierto(false);
    };
    document.addEventListener('pointerdown', cerrarFuera);
    return () => document.removeEventListener('pointerdown', cerrarFuera);
  }, [abierto]);

  const abrir = () => {
    setIndiceActivo(Math.max(indiceActual, 0));
    setAbierto(true);
  };
  const elegir = (valor: string) => {
    props.onChange(valor);
    setAbierto(false);
    requestAnimationFrame(() => disparador.current?.focus());
  };
  const mover = (delta: 1 | -1) => {
    if (!abierto) { abrir(); return; }
    setIndiceActivo((actual) => (actual + delta + opciones.length) % opciones.length);
  };

  return (
    <div ref={raiz} className={`field select-field rem-campo${abierto ? ' is-open' : ''}${props.error ? ' is-invalido' : ''}${cols(props.span)}`}>
      <span id={labelId}>{props.label}</span>
      <button
        ref={disparador}
        data-campo={props.name}
        type="button"
        className={`select-control${sinElegir ? ' is-placeholder' : ''}`}
        role="combobox"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-invalid={Boolean(props.error)}
        aria-describedby={props.error ? errorId : undefined}
        title={etiqueta}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={(evento) => {
          if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
            evento.preventDefault();
            mover(evento.key === 'ArrowDown' ? 1 : -1);
          } else if (evento.key === 'Home' && abierto) {
            evento.preventDefault();
            setIndiceActivo(0);
          } else if (evento.key === 'End' && abierto) {
            evento.preventDefault();
            setIndiceActivo(opciones.length - 1);
          } else if ((evento.key === 'Enter' || evento.key === ' ') && abierto && opciones[indiceActivo]) {
            evento.preventDefault();
            elegir(opciones[indiceActivo].value);
          } else if (evento.key === 'Escape' && abierto) {
            evento.preventDefault();
            setAbierto(false);
          }
        }}
      >
        <span>{etiqueta}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {abierto && createPortal(
        <div ref={menu} id={listaId} className="select-options select-options-portal" style={estiloMenu} role="listbox" aria-labelledby={labelId}>
          {opciones.map((o, indice) => (
            <button
              key={o.value || '__vacio'}
              type="button"
              className={`select-option${o.value === props.value ? ' is-selected' : ''}${indice === indiceActivo ? ' is-active' : ''}`}
              role="option"
              aria-selected={o.value === props.value}
              title={o.label}
              onMouseEnter={() => setIndiceActivo(indice)}
              onClick={() => elegir(o.value)}
            >
              <span>{o.label}</span>
              {o.value === props.value && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>,
        document.body,
      )}
      <MensajeError id={errorId} mensaje={props.error} />
    </div>
  );
}

const normalizar = (texto: string) => texto
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleUpperCase('es-ES');

const formatoStock = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

/**
 * La bobina: escribe para buscar en las de RPS (mayor stock primero) o deja texto manual.
 *
 * Como la tela de los toldos (FabricCombobox y FabricStockLine), pero el nombre se lee entero: va
 * en un área de texto de una sola línea lógica que crece a dos o más renglones, y no en un
 * `input`, que cortaba «LONA NS86 2L 630 g/m² :GRI…» (Iván, 01/10/2026). Debajo, el código de la
 * bobina y su stock en RPS con los textos de toldos; `metrosTela` es lo que pide este elemento.
 */
export function CampoMaterial(props: {
  value: string; opciones: Material[]; onChange: (v: string) => void; span?: Rejilla; error?: string; metrosTela?: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const codigo = codigoStockMaterial(props.value, props.opciones);
  useAltoAjustado(area, props.value);
  const labelId = useId();
  const listaId = useId();
  const errorId = useId();
  const estiloMenu = useFloatingMenu(abierto, raiz, { maxHeight: 290, preferredWidth: 460 });
  const material = props.opciones.find((o) => o.nombre === props.value);
  const visibles = useMemo(() => {
    // Al abrir una bobina ya elegida se enseña el catálogo entero, para cambiarla al momento;
    // al escribir, se filtra por todas las palabras.
    const consulta = material ? '' : normalizar(props.value).trim();
    const palabras = consulta.split(/\s+/).filter(Boolean);
    return [...props.opciones]
      .filter((o) => {
        const texto = normalizar(`${o.nombre} ${o.codigoBobina}`);
        return palabras.every((palabra) => texto.includes(palabra));
      })
      .sort((a, b) => {
        const stockA = a.stockArzua == null ? Number.NEGATIVE_INFINITY : Number(a.stockArzua);
        const stockB = b.stockArzua == null ? Number.NEGATIVE_INFINITY : Number(b.stockArzua);
        return stockB - stockA || a.nombre.localeCompare(b.nombre, 'es');
      })
      .slice(0, 10);
  }, [material, props.opciones, props.value]);

  useEffect(() => {
    if (!abierto) return undefined;
    const cerrarFuera = (evento: PointerEvent) => {
      const destino = evento.target as Node;
      if (!raiz.current?.contains(destino) && !menu.current?.contains(destino)) setAbierto(false);
    };
    document.addEventListener('pointerdown', cerrarFuera);
    return () => document.removeEventListener('pointerdown', cerrarFuera);
  }, [abierto]);

  const elegir = (opcion: Material) => {
    props.onChange(opcion.nombre);
    setAbierto(false);
    setIndiceActivo(0);
  };

  const borrar = () => {
    props.onChange('');
    setIndiceActivo(0);
    setAbierto(true);
    area.current?.focus();
  };

  return (
    <div ref={raiz} className={`field fabric-combobox rem-campo rem-material${abierto ? ' is-open' : ''}${props.error ? ' is-invalido' : ''}${cols(props.span)}`}>
      <span id={labelId}>Material</span>
      <div className="fabric-input-wrap">
        <Search aria-hidden="true" />
        <textarea
          ref={area}
          rows={1}
          data-campo="material"
          name="material"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-labelledby={labelId}
          aria-autocomplete="list"
          aria-expanded={abierto}
          aria-controls={listaId}
          aria-invalid={Boolean(props.error)}
          aria-describedby={props.error ? errorId : undefined}
          aria-activedescendant={abierto && visibles[indiceActivo] ? `${listaId}-${indiceActivo}` : undefined}
          placeholder="Buscar color, RAL o bobina…"
          value={props.value}
          onFocus={() => setAbierto(true)}
          onChange={(evento) => {
            props.onChange(enUnRenglon(evento.target.value));
            setIndiceActivo(0);
            setAbierto(true);
          }}
          onKeyDown={(evento) => {
            // Intro nunca parte el nombre en dos: elige la opción resaltada o no hace nada.
            if (evento.key === 'Enter') evento.preventDefault();
            if (evento.key === 'Escape') setAbierto(false);
            if (evento.key === 'ArrowDown') {
              evento.preventDefault();
              setAbierto(true);
              setIndiceActivo((actual) => Math.min(actual + 1, visibles.length - 1));
            }
            if (evento.key === 'ArrowUp') {
              evento.preventDefault();
              setIndiceActivo((actual) => Math.max(actual - 1, 0));
            }
            if (evento.key === 'Enter' && abierto && visibles[indiceActivo]) elegir(visibles[indiceActivo]);
          }}
        />
        {props.value && (
          <button
            type="button"
            className="fabric-clear-button"
            aria-label="Borrar material"
            title="Borrar material"
            onPointerDown={(evento) => evento.preventDefault()}
            onClick={borrar}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>
      {abierto && createPortal(
        <div ref={menu} id={listaId} className="fabric-options fabric-options-portal" style={estiloMenu} role="listbox" aria-labelledby={labelId}>
          {visibles.length > 0 ? visibles.map((opcion, indice) => {
            const sinStock = opcion.stockArzua != null && opcion.stockArzua <= 0;
            return (
              <button
                id={`${listaId}-${indice}`}
                key={opcion.codigoBobina}
                type="button"
                className={`fabric-option${indice === indiceActivo ? ' is-active' : ''}`}
                role="option"
                aria-selected={opcion.nombre === props.value}
                onMouseDown={(evento) => evento.preventDefault()}
                onMouseEnter={() => setIndiceActivo(indice)}
                onClick={() => elegir(opcion)}
              >
                <span><strong>{opcion.nombre}</strong><small>{opcion.codigoBobina}</small></span>
                <span className={`fabric-option-meta${sinStock ? ' rem-sin-stock' : ''}`}>
                  {opcion.stockArzua == null ? 'Sin dato' : `Stock · ${formatoStock(Number(opcion.stockArzua))}`}
                  {opcion.nombre === props.value && <Check aria-hidden="true" />}
                </span>
              </button>
            );
          }) : (
            <div className="fabric-option-state">Sin coincidencias en RPS. Puedes conservar el texto como material manual.</div>
          )}
        </div>,
        document.body,
      )}
      <MensajeError id={errorId} mensaje={props.error} />
      {/* Sin código de RPS (texto manual) no hay stock que enseñar: nada. */}
      <FabricStockCodeLine code={codigo} neededMl={props.metrosTela ?? 0}
        prefix={<><strong className="rem-material-codigo">{codigo}</strong>{' · '}</>} />
    </div>
  );
}
