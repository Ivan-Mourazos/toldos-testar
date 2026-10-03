import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ajustarUnaLinea } from '../hoja/ajusteTexto';
import { ajustarDosLineas } from './ajusteDosLineas';
import {
  Celda, Notas, NOTAS_TEXTO_ABAJO, NOTAS_TEXTO_ARRIBA, NOTAS_TEXTO_LADO, PX_POR_PT, esperarImagenes, esperarLetra, pt,
  repartirObservaciones, sitio, textoError as texto
} from './ayudasHoja';
import { HojaEstructura } from './HojaEstructura';
import type { FilaHojaTelas, HojaPlanteamiento, HojaTelasDatos } from './tipos';

// Página de telas A4 apaisada del planteamiento de toldos, impresa por Chromium en el servidor.
// Todas las medidas van en pt y son las de la página de pdfkit (src/domain/planteamientoPdf.js,
// drawFabricHeader y drawExcelFabricBody), contadas desde arriba a la izquierda: así la hoja
// impresa coincide punto por punto y el dibujo de confección encaja en su recuadro.

const ANCHO = 841.89;
const ALTO = 595.28;
const MARGEN = 24;
const EXTERIOR_Y = 114;
const EXTERIOR_PIE = ALTO - 32;
const TOTAL_Y = EXTERIOR_PIE - 51;
const FILAS_Y = 214;
const HUECO_FILAS = 9;

// Cabecera, como la de estructura: logo, «OF:» y «Nº PEDIDO:» arriba, y la barra con el título.
const LOGO_W = 96;
const CUERPO_X = MARGEN + LOGO_W;
const PEDIDO_W = 166;
const PEDIDO_X = ANCHO - MARGEN - PEDIDO_W;
const ETIQUETA_W = 76;
const VALOR_X = CUERPO_X + ETIQUETA_W;
const OF_W = 130;

// Columna de la derecha.
const CONTENIDO_X = MARGEN + 270;
const CONTENIDO_W = ANCHO - MARGEN - 12 - CONTENIDO_X;
const ROTULACION_W = 170;
const HUECO_TABLAS = 14;
const LETRA_W = 54;
const MEDIDAS_X = CONTENIDO_X + LETRA_W + 10;
const MEDIDAS_W = CONTENIDO_W - LETRA_W - 10;
const UNIDADES_W = 66;
const HUECO_MEDIDAS = 13;
const MEDIDA_W = (MEDIDAS_W - UNIDADES_W - HUECO_MEDIDAS * 2) / 2;
const TOTAL_ETIQUETA_W = 250;

// Observaciones: en la primera, debajo del dibujo; en las de continuación, la página entera.
const NOTAS_X = 36;
const NOTAS_W = 242;
const NOTAS_Y = 456;
const NOTAS_PIE = EXTERIOR_PIE - 10;
const CONTINUACION_W = ANCHO - MARGEN * 2;

/** Alto de cada fila de toldo: con pocas filas crecen, hasta 90 pt; con muchas no bajan de 62. */
export function altoFila(filas: number): number {
  return Math.min(90, Math.max(62, (TOTAL_Y - FILAS_Y) / Math.max(1, filas) - HUECO_FILAS));
}

