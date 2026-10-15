import React, { useEffect, useRef, useState } from 'react';
import { ajustarUnaLinea } from '../hoja/ajusteTexto';
import {
  Celda, Notas, NOTAS_TEXTO_ABAJO, NOTAS_TEXTO_LADO, PX_POR_PT, esperarImagenes, esperarLetra, pt, repartirObservaciones,
  sitio, textoError
} from './ayudasHoja';
import type { FilaAccesorio, FilaDespiece, HojaEstructuraDatos } from './tipos';

// Página de estructura A5 apaisada de cada toldo, impresa por Chromium en el servidor junto con las
// de telas. Las medidas van en pt y son las de la página de pdfkit (src/domain/planteamientoPdf.js,
// drawStructurePage y lo que usa), contadas desde arriba a la izquierda.

const ANCHO = 595.28;
const ALTO = 419.53;
const MARGEN = 14;

// Cabecera.
const LOGO_W = 58;
const CAB_X = MARGEN + LOGO_W;
const CAB_W = ANCHO - MARGEN - CAB_X;
const ETIQUETA_W = 64;
const VALOR_X = CAB_X + ETIQUETA_W;
const OF_W = 92;
const PEDIDO_W = 164;
const PEDIDO_X = ANCHO - MARGEN - PEDIDO_W;

// Cuerpo: despiece a la izquierda y los datos a la derecha.
const CUERPO_Y = 86;
const HUECO = 8;
const DERECHA_W = 164;
const IZQUIERDA_W = ANCHO - MARGEN * 2 - HUECO - DERECHA_W;
const DERECHA_X = MARGEN + IZQUIERDA_W + HUECO;
const ROTULO_W = 28;
const TABLA_X = MARGEN + ROTULO_W;
const TABLA_W = IZQUIERDA_W - ROTULO_W;
const CABECERA_TABLA_H = 14;
const NUM_W = 24;
const REFERENCIA_W = 91;
const UNIDADES_W = 34;
const LONGITUD_W = 38;
const NOMBRE_W = TABLA_W - NUM_W - REFERENCIA_W - UNIDADES_W - LONGITUD_W;
const BARRA_H = 13;
const HUECO_ANCLAJE = 9;
const PIE_H = 20;
const FILAS_MINIMAS = 6;
const ROTULO_ALTO_MINIMO = 58;

// Observaciones: debajo del anclaje; sin sitio, IRIS continúa en otra hoja y el resto usa la derecha.
const NOTAS_HUECO = 6;
const NOTAS_PIE = ALTO - 24;
const NOTAS_ALTO_MINIMO = 54;
const NOTAS_DERECHA_Y = 336;
const NOTAS_TEXTO_ARRIBA = 15.75;
const NOTAS_LINEA_H = 8.25;

// Columna derecha.
const VALIDO_Y = 155;
const DETALLES_Y = 209;
const TELA_Y = 283;
const FILA_TABLA = 13;

/**
 * Alto (pt) de cada fila del despiece. Reparte el alto que queda hasta el pie entre las filas del
 * despiece (seis como poco) y las `debajo`, que son las de accesorios y anclaje y llevan el mismo
 * alto. Con observaciones no pasa de 9,7 pt, para dejarles sitio; sin ellas crece hasta 17 (Iván, 03/10/2026: con despieces cortos quedaba un tercio de la columna en blanco).
 */
export function altoFilaDespiece(filas: number, conNotas: boolean, debajo = 4, conAnclaje = true): number {
  const barras = debajo > 0 ? BARRA_H + (conAnclaje ? BARRA_H + HUECO_ANCLAJE : 0) : 0;
  const libre = ALTO - PIE_H - CUERPO_Y - CABECERA_TABLA_H - barras;
  // A la centésima, para que cada fila empiece justo donde acaba la anterior.
  return Math.min(conNotas ? 9.7 : 17, Math.floor((libre / (Math.max(FILAS_MINIMAS, filas) + debajo)) * 100) / 100);
}

/** La letra de las filas crece con su alto, hasta 9,5 pt. */
const letraFila = (alto: number) => Math.min(9.5, alto * 0.68);

