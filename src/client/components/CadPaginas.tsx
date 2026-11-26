import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Scissors,
  X
} from 'lucide-react';
import type { DraftState } from '../types';
import type { EstadoCorte } from '../corteLona';
import { CORTE_NO_REGENERADO } from '../../toldosEditable.js';
import { CabeceraDocumento } from './DocumentosPedido';
import { CorteLona, toldosConCorte } from './CorteLona';
import { CortesDelPlano, type CorteDelPlanoCliente } from './CortesDelPlano';
import { PdfPreviewToolbar, type PdfZoom } from './PdfPreviewToolbar';
import '../coordina/cad-paginas.css';

export interface PaginaCadCliente {
  nombre: string;
  archivo: string;
  anchoMm: number;
  altoMm: number;
  svg: string;
  sinDibujar?: Record<string, number>;
}

export interface RespuestaCadPaginasCliente {
  ok: true;
  orderCode: string;
  tieneDwg: boolean;
  origen: 'revisado' | 'borrador' | 'web' | null;
  actualizado: boolean;
  motivoDesactualizado: string | null;
  letrasCambiadas: boolean;
  pendientes: Array<{ id?: string; letra: string; of?: string; modelo: string; motivo: string }>;
  modificadoAMano: boolean;
  archivosModificadosAMano: string[];
  ficheros: Array<{ filename: string; mtimeMs: number; size: number }>;
  paginas: PaginaCadCliente[];
  /** Solo lo de dentro de cada recuadro CORTE, para la pestaña Corte. */
  cortes?: CorteDelPlanoCliente[];
  cacheado: boolean;
}

// 96 dpi -> ~3.78 px por mm; una A4 (297 x 210 mm) mide ~1122 x 794 px al 100 %.
const PX_POR_MM = 96 / 25.4;

