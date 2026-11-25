import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Maximize2, RefreshCw, Scissors, X } from 'lucide-react';
import { CORTE_NO_REGENERADO } from '../../toldosEditable.js';
import type { RespuestaCadPaginasCliente } from '../components/CadPaginas';
import { CabeceraDocumento } from '../components/DocumentosPedido';
import { CortesDelPlano } from '../components/CortesDelPlano';
import { PdfPreviewToolbar, type PdfZoom } from '../components/PdfPreviewToolbar';
import '../coordina/cad-paginas.css';

// Adaptador de vista real del DWG para pedidos de puertas (y System Dock, abrigo y sacos) y de remolques.
// Reutiliza exactamente el mismo visor, barra, clases y avisos que CadPaginas.tsx, apuntando a /api/<producto>/pedidos/:orderCode/cad-paginas.
const PX_POR_MM = 96 / 25.4;

export function CadPaginasPuertas({
  producto = 'puertas',
  orderCode,
  version = '',
  noRegenerado = false,
  desactualizadoLocal = false,
  motivoLocal,
  onActualizarCorte,
  actualizando = false,
  datosIniciales = null,
  enModal = false,
  heading,
  actions,
  fallback,
}: {
  producto?: 'puertas' | 'remolques';
  orderCode: string;
  version?: string;
  noRegenerado?: boolean;
  desactualizadoLocal?: boolean;
  motivoLocal?: string;
  onActualizarCorte?: () => Promise<void> | void;
  actualizando?: boolean;
  datosIniciales?: RespuestaCadPaginasCliente | null;
  enModal?: boolean;
  heading?: React.ReactNode;
  actions?: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const codigo = orderCode.trim();
  const [datos, setDatos] = useState<RespuestaCadPaginasCliente | null>(datosIniciales);
  const [cargando, setCargando] = useState(!datosIniciales && Boolean(codigo));
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
    if (!codigo) return;
    if (datosIniciales && intento === 0) return;
    const controller = new AbortController();
    let activo = true;

    async function cargar(silencioso = false) {
      if (!silencioso) {
        setCargando(true);
        setError('');
      }
      try {
        const respuesta = await fetch(`/api/${producto}/pedidos/${encodeURIComponent(codigo)}/cad-paginas`, {
          cache: 'no-store',
          signal: controller.signal,
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
  }, [producto, codigo, version, intento, datosIniciales]);

  const datosActivos = codigo ? datos : null;
  const cargandoActivo = Boolean(codigo && cargando);
  const errorActivo = codigo ? error : '';
  const paginas = datosActivos?.paginas ?? [];
  const paginaSegura = Math.max(0, Math.min(indicePagina, Math.max(0, paginas.length - 1)));
  const paginaActual = paginas[paginaSegura] ?? null;

  const svgTexto = paginaActual?.svg ?? '';
  const svgBlobUrl = useMemo(() => {
    if (!svgTexto || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return '';
    return URL.createObjectURL(new Blob([svgTexto], { type: 'image/svg+xml;charset=utf-8' }));
  }, [svgTexto]);
  useEffect(() => () => {
    if (svgBlobUrl) URL.revokeObjectURL(svgBlobUrl);
  }, [svgBlobUrl]);

  useEffect(() => {
    const el = escenarioRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const medir = () => {
      const style = getComputedStyle(el);
      const width = Math.max(1, el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
      const height = Math.max(1, el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
      setTamanoEscenario((actual) => (actual.width === width && actual.height === height ? actual : { width, height }));
    };
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    return () => observer.disconnect();
  }, [datos?.tieneDwg, ampliado, enModal]);

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

  const desactualizado = Boolean(noRegenerado || desactualizadoLocal || (datosActivos?.tieneDwg && !datosActivos.actualizado));
  const ocupadoActualizar = actualizando || actualizandoLocal;
  // Planos antiguos sin recuadro CORTE: mejor el corte de la web que un aviso sin dibujo.
  const sinRecuadroCorte = Boolean(datosActivos?.tieneDwg && !datosActivos.cortes?.length && fallback);

  if (!enModal && !cargandoActivo && !errorActivo && datosActivos && !datosActivos.tieneDwg && fallback) {
    return (
      <>
        <p className="corte-aviso cad-paginas-sin-dwg" role="status">Aún no hay dibujo del CAD.</p>
        {fallback}
      </>
    );
  }

  async function actualizarCorte() {
    if (!onActualizarCorte || ocupadoActualizar) return;
    setActualizandoLocal(true);
    try {
      await onActualizarCorte();
      setIntento((i) => i + 1);
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
    : datosActivos?.tieneDwg
      ? 'is-hecho'
      : 'is-aviso';
  const estadoTexto = ocupadoActualizar
    ? 'Actualizando…'
    : desactualizado
      ? 'No actualizado'
      : cargandoActivo
        ? 'Cargando…'
        : datosActivos?.modificadoAMano
          ? 'Editado en ZWCAD'
          : datosActivos?.origen === 'borrador'
            ? 'Borrador CAD'
            : datosActivos?.tieneDwg
              ? 'CAD al día'
              : 'Comprobando…';

  const srcSvg = svgBlobUrl || (paginaActual?.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(paginaActual.svg)}` : '');

  const pieTexto = paginaActual
    ? [
      paginaActual.nombre,
      paginaActual.archivo,
      datosActivos?.origen === 'borrador' ? 'Borrador' : null,
      datosActivos?.modificadoAMano ? 'Editado en ZWCAD' : null,
    ].filter(Boolean).join(' · ')
    : '';

  const avisoDesactualizado = desactualizado && (
    <div className={`cad-aviso-fila${enModal ? ' is-modal' : ''}`} role="status">
      <p className="corte-aviso">{datosActivos?.motivoDesactualizado || motivoLocal || CORTE_NO_REGENERADO}</p>
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
    if (!datosActivos?.tieneDwg) return;
    if (event.key === 'ArrowLeft') { cambiarPagina(paginaSegura - 1); event.preventDefault(); }
    else if (event.key === 'ArrowRight') { cambiarPagina(paginaSegura + 1); event.preventDefault(); }
    else if (event.key === '+' || event.key === '=') { cambiarZoom(1); event.preventDefault(); }
    else if (event.key === '-') { cambiarZoom(-1); event.preventDefault(); }
  };

  const manejarRueda = (event: React.WheelEvent) => {
    if (!event.ctrlKey || event.deltaY === 0 || !datosActivos?.tieneDwg) return;
    event.preventDefault();
    cambiarZoom(event.deltaY < 0 ? 1 : -1);
  };

  const escenarioHojas = (
    <div className="pdf-carousel-stage" ref={escenarioRef} aria-live="polite" onWheel={manejarRueda}>
      {!codigo && (
        <div className="pdf-carousel-state" role="status">Escribe el número de pedido para ver el dibujo del CAD.</div>
      )}
      {codigo && cargandoActivo && !datosActivos?.tieneDwg && !errorActivo && (
        <div className="pdf-carousel-state" role="status">Cargando dibujo del CAD…</div>
      )}
      {errorActivo && (
        <div className="pdf-carousel-state is-error" role="alert">{errorActivo}</div>
      )}
      {codigo && !cargandoActivo && !errorActivo && datosActivos && !datosActivos.tieneDwg && (
        <div className="pdf-carousel-state" role="status">Aún no hay dibujo del CAD.</div>
      )}
      {datosActivos?.tieneDwg && paginaActual && (
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

  if (enModal) {
    return (
      <div
        className="pdf-carousel"
        ref={raizRef}
        aria-label="Dibujo real del CAD"
        aria-busy={cargandoActivo || ocupadoActualizar}
        tabIndex={0}
        onKeyDown={manejarTeclado}
      >
        <PdfPreviewToolbar
          heading={heading}
          actions={actions}
          zoom={zoom}
          pageNumber={paginaSegura + 1}
          pageCount={datosActivos?.tieneDwg ? paginas.length : 0}
          onZoom={setZoom}
          onZoomStep={cambiarZoom}
          onPage={(n) => cambiarPagina(n - 1)}
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
      aria-busy={cargandoActivo || ocupadoActualizar}
      onCancel={(evento) => { evento.preventDefault(); setAmpliado(false); }}
    >
      <CabeceraDocumento titulo="Corte" icono={<Scissors aria-hidden="true" />}>
        <span className={`corte-estado ${estadoClase}`} role="status">
          {!desactualizado && datosActivos?.tieneDwg && !cargandoActivo && <CheckCircle2 size={16} aria-hidden="true" />}
          {estadoTexto}
        </span>
        <div className="documento-acciones">
          {errorActivo && (
            <button type="button" className="ghost-button boton-3d" onClick={() => setIntento((i) => i + 1)}>
              <RefreshCw size={16} aria-hidden="true" />Reintentar
            </button>
          )}
          {datosActivos?.tieneDwg && (
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
      {errorActivo && <p className="corte-aviso" role="alert">{errorActivo}</p>}
      {cargandoActivo && !datosActivos?.tieneDwg && !errorActivo && (
        <p className="documento-espera" role="status">Cargando dibujo del CAD…</p>
      )}

      {datosActivos?.tieneDwg && (sinRecuadroCorte
        ? <>
          <p className="corte-aviso" role="status">El plano no tiene recuadro CORTE: este es el corte que calcula la web.</p>
          {fallback}
        </>
        : <CortesDelPlano cortes={datosActivos.cortes ?? []} atenuado={desactualizado} />)}
    </dialog>
  );
}