function Cabecera({ cabecera }: { cabecera: HojaEstructuraDatos['header'] }) {
  const mitad = CAB_W / 2;
  const detalle = ANCHO - MARGEN - VALOR_X;
  return (
    <>
      <Celda x={CAB_X} y={12} w={ETIQUETA_W} h={20} clase="telas-negrita telas-derecha estructura-cab-rotulo">OF:</Celda>
      <Celda x={VALOR_X} y={12} w={OF_W} h={20} clase="telas-amarillo telas-negrita telas-centro estructura-cab-numero" minima={8}>{cabecera.of}</Celda>
      <Celda x={VALOR_X + OF_W} y={12} w={PEDIDO_X - VALOR_X - OF_W} h={20} clase="telas-negrita telas-derecha estructura-cab-rotulo">Nº PEDIDO:</Celda>
      <Celda x={PEDIDO_X} y={12} w={PEDIDO_W} h={20} clase="telas-amarillo telas-negrita telas-centro estructura-cab-numero" minima={8}>{cabecera.orderCode}</Celda>

      <Celda x={CAB_X} y={32} w={ETIQUETA_W} h={12} clase="telas-cursiva estructura-cab-dato">CLIENTE:</Celda>
      <Celda x={VALOR_X} y={32} w={detalle} h={12} clase="telas-semi estructura-cab-dato" minima={5.5}>{cabecera.customer}</Celda>
      <Celda x={CAB_X} y={44} w={ETIQUETA_W} h={12} clase="telas-cursiva estructura-cab-dato">TÉCNICO:</Celda>
      <Celda x={VALOR_X} y={44} w={mitad - ETIQUETA_W} h={12} clase="telas-semi estructura-cab-dato" minima={5.5}>{cabecera.technician}</Celda>
      <Celda x={CAB_X + mitad} y={44} w={ETIQUETA_W} h={12} clase="telas-cursiva estructura-cab-dato">REVISOR:</Celda>
      <Celda x={VALOR_X + mitad} y={44} w={mitad - ETIQUETA_W} h={12} clase="telas-semi estructura-cab-dato" minima={5.5}>{cabecera.reviewer}</Celda>
      <Celda x={CAB_X} y={56} w={ETIQUETA_W} h={11} clase="telas-cursiva estructura-cab-dato">FECHA:</Celda>
      <Celda x={VALOR_X} y={56} w={detalle} h={11} clase="telas-semi estructura-cab-dato" minima={5.5}>{cabecera.date}</Celda>

      {/* La barra: la letra del toldo, el modelo centrado y el dispositivo sobre el ancho del pedido. */}
      <div className="estructura-barra-modelo" style={sitio(CAB_X, 67, CAB_W, 13)}>
        <span className="estructura-toldo" style={{ left: pt(7), width: pt(45) }}>{`TOLDO ${cabecera.letter}`}</span>
        <span className="estructura-modelo hoja-una-linea" data-letra-minima="6" style={{ left: pt(52), width: pt(CAB_W - PEDIDO_W - 52) }}>{cabecera.model}</span>
        <span className="estructura-dispositivo hoja-una-linea" data-letra-minima="5.5" style={{ left: pt(CAB_W - PEDIDO_W), width: pt(PEDIDO_W) }}>{cabecera.device}</span>
      </div>
      {/* Encima de las casillas, para que el marco redondeado no quede tapado por sus filetes. */}
      <div className="telas-logo estructura-logo" style={sitio(MARGEN, 12, LOGO_W, 68)}>
        <img src="/logo-tgm-planteamiento.png" alt="Toldos Gómez" />
      </div>
      <div className="telas-cabecera estructura-marco" style={sitio(MARGEN, 12, ANCHO - MARGEN * 2, 68)} />
    </>
  );
}

/** DATOS DE PARTIDA, DETALLES y DIMENSIONES TELA, como drawMiniTable. */
function Tabla({ y, titulo, filas, altoFila = FILA_TABLA, altoBarra = BARRA_H }: { y: number; titulo: string; filas: Array<[string, string]>; altoFila?: number; altoBarra?: number }) {
  // Ancho para que «COLOCACIÓN MÁQUINA» quepa con la misma letra que las etiquetas cortas.
  const etiquetaW = 80;
  return (
    <>
      {filas.map(([etiqueta, valor], indice) => (
        <React.Fragment key={`${etiqueta}-${indice}`}>
          <Celda x={DERECHA_X} y={y + altoBarra + indice * altoFila} w={etiquetaW} h={altoFila} clase="estructura-gris telas-negrita telas-centro estructura-tabla estructura-tabla-etiqueta" minima={5.5}>{etiqueta}</Celda>
          <Celda x={DERECHA_X + etiquetaW} y={y + altoBarra + indice * altoFila} w={DERECHA_W - etiquetaW} h={altoFila} clase="telas-semi telas-centro estructura-tabla" minima={5.5}>{valor}</Celda>
        </React.Fragment>
      ))}
      <Barra x={DERECHA_X} y={y} w={DERECHA_W} texto={titulo} alto={altoBarra} />
    </>
  );
}