function Cabecera({ cabecera }: { cabecera: HojaTelasDatos['header'] }) {
  const mitad = (ANCHO - MARGEN - CUERPO_X) / 2;
  const detalle = ANCHO - MARGEN - VALOR_X;
  return (
    <>
      <div className="telas-cabecera" style={sitio(MARGEN, 18, ANCHO - MARGEN * 2, 88)} />
      <div className="telas-logo" style={sitio(MARGEN, 18, LOGO_W, 88)}>
        <img src="/logo-tgm-planteamiento.png" alt="Toldos Gómez" />
      </div>
      <Celda x={CUERPO_X} y={18} w={ETIQUETA_W} h={26} clase="telas-negrita telas-derecha telas-cab-rotulo">OF:</Celda>
      <Celda x={VALOR_X} y={18} w={OF_W} h={26} clase="telas-amarillo telas-negrita telas-centro telas-cab-numero" minima={9}>{cabecera.of}</Celda>
      <Celda x={VALOR_X + OF_W} y={18} w={PEDIDO_X - VALOR_X - OF_W} h={26} clase="telas-negrita telas-derecha telas-cab-rotulo">Nº PEDIDO:</Celda>
      <Celda x={PEDIDO_X} y={18} w={PEDIDO_W} h={26} clase="telas-amarillo telas-negrita telas-centro telas-cab-numero" minima={11}>{cabecera.orderCode}</Celda>

      <Celda x={CUERPO_X} y={44} w={ETIQUETA_W} h={15} clase="telas-cursiva telas-cab-etiqueta">CLIENTE:</Celda>
      <Celda x={VALOR_X} y={44} w={detalle} h={15} clase="telas-semi telas-cab-valor" minima={7}>{cabecera.customer}</Celda>
      <Celda x={CUERPO_X} y={59} w={ETIQUETA_W} h={15} clase="telas-cursiva telas-cab-etiqueta">TÉCNICO:</Celda>
      <Celda x={VALOR_X} y={59} w={mitad - ETIQUETA_W} h={15} clase="telas-semi telas-cab-valor" minima={7}>{cabecera.technician}</Celda>
      <Celda x={CUERPO_X + mitad} y={59} w={ETIQUETA_W} h={15} clase="telas-cursiva telas-cab-etiqueta">REVISOR:</Celda>
      <Celda x={VALOR_X + mitad} y={59} w={mitad - ETIQUETA_W} h={15} clase="telas-semi telas-cab-valor" minima={7}>{cabecera.reviewer}</Celda>
      <Celda x={CUERPO_X} y={74} w={ETIQUETA_W} h={14} clase="telas-cursiva telas-cab-etiqueta">FECHA:</Celda>
      <Celda x={VALOR_X} y={74} w={detalle} h={14} clase="telas-semi telas-cab-valor" minima={7}>{cabecera.date}</Celda>

      <div className="telas-barra" style={sitio(CUERPO_X, 88, ANCHO - MARGEN - CUERPO_X, 18)}>
        <span className="telas-texto hoja-una-linea" data-letra-minima="10">{cabecera.title}</span>
      </div>
    </>
  );
}

/** ROTULACIÓN y DATOS BÁSICOS, como drawMiniTable con las opciones de la página de telas. */
function Tabla({ x, w, titulo, filas, letraValor }: {
  x: number; w: number; titulo: string; filas: Array<[string, string, number]>; letraValor: string;
}) {
  const etiquetaW = Math.min(84, w * 0.43);
  return (
    <>
      <div className="telas-tabla-titulo" style={sitio(x, 123, w, 17)}><span className="telas-texto">{titulo}</span></div>
      {filas.map(([etiqueta, valor, minima], indice) => (
        <React.Fragment key={etiqueta}>
          <Celda x={x} y={140 + indice * 20} w={etiquetaW} h={20} clase="telas-gris telas-negrita telas-centro telas-tabla-etiqueta" minima={6}>{etiqueta}</Celda>
          <Celda x={x + etiquetaW} y={140 + indice * 20} w={w - etiquetaW} h={20} clase={`telas-semi telas-centro ${letraValor}`} minima={minima}>{valor}</Celda>
        </React.Fragment>
      ))}
    </>
  );
}

function Medida({ x, y, w, h, etiqueta, valor }: { x: number; y: number; w: number; h: number; etiqueta: string; valor: string }) {
  const etiquetaW = Math.round(w * 0.48);
  return (
    <>
      <Celda x={x} y={y} w={etiquetaW} h={h} clase="telas-gris telas-centro telas-medida-etiqueta" minima={7}>{etiqueta}</Celda>
      <Celda x={x + etiquetaW} y={y} w={w - etiquetaW} h={h} clase="telas-negrita telas-centro telas-medida-valor" minima={9}>{valor}</Celda>
    </>
  );
}