export function CadPaginas({
  orderCode,
  order,
  producto,
  rutaCad,
  sinDwg,
  estado = null,
  version = '',
  noRegenerado = false,
  dwgGuardado = false,
  generarArriba = false,
  regenerable = false,
  onListo,
  onActualizarCorte,
  actualizando = false,
  datosIniciales = null,
  enModal = false,
  heading,
  actions
}: {
  orderCode: string;
  order?: DraftState;
  producto?: 'toldos' | 'remolques' | 'puertas';
  rutaCad?: string;
  sinDwg?: React.ReactNode;
  estado?: EstadoCorte | null;
  version?: string;
  noRegenerado?: boolean;
  dwgGuardado?: boolean;
  generarArriba?: boolean;
  regenerable?: boolean;
  onListo?: (falta: string | null) => void;
  onActualizarCorte?: () => Promise<void> | void;
  actualizando?: boolean;
  datosIniciales?: RespuestaCadPaginasCliente | null;
  enModal?: boolean;
  heading?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const toldos = order ? toldosConCorte(order) : [];
  const codigo = encodeURIComponent(orderCode);
  const origenCad = rutaCad ?? (producto && producto !== 'toldos'
    ? `/api/${producto}/pedidos/${codigo}/cad-paginas` : `/api/reviews/${codigo}/cad-paginas`);
  const requerido = Boolean(producto && producto !== 'toldos' || rutaCad || toldos.length || dwgGuardado || datosIniciales?.tieneDwg);

  const [datos, setDatos] = useState<RespuestaCadPaginasCliente | null>(datosIniciales);
  const [cargando, setCargando] = useState(!datosIniciales && Boolean(orderCode.trim()));
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const [actualizandoLocal, setActualizandoLocal] = useState(false);
  const [indicePagina, setIndicePagina] = useState(0);
  const [zoom, setZoom] = useState<PdfZoom>('height');
  const [ampliado, setAmpliado] = useState(false);
  const [tamanoEscenario, setTamanoEscenario] = useState({ width: 0, height: 0 });

  const dialogoRef = useRef<HTMLDialogElement>(null);
  const abrirRef = useRef<HTMLButtonElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const escenarioRef = useRef<HTMLDivElement>(null);
  const raizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!requerido || !orderCode.trim()) return;
    if (datosIniciales && intento === 0) return;
    const controller = new AbortController();
    let activo = true;

    async function cargar(silencioso = false) {
      if (!silencioso) {
        setCargando(true);
        setError('');
      }
      try {
        const respuesta = await fetch(origenCad, {
          cache: 'no-store',
          signal: controller.signal
        });
        const cuerpo = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(cuerpo.error || 'No se pudo cargar el dibujo del CAD.');
        if (!activo || controller.signal.aborted) return;
        setDatos(cuerpo as RespuestaCadPaginasCliente);
        setError('');
      } catch (e) {
        if (!activo || controller.signal.aborted) return;
        if (!silencioso) setError(e instanceof Error ? e.message : 'No se pudo cargar el dibujo del CAD.');
      } finally {
        if (activo && !controller.signal.aborted && !silencioso) setCargando(false);
      }
    }

    void cargar(false);

    // Si el técnico retoca el DWG en ZWCAD y vuelve a la ventana, recarga silenciosamente (con caché mtime+tamaño en servidor).
    const alVolver = () => {
      if (document.visibilityState === 'visible') void cargar(true);
    };
    window.addEventListener('focus', alVolver);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      activo = false;
      controller.abort();
      window.removeEventListener('focus', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [orderCode, origenCad, version, intento, requerido, datosIniciales]);

  const paginas = datos?.paginas ?? [];
  const paginaSegura = Math.max(0, Math.min(indicePagina, Math.max(0, paginas.length - 1)));
  const paginaActual = paginas[paginaSegura] ?? null;

  // Renderizado seguro del SVG como blob URL (sin colisión de IDs ni scripts).
  const svgTexto = paginaActual?.svg ?? '';
  const svgBlobUrl = useMemo(() => {
    if (!svgTexto || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return '';
    return URL.createObjectURL(new Blob([svgTexto], { type: 'image/svg+xml;charset=utf-8' }));
  }, [svgTexto]);
  useEffect(() => () => {
    if (svgBlobUrl) URL.revokeObjectURL(svgBlobUrl);
  }, [svgBlobUrl]);

  // Medir el área disponible para «Página entera» y «Ajustar al ancho».
  useEffect(() => {
    const el = escenarioRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const medir = () => {
      const style = getComputedStyle(el);
      const width = Math.max(1, el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
      const height = Math.max(1, el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
      setTamanoEscenario(actual => (actual.width === width && actual.height === height ? actual : { width, height }));
    };
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    return () => observer.disconnect();
  }, [datos?.tieneDwg, ampliado, enModal]);

  // Pantalla completa en el mismo <dialog>, como PlanteamientoPedido.
  useLayoutEffect(() => {
    const elemento = dialogoRef.current;
    if (!elemento || !ampliado || enModal) return;
    const overflow = document.body.style.overflow;
    const boton = abrirRef.current;
    elemento.close();
    elemento.showModal();
    document.body.style.overflow = 'hidden';
    cerrarRef.current?.focus();
    return () => {
      elemento.close();
      elemento.open = true;
      document.body.style.overflow = overflow;
      requestAnimationFrame(() => boton?.focus({ preventScroll: true }));
    };
  }, [ampliado, enModal]);

  const desactualizado = Boolean(noRegenerado || (datos?.tieneDwg && !datos.actualizado));
  const sinOf = toldos.some(({ t }) => !t.of?.trim());
  const ocupadoActualizar = actualizando || actualizandoLocal;

  // Informar a ReviewOrderDetail (para los botones de arriba) cuando ya tenemos el estado del DWG.
  useEffect(() => {
    if (!requerido || !datos?.tieneDwg) return;
    const falta = sinOf
      ? 'Falta la OF de algún toldo'
      : desactualizado
        ? 'Corte viejo: genéralo de nuevo'
        : null;
    onListo?.(falta);
  }, [requerido, datos?.tieneDwg, sinOf, desactualizado, onListo]);

  if (!requerido) return null;

  // Caso 6 (panel de detalle): todavía no hay DWG -> aviso corto y vista anterior (CorteLona).
  if (!enModal && !cargando && !error && datos && !datos.tieneDwg) {
    if (!order) return (
      <section className="planteamiento-pedido panel bloque-3d" aria-label="Corte">
        <CabeceraDocumento titulo="Corte" icono={<Scissors aria-hidden="true" />} />
        <p className="corte-aviso cad-paginas-sin-dwg" role="status">Aún no hay dibujo del CAD.</p>
        {sinDwg}
      </section>
    );
    // Sin aviso suelto encima: bajaba el bloque y lo descuadraba con el planteamiento (Iván, 26/11/2026).
    return (
      <>
        {sinDwg ?? <CorteLona
          order={order}
          estado={estado}
          reviewCode={orderCode}
          dwgGuardado={false}
          noRegenerado={noRegenerado}
          generarArriba={generarArriba}
          regenerable={regenerable}
          onListo={onListo}
        />}
      </>
    );
  }

  async function actualizarCorte() {
    if (!onActualizarCorte || ocupadoActualizar) return;
    setActualizandoLocal(true);
    try {
      await onActualizarCorte();
      setIntento(i => i + 1);
    } finally {
      setActualizandoLocal(false);
    }
  }

  const baseW = (paginaActual?.anchoMm || 297) * PX_POR_MM;
  const baseH = (paginaActual?.altoMm || 210) * PX_POR_MM;
  const escala = zoom === 'height'
    ? (tamanoEscenario.width > 0 && tamanoEscenario.height > 0
      ? Math.min(tamanoEscenario.width / baseW, tamanoEscenario.height / baseH)
      : 0.65)
    : zoom === 'fit'
      ? (tamanoEscenario.width > 0 ? tamanoEscenario.width / baseW : 0.75)
      : zoom / 100;
  const hojaW = Math.max(120, Math.round(baseW * escala));
  const hojaH = Math.max(85, Math.round(baseH * escala));

  const cambiarPagina = (siguiente: number) => setIndicePagina(Math.max(0, Math.min(paginas.length - 1, siguiente)));
  const cambiarZoom = (dir: number) => {
    const actual = zoom === 'height' || zoom === 'fit' ? Math.round(escala * 100) : zoom;
    setZoom(Math.max(50, Math.min(300, Math.round(actual / 25) * 25 + dir * 25)));
  };

  const estadoClase = desactualizado
    ? 'is-viejo'
    : datos?.tieneDwg
      ? 'is-hecho'
      : 'is-aviso';
  const estadoTexto = ocupadoActualizar
    ? 'Actualizando…'
    : desactualizado
      ? 'No actualizado'
      : cargando
        ? 'Cargando…'
        : datos?.modificadoAMano
          ? 'Editado en ZWCAD'
          : datos?.origen === 'borrador'
            ? 'Borrador CAD'
            : datos?.tieneDwg
              ? 'CAD al día'
              : 'Comprobando…';

  const srcSvg = svgBlobUrl || (paginaActual?.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(paginaActual.svg)}` : '');

  const pieTexto = paginaActual
    ? [
      paginaActual.nombre,
      paginaActual.archivo,
      datos?.origen === 'borrador' ? 'Borrador' : null,
      datos?.modificadoAMano ? 'Editado en ZWCAD' : null
    ].filter(Boolean).join(' · ')
    : '';

  const avisoDesactualizado = desactualizado && (
    <div className={`cad-aviso-fila${enModal ? ' is-modal' : ''}`} role="status">
      <p className="corte-aviso">{datos?.motivoDesactualizado || CORTE_NO_REGENERADO}</p>
      {onActualizarCorte && (
        <button
          type="button"
          className="primary-button boton-3d"
          disabled={ocupadoActualizar}
          onClick={() => void actualizarCorte()}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {ocupadoActualizar ? 'Actualizando…' : 'Actualizar corte'}
        </button>
      )}
    </div>
  );

  const manejarTeclado = (event: React.KeyboardEvent) => {
    if (!datos?.tieneDwg) return;
    if (event.key === 'ArrowLeft') { cambiarPagina(paginaSegura - 1); event.preventDefault(); }
    else if (event.key === 'ArrowRight') { cambiarPagina(paginaSegura + 1); event.preventDefault(); }
    else if (event.key === '+' || event.key === '=') { cambiarZoom(1); event.preventDefault(); }
    else if (event.key === '-') { cambiarZoom(-1); event.preventDefault(); }
  };

  const manejarRueda = (event: React.WheelEvent) => {
    if (!event.ctrlKey || event.deltaY === 0 || !datos?.tieneDwg) return;
    event.preventDefault();
    cambiarZoom(event.deltaY < 0 ? 1 : -1);
  };

  const escenarioHojas = (
    <div className="pdf-carousel-stage" ref={escenarioRef} aria-live="polite" onWheel={manejarRueda}>
      {cargando && !datos?.tieneDwg && !error && (
        <div className="pdf-carousel-state" role="status">Cargando dibujo del CAD…</div>
      )}
      {error && (
        <div className="pdf-carousel-state is-error" role="alert">{error}</div>
      )}
      {!cargando && !error && datos && !datos.tieneDwg && (
        <div className="pdf-carousel-state" role="status">Aún no hay dibujo del CAD.</div>
      )}
      {datos?.tieneDwg && paginaActual && (
        <>
          <div
            className={`pdf-carousel-canvas${desactualizado ? ' cad-paginas-atenuado' : ''}`}
            style={{ width: hojaW, height: hojaH }}
          >
            <img
              className="pdf-carousel-page hoja-3d"
              src={srcSvg}
              alt={`Presentación CAD ${paginaActual.nombre} (${paginaActual.archivo})`}
              width={hojaW}
              height={hojaH}
            />
          </div>
          {paginas.length > 1 && (
            <>
              <button
                className="pdf-carousel-arrow is-previous"
                type="button"
                onClick={() => cambiarPagina(paginaSegura - 1)}
                disabled={paginaSegura <= 0}
                aria-label="Página anterior"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                className="pdf-carousel-arrow is-next"
                type="button"
                onClick={() => cambiarPagina(paginaSegura + 1)}
                disabled={paginaSegura >= paginas.length - 1}
                aria-label="Página siguiente"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );

  // En el modal «Vista previa», devuelve directamente el mismo `.pdf-carousel` que PdfPreviewViewer.
  if (enModal) {
    return (
      <div
        className="pdf-carousel"
        ref={raizRef}
        aria-label="Dibujo real del CAD"
        aria-busy={cargando || ocupadoActualizar}
        tabIndex={0}
        onKeyDown={manejarTeclado}
      >
        <PdfPreviewToolbar
          heading={heading}
          actions={actions}
          zoom={zoom}
          pageNumber={paginaSegura + 1}
          pageCount={datos?.tieneDwg ? paginas.length : 0}
          onZoom={setZoom}
          onZoomStep={cambiarZoom}
          onPage={n => cambiarPagina(n - 1)}
        />
        {avisoDesactualizado}
        {escenarioHojas}
        {pieTexto && <p className="corte-ayuda cad-paginas-pie">{pieTexto}</p>}
      </div>
    );
  }

  return (
    <dialog
      ref={dialogoRef}
      open={!ampliado}
      className="planteamiento-pedido panel bloque-3d"
      role={ampliado ? 'dialog' : 'region'}
      aria-modal={ampliado || undefined}
      aria-label="Corte"
      aria-busy={cargando || ocupadoActualizar}
      onCancel={evento => { evento.preventDefault(); setAmpliado(false); }}
    >
      <CabeceraDocumento titulo="Corte" icono={<Scissors aria-hidden="true" />}>
        <span className={`corte-estado ${estadoClase}`} role="status">
          {!desactualizado && datos?.tieneDwg && !cargando && <CheckCircle2 size={16} aria-hidden="true" />}
          {estadoTexto}
        </span>
        <div className="documento-acciones">
          {error && (
            <button type="button" className="ghost-button boton-3d" onClick={() => setIntento(i => i + 1)}>
              <RefreshCw size={16} aria-hidden="true" />Reintentar
            </button>
          )}
          {datos?.tieneDwg && (
            <>
              <button ref={abrirRef} type="button" hidden={ampliado} className="ghost-button boton-3d" onClick={() => setAmpliado(true)}>
                <Maximize2 aria-hidden="true" />Abrir en grande
              </button>
              <button ref={cerrarRef} type="button" hidden={!ampliado} className="icon-button" aria-label="Cerrar vista previa del CAD" onClick={() => setAmpliado(false)}>
                <X aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </CabeceraDocumento>

      {avisoDesactualizado}
      {error && <p className="corte-aviso" role="alert">{error}</p>}
      {cargando && !datos?.tieneDwg && !error && (
        <p className="documento-espera" role="status">Cargando dibujo del CAD…</p>
      )}

      {datos?.tieneDwg && <CortesDelPlano cortes={datos.cortes ?? []} atenuado={desactualizado} />}
    </dialog>
  );
}