function Barra({ x, y, w, texto, alto = BARRA_H }: { x: number; y: number; w: number; texto: string; alto?: number }) {
  return (
    <div className="estructura-barra" style={sitio(x, y, w, alto)}>
      <span className="telas-texto">{texto}</span>
    </div>
  );
}

function ColumnaDerecha({ datos }: { datos: HojaEstructuraDatos }) {
  if (datos.diagramBox) {
    const box = datos.diagramBox;
    return <>
      <Tabla y={CUERPO_Y} titulo="DATOS DE PARTIDA" filas={datos.partida} altoFila={10} altoBarra={11} />
      <div className={`estructura-valido estructura-valido-compacto ${datos.valid ? 'estructura-valido-si' : 'estructura-valido-no'}`} style={sitio(DERECHA_X, 130, DERECHA_W, 14)}>
        {datos.valid ? 'VÁLIDO' : 'REVISAR'}
      </div>
      <Tabla y={147} titulo="DETALLES" filas={datos.detalles} altoFila={10} altoBarra={11} />
      <Tabla y={201} titulo="DIMENSIONES TELA" filas={datos.tela} altoFila={10} altoBarra={11} />
      {/* El servidor encaja aquí el mismo escuadrado de pdfkit que lleva la hoja de telas. */}
      <div data-estructura-escuadrado="" style={sitio(box.x, box.y, box.width, box.height)} />
    </>;
  }
  // DETALLES tiene 74 pt hasta la tabla de tela: con más de cuatro filas, se estrechan.
  const altoDetalle = Math.min(11, (TELA_Y - DETALLES_Y - BARRA_H - 4) / Math.max(1, datos.detalles.length));
  return (
    <>
      <Tabla y={CUERPO_Y} titulo="DATOS DE PARTIDA" filas={datos.partida} />
      <div className={`estructura-valido ${datos.valid ? 'estructura-valido-si' : 'estructura-valido-no'}`} style={sitio(DERECHA_X, VALIDO_Y, DERECHA_W, 43)}>
        {datos.valid ? 'VÁLIDO' : 'REVISAR'}
      </div>
      <Tabla y={DETALLES_Y} titulo="DETALLES" filas={datos.detalles} altoFila={altoDetalle} />
      <Tabla y={TELA_Y} titulo="DIMENSIONES TELA" filas={datos.tela} />
    </>
  );
}

// Título, dónde empieza, ancho y, en las columnas estrechas, la letra mínima a la que puede bajar.
const TITULOS_DESPIECE: Array<[string, number, number, number?]> = [
  ['NUM', TABLA_X, NUM_W],
  ['NOMBRE PIEZA', TABLA_X + NUM_W, NOMBRE_W],
  ['REFERENCIA', TABLA_X + NUM_W + NOMBRE_W, REFERENCIA_W],
  ['UNIDADES', TABLA_X + TABLA_W - LONGITUD_W - UNIDADES_W, UNIDADES_W, 5],
  ['LONGITUD', TABLA_X + TABLA_W - LONGITUD_W, LONGITUD_W, 5]
];