function Fila({ fila, y, h }: { fila: FilaHojaTelas; y: number; h: number }) {
  // Como en pdfkit (62 pt: dos medias de 29), las dos líneas reparten el alto menos 4 pt.
  const media = (h - 4) / 2;
  return (
    <>
      <div className="telas-letra" style={sitio(CONTENIDO_X, y, LETRA_W, h)}><span className="telas-texto">{fila.letter}</span></div>
      <Medida x={MEDIDAS_X} y={y} w={MEDIDA_W} h={media} etiqueta="TELA" valor={fila.fabricWidth} />
      <Medida x={MEDIDAS_X + MEDIDA_W + HUECO_MEDIDAS} y={y} w={MEDIDA_W} h={media} etiqueta={fila.dropLabel} valor={fila.fabricDrop} />
      <Medida x={MEDIDAS_X + MEDIDA_W * 2 + HUECO_MEDIDAS * 2} y={y} w={UNIDADES_W} h={media} etiqueta="UN." valor={fila.units} />
      {/* La instrucción no pierde texto: dos líneas, letra hasta 7 pt y, si ni así, el aviso. Vacía, en blanco. */}
      <div className="telas-celda telas-semi telas-centro telas-instruccion" style={sitio(MEDIDAS_X, y + media, MEDIDAS_W, media)}>
        <span className="telas-dos-lineas" data-letra-minima="7">{fila.line.trim()}</span>
      </div>
    </>
  );
}

function Pie({ texto }: { texto: string }) {
  return <div className="telas-pie" style={{ left: pt(MARGEN), top: pt(ALTO - 15), width: pt(ANCHO - MARGEN * 2) }}>{texto}</div>;
}

function PrimeraPagina({ datos, lineas, refNotas }: { datos: HojaTelasDatos; lineas: string[] | null; refNotas: React.Ref<HTMLDivElement> }) {
  const h = altoFila(datos.rows.length);
  const datosW = CONTENIDO_W - ROTULACION_W - HUECO_TABLAS;
  return (
    <section className="telas-pagina">
      <Cabecera cabecera={datos.header} />
      <div className="telas-exterior" style={sitio(MARGEN, EXTERIOR_Y, ANCHO - MARGEN * 2, EXTERIOR_PIE - EXTERIOR_Y)} />

      <Celda x={36} y={123} w={242} h={21} clase="telas-negrita telas-centro telas-dibujo-titulo" minima={9}>{datos.diagramTitle}</Celda>
      {/* Vacío a propósito: el servidor encaja aquí el dibujo de confección de pdfkit. */}
      <div className="telas-dibujo" style={{ left: '36pt', top: '149pt', width: '242pt', height: '300pt' }}></div>
      {datos.notes.trim() && (
        <Notas x={NOTAS_X} y={NOTAS_Y} w={NOTAS_W} h={NOTAS_PIE - NOTAS_Y} titulo="OBSERVACIONES"
          texto={datos.notes.trim()} lineas={lineas} refTexto={refNotas} />
      )}

      <Tabla x={CONTENIDO_X} w={ROTULACION_W} titulo="ROTULACIÓN" letraValor="telas-tabla-valor"
        filas={[['TELA', datos.rotulacion.tela, 6], ['BAMBA', datos.rotulacion.bamba, 6]]} />
      <Tabla x={CONTENIDO_X + ROTULACION_W + HUECO_TABLAS} w={datosW} titulo="DATOS BÁSICOS" letraValor="telas-tabla-valor-grande"
        filas={[['MATERIAL', datos.datos.material, 7], ['CURVA', datos.datos.curva, 6], ['REMATE', datos.datos.remate, 6]]} />

      {datos.rows.map((fila, indice) => (
        <Fila key={`${fila.letter}-${indice}`} fila={fila} y={FILAS_Y + indice * (h + HUECO_FILAS)} h={h} />
      ))}

      <div className="telas-total-rotulo" style={sitio(CONTENIDO_X, TOTAL_Y, TOTAL_ETIQUETA_W, 42)}>
        <span className="telas-total-tela hoja-una-linea" data-letra-minima="7">{datos.total.label}</span>
        <span className="telas-total-texto">PAÑO TOTAL NECESARIO</span>
      </div>
      <Celda x={CONTENIDO_X + TOTAL_ETIQUETA_W} y={TOTAL_Y} w={CONTENIDO_W - TOTAL_ETIQUETA_W} h={42} clase="telas-total-cifra telas-negrita telas-derecha">{datos.total.amount}</Celda>

      <Pie texto={datos.footer} />
    </section>
  );
}

function PaginaContinuacion({ datos, lineas }: { datos: HojaTelasDatos; lineas: string[] }) {
  return (
    <section className="telas-pagina">
      <Cabecera cabecera={datos.header} />
      <Notas x={MARGEN} y={EXTERIOR_Y} w={CONTINUACION_W} h={EXTERIOR_PIE - EXTERIOR_Y}
        titulo="Observaciones (continuación)" texto="" lineas={lineas} />
      <Pie texto={`${datos.footer} · Observaciones (continuación)`} />
    </section>
  );
}