function Despiece({ filas, alto }: { filas: FilaDespiece[]; alto: number }) {
  const letra = { fontSize: pt(letraFila(alto)) };
  return (
    <>
      {/* En la última página de un despiece largo pueden quedar dos filas: ahí el rótulo no cabe y no se pinta. */}
      {alto * filas.length >= ROTULO_ALTO_MINIMO && (
        <div className="estructura-rotulo" style={sitio(MARGEN, CUERPO_Y + CABECERA_TABLA_H, ROTULO_W, alto * filas.length)}>
          <span>DESPIECE</span>
        </div>
      )}
      <div className="estructura-filas" style={letra}>
        {filas.map((fila, indice) => {
          const y = CUERPO_Y + CABECERA_TABLA_H + indice * alto;
          const fondo = indice % 2 ? '' : ' estructura-suave';
          return (
            <React.Fragment key={indice}>
              <Celda x={TABLA_X} y={y} w={NUM_W} h={alto} clase={`telas-centro${fondo}`}>{fila.num}</Celda>
              <Celda x={TABLA_X + NUM_W} y={y} w={NOMBRE_W} h={alto} clase={`telas-centro${fondo}${fila.bold ? ' telas-negrita' : ''}`} minima={4.5}>{fila.name}</Celda>
              <Celda x={TABLA_X + NUM_W + NOMBRE_W} y={y} w={REFERENCIA_W} h={alto} clase={fondo.trim()} minima={4.5}>{fila.reference}</Celda>
              <Celda x={TABLA_X + TABLA_W - LONGITUD_W - UNIDADES_W} y={y} w={UNIDADES_W} h={alto} clase={`telas-centro${fondo}`}>{fila.units}</Celda>
              <Celda x={TABLA_X + TABLA_W - LONGITUD_W} y={y} w={LONGITUD_W} h={alto} clase={`telas-centro${fondo}`} minima={4.5}>{fila.length}</Celda>
            </React.Fragment>
          );
        })}
      </div>
      {TITULOS_DESPIECE.map(([titulo, x, ancho, minima]) => (
        <Celda key={titulo} x={x} y={CUERPO_Y} w={ancho} h={CABECERA_TABLA_H} minima={minima}
          clase={`estructura-titulo telas-negrita telas-centro${minima ? ' estructura-titulo-estrecho' : ''}`}>{titulo}</Celda>
      ))}
    </>
  );
}

/** Una fila de accesorios o de anclaje: sin número, el nombre ocupa también ese hueco. */
function FilaSuelta({ fila, y, alto, accesorio }: { fila: FilaAccesorio; y: number; alto: number; accesorio?: boolean }) {
  const nombreW = TABLA_W - REFERENCIA_W - UNIDADES_W;
  return (
    <div className="estructura-fila-suelta" data-accesorio={accesorio ? '' : undefined}>
      <Celda x={TABLA_X} y={y} w={nombreW} h={alto} clase="telas-centro" minima={4.5}>{fila.name}</Celda>
      <Celda x={TABLA_X + nombreW} y={y} w={REFERENCIA_W} h={alto} minima={4.5}>{fila.reference}</Celda>
      <Celda x={TABLA_X + nombreW + REFERENCIA_W} y={y} w={UNIDADES_W} h={alto} clase="telas-centro">{fila.units}</Celda>
    </div>
  );
}

const SIN_ACCESORIOS: FilaAccesorio[] = [{ name: '—', reference: '—', units: '—' }];
const FILA_VACIA = { name: '—', reference: '—', units: '—', length: '—', bold: false };

function Pie({ texto }: { texto: string }) {
  return <div className="telas-pie" style={{ left: pt(MARGEN), top: pt(ALTO - 15), width: pt(ANCHO - MARGEN * 2) }}>{texto}</div>;
}

/** Cómo queda cada página del despiece: sus filas, su alto y, en la última, lo que va debajo. */
export function repartirDespiece(datos: HojaEstructuraDatos, altoNotas = NOTAS_TEXTO_ARRIBA + NOTAS_TEXTO_ABAJO + datos.notes.trim().split('\n').length * NOTAS_LINEA_H) {
  const porPagina = Math.max(1, datos.rowsPerPage);
  const conNotas = Boolean(datos.notes.trim());
  const accesorios = datos.accessories.length > 0 ? datos.accessories : SIN_ACCESORIOS;
  const anclaje = datos.anchoring && datos.anchoring.name.trim().toUpperCase() !== 'NO INDICADO'
    && /[^\s—-]/.test(datos.anchoring.reference) ? datos.anchoring : null;
  const total = Math.max(1, Math.ceil(datos.despiece.length / porPagina));
  return Array.from({ length: total }, (_, pagina) => {
    const ultima = pagina === total - 1;
    let filas = datos.despiece.slice(pagina * porPagina, (pagina + 1) * porPagina);
    // Con muy pocas piezas la tabla se completa hasta seis filas, como siempre.
    if (total === 1) {
      filas = [...filas, ...Array.from({ length: Math.max(0, FILAS_MINIMAS - filas.length) }, (_, i) => ({ ...FILA_VACIA, num: String(filas.length + i + 1) }))];
    }
    let alto = altoFilaDespiece(filas.length, conNotas, ultima ? accesorios.length + Number(Boolean(anclaje)) : 0, Boolean(anclaje));
    if (ultima && datos.diagramBox && conNotas) {
      const barras = BARRA_H + (anclaje ? HUECO_ANCLAJE + BARRA_H : 0);
      const libre = NOTAS_PIE - CUERPO_Y - CABECERA_TABLA_H - barras - NOTAS_HUECO - altoNotas;
      alto = Math.max(8, Math.min(alto, Math.floor(libre / (filas.length + accesorios.length + Number(Boolean(anclaje))) * 100) / 100));
    }
    const accesoriosY = CUERPO_Y + CABECERA_TABLA_H + alto * filas.length;
    const anclajeY = accesoriosY + BARRA_H + alto * accesorios.length + HUECO_ANCLAJE;
    const notasY = (anclaje ? anclajeY + BARRA_H + alto : accesoriosY + BARRA_H + alto * accesorios.length) + NOTAS_HUECO;
    // IRIS reserva la derecha al dibujo y ajusta el recuadro a las líneas medidas.
    const notas = datos.diagramBox || NOTAS_PIE - notasY >= NOTAS_ALTO_MINIMO
      ? { x: MARGEN, y: Math.min(notasY, NOTAS_PIE), w: IZQUIERDA_W, h: Math.max(0, Math.min(NOTAS_PIE - notasY, datos.diagramBox && conNotas ? altoNotas : Infinity)) }
      : { x: DERECHA_X, y: NOTAS_DERECHA_Y, w: DERECHA_W, h: NOTAS_PIE - NOTAS_DERECHA_Y };
    const pie = total > 1 ? `${datos.footer} · ${pagina + 1}/${total}` : datos.footer;
    return { filas, alto, ultima, accesorios, accesoriosY, anclajeY, anclaje, notas, pie };
  });
}

type PaginaDespiece = ReturnType<typeof repartirDespiece>[number];

function Pagina({ datos, pagina, lineas, refNotas }: {
  datos: HojaEstructuraDatos; pagina: PaginaDespiece; lineas: string[] | null; refNotas: React.Ref<HTMLDivElement>;
}) {
  const { filas, alto, ultima, accesorios, accesoriosY, anclajeY, notas } = pagina;
  const texto = datos.notes.trim();
  return (
    <section className="estructura-pagina">
      <Cabecera cabecera={datos.header} />
      <Despiece filas={filas} alto={alto} />
      {ultima && (
        <div className="estructura-filas" style={{ fontSize: pt(letraFila(alto)) }}>
          {accesorios.map((fila, indice) => <FilaSuelta key={indice} fila={fila} y={accesoriosY + BARRA_H + indice * alto} alto={alto} accesorio />)}
          <Barra x={TABLA_X} y={accesoriosY} w={TABLA_W} texto="ELEMENTOS ACCESORIOS" />
          {pagina.anclaje && <>
            <FilaSuelta fila={pagina.anclaje} y={anclajeY + BARRA_H} alto={alto} />
            <Barra x={TABLA_X} y={anclajeY} w={TABLA_W} texto="SISTEMA DE ANCLAJE" />
          </>}
        </div>
      )}
      <ColumnaDerecha datos={datos} />
      {ultima && texto && (!datos.diagramBox || notas.h >= NOTAS_TEXTO_ARRIBA + NOTAS_TEXTO_ABAJO + NOTAS_LINEA_H) && (
        <Notas {...notas} titulo="OBSERVACIONES" texto={texto} lineas={lineas} refTexto={refNotas}
          arriba={NOTAS_TEXTO_ARRIBA} clase="estructura-notas" />
      )}
      <Pie texto={pagina.pie} />
    </section>
  );
}

const CONTINUACION_H = NOTAS_PIE - CUERPO_Y;

function PaginaContinuacion({ datos, lineas }: { datos: HojaEstructuraDatos; lineas: string[] }) {
  return (
    <section className="estructura-pagina">
      <Cabecera cabecera={datos.header} />
      <Notas x={MARGEN} y={CUERPO_Y} w={ANCHO - MARGEN * 2} h={CONTINUACION_H}
        titulo="Observaciones (continuación)" texto="" lineas={lineas} arriba={NOTAS_TEXTO_ARRIBA} clase="estructura-notas" />
      <Pie texto={`Toldo ${datos.header.letter} · Observaciones (continuación)`} />
    </section>
  );
}