/**
 * La página de telas y, si las observaciones no caben debajo del dibujo, sus páginas de
 * continuación. Con la letra cargada ajusta los textos de una línea, reparte las observaciones
 * midiéndolas y, con todo pintado, avisa con `onLista`.
 */
export function HojaTelas({ datos, onLista, onError }: {
  datos: HojaTelasDatos;
  onLista: () => void;
  onError: (mensaje: string) => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const medidor = useRef<HTMLDivElement>(null);
  const cajaNotas = useRef<HTMLDivElement>(null);
  // null mientras no se han medido; luego, las líneas de cada página (vacío si no hay notas).
  const [paginasNotas, setPaginasNotas] = useState<string[][] | null>(null);

  useEffect(() => {
    let vigente = true;
    esperarLetra().then(() => {
      if (!vigente || !raiz.current) return;
      ajustarUnaLinea(raiz.current);
      ajustarDosLineas(raiz.current);
      const notas = datos.notes.trim();
      setPaginasNotas(notas && medidor.current && cajaNotas.current
        ? repartirObservaciones(medidor.current, notas,
          { ancho: NOTAS_W - NOTAS_TEXTO_LADO * 2, alto: cajaNotas.current.clientHeight },
          { ancho: CONTINUACION_W - NOTAS_TEXTO_LADO * 2, alto: (EXTERIOR_PIE - EXTERIOR_Y - NOTAS_TEXTO_ARRIBA - NOTAS_TEXTO_ABAJO) * PX_POR_PT })
        : []);
    }).catch((error: unknown) => { if (vigente) onError(texto(error)); });
    return () => { vigente = false; };
  }, [datos, onError]);

  useEffect(() => {
    if (paginasNotas === null || !raiz.current) return;
    let vigente = true;
    // Las páginas de continuación acaban de salir: sus cabeceras también van en una línea.
    ajustarUnaLinea(raiz.current);
    esperarImagenes(raiz.current).then(() => { if (vigente) onLista(); }, (error: unknown) => { if (vigente) onError(texto(error)); });
    return () => { vigente = false; };
  }, [paginasNotas, onLista, onError]);

  return (
    <div ref={raiz} data-hoja-telas="">
      <PrimeraPagina datos={datos} lineas={paginasNotas?.[0] ?? null} refNotas={cajaNotas} />
      {(paginasNotas ?? []).slice(1).map((lineas, indice) => <PaginaContinuacion key={indice} datos={datos} lineas={lineas} />)}
      <div className="telas-medidor" ref={medidor} aria-hidden="true" />
    </div>
  );
}

/** Cuántas páginas ocupa cada hoja pintada dentro de `raiz`, en orden. */
export function contarPaginas(raiz: ParentNode): number[] {
  return Array.from(raiz.querySelectorAll('[data-hoja-telas]'), (hoja) => hoja.querySelectorAll('.telas-pagina, .estructura-pagina').length);
}

/**
 * Todas las hojas del PDF seguidas (las de estructura, A5, y las de telas, A4), para que Chromium
 * las imprima de una vez. Cuando
 * todas están listas avisa con `onLista` y las páginas de cada una (las observaciones largas
 * añaden páginas), que el servidor necesita para poner cada hoja en su sitio.
 */
export function HojasTelas({ hojas, onLista, onError }: {
  hojas: HojaPlanteamiento[];
  onLista: (paginas: number[]) => void;
  onError: (mensaje: string) => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  // Un aviso fijo por hoja: cada hoja lo tiene en las dependencias de su efecto.
  const avisos = useMemo(() => {
    const listas = new Set<number>();
    return hojas.map((_, indice) => () => {
      listas.add(indice);
      if (listas.size === hojas.length && raiz.current) onLista(contarPaginas(raiz.current));
    });
  }, [hojas, onLista]);

  return (
    <div ref={raiz}>
      {hojas.map((datos, indice) => (datos.kind === 'estructura'
        ? <HojaEstructura key={`e${datos.structureIndex}-${indice}`} datos={datos} onLista={avisos[indice]} onError={onError} />
        : <HojaTelas key={`${datos.planIndex}-${indice}`} datos={datos} onLista={avisos[indice]} onError={onError} />
      ))}
    </div>
  );
}