/**
 * La página de estructura de un toldo: las del despiece (una, o varias si es muy largo) y, si las
 * observaciones no caben en su recuadro, sus páginas de continuación. Mismo trato que HojaTelas:
 * con la letra cargada ajusta los textos de una línea, reparte las observaciones midiéndolas y,
 * con todo pintado, avisa con `onLista`.
 */
export function HojaEstructura({ datos, onLista, onError }: {
  datos: HojaEstructuraDatos;
  onLista: () => void;
  onError: (mensaje: string) => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const medidor = useRef<HTMLDivElement>(null);
  const cajaNotas = useRef<HTMLDivElement>(null);
  // null mientras no se han medido; luego, las líneas de cada página (vacío si no hay notas).
  const [paginasNotas, setPaginasNotas] = useState<string[][] | null>(null);
  const [altoNotas, setAltoNotas] = useState<number | undefined>(undefined);
  const paginas = repartirDespiece(datos, altoNotas);

  useEffect(() => {
    let vigente = true;
    esperarLetra().then(() => {
      if (!vigente || !raiz.current) return;
      ajustarUnaLinea(raiz.current);
      const notas = datos.notes.trim();
      const continuacion = { ancho: ANCHO - MARGEN * 2 - NOTAS_TEXTO_LADO * 2, alto: (CONTINUACION_H - NOTAS_TEXTO_ARRIBA - NOTAS_TEXTO_ABAJO) * PX_POR_PT };
      let medido: number | undefined;
      if (notas && medidor.current && datos.diagramBox) {
        const todas = repartirObservaciones(medidor.current, notas,
          { ancho: IZQUIERDA_W - NOTAS_TEXTO_LADO * 2, alto: Infinity }, continuacion)[0];
        medidor.current.textContent = 'Ág';
        medido = NOTAS_TEXTO_ARRIBA + NOTAS_TEXTO_ABAJO + todas.length * medidor.current.getBoundingClientRect().height / PX_POR_PT;
        medidor.current.textContent = '';
      }
      setAltoNotas(medido);
      const caja = repartirDespiece(datos, medido).at(-1)!.notas;
      if (notas && medidor.current && datos.diagramBox && caja.h < NOTAS_TEXTO_ARRIBA + NOTAS_TEXTO_ABAJO + NOTAS_LINEA_H) {
        setPaginasNotas([[], ...repartirObservaciones(medidor.current, notas, continuacion, continuacion)]);
        return;
      }
      setPaginasNotas(notas && medidor.current
        ? repartirObservaciones(medidor.current, notas,
          { ancho: caja.w - NOTAS_TEXTO_LADO * 2, alto: datos.diagramBox ? (caja.h - NOTAS_TEXTO_ARRIBA - NOTAS_TEXTO_ABAJO) * PX_POR_PT + 0.01 : cajaNotas.current?.clientHeight ?? 0 },
          continuacion)
        : []);
    }).catch((error: unknown) => { if (vigente) onError(textoError(error)); });
    return () => { vigente = false; };
  }, [datos, onError]);

  useEffect(() => {
    if (paginasNotas === null || !raiz.current) return;
    let vigente = true;
    // Las páginas de continuación acaban de salir: sus cabeceras también van en una línea.
    ajustarUnaLinea(raiz.current);
    esperarImagenes(raiz.current).then(() => { if (vigente) onLista(); }, (error: unknown) => { if (vigente) onError(textoError(error)); });
    return () => { vigente = false; };
  }, [paginasNotas, onLista, onError]);

  return (
    <div ref={raiz} data-hoja-telas="">
      {paginas.map((pagina, indice) => (
        <Pagina key={indice} datos={datos} pagina={pagina} lineas={paginasNotas?.[0] ?? null} refNotas={cajaNotas} />
      ))}
      {(paginasNotas ?? []).slice(1).map((lineas, indice) => <PaginaContinuacion key={`n${indice}`} datos={datos} lineas={lineas} />)}
      <div className="telas-medidor estructura-medidor" ref={medidor} aria-hidden="true" />
    </div>
  );
}
