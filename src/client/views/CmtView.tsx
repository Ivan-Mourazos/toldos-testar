import { useEffect, useRef, useState } from 'react';
import { Download, FileDown, FolderOpen, Upload, X } from 'lucide-react';
import { BotonMandarMaquina, type EnvioMaquina } from '../components/CorteMaquina';
import { controlLabel } from '../components/controlLabels';
import { MenuMas } from '../components/MenuMas';
import { medidas, medidasCmt, mm, permiteSinTextos, prepararArchivo, type PlanoPreparado } from '../cmt/conversion';
import { descargarCmt, descargarDxf, descargarPlanos } from '../cmt/descarga';
import { BuscadorPlanos } from '../cmt/BuscadorPlanos';
import { hayPendientes, Pendientes } from '../cmt/Pendientes';
import { VistaPreparacion } from '../cmt/VistaPreparacion';
import { StockLonaPlano } from '../cmt/StockLonaPlano';
import type { DecisionesPreparacion } from '../../cmt/preparacion/index.ts';
import '../cmt/cmt.css';

interface FilaCmt {
  id: number;
  revision: number;
  archivo: File;
  carpeta?: string;
  ocupado?: 'Analizando…' | 'Generando…';
  sinTextos: boolean;
  decisiones: DecisionesPreparacion;
  resultado?: PlanoPreparado;
  error?: string;
  envio?: EnvioMaquina;
}

const mismoArchivo = (a: File, b: File) => a.size === b.size && a.lastModified === b.lastModified;

function terminadoDe(r?: PlanoPreparado) {
  return r?.listo && r.nombreDxf && r.dxfBase64 ? { nombre: r.nombreDxf, dxfBase64: r.dxfBase64 } : null;
}

function estadoDe(fila: FilaCmt) {
  const r = fila.resultado;
  return fila.ocupado || (terminadoDe(r) ? 'Listo' : fila.error || r?.dudas.length ? 'Revisar plano' : r?.preparado ? 'Revisar vista previa' : 'Decisiones pendientes');
}

/**
 * Planos a corte como mesa de trabajo (Iván, 24/11/2026: «al elegir un pedido, se ajuste la vista, no aumentar por debajo»):
 * a la izquierda se eligen los planos; a la derecha solo está el elegido, a la altura de la pantalla.
 */
export function CmtView() {
  const [filas, setFilas] = useState<FilaCmt[]>([]);
  const [activa, setActiva] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [descarga, setDescarga] = useState({ ocupado: false, error: '', mensaje: '' });
  const [colaStock, setColaStock] = useState<number[]>([]);
  const siguienteId = useRef(0);
  const selector = useRef<HTMLInputElement>(null);
  const filasActuales = useRef(filas);
  useEffect(() => { filasActuales.current = filas; }, [filas]);
  const planos = filas.flatMap(f => f.resultado ? [f.resultado] : []);
  const listos = planos.filter(p => p.listo).length;
  const procesando = filas.some(f => f.ocupado);
  const fila = filas.find(f => f.id === activa);
  const planoStock = colaStock[0];
  const deteccionStock = filas.find(f => f.id === planoStock)?.resultado?.stockLona;
  const abrirStock = (id: number) => setColaStock(cola => cola.includes(id) ? cola : [...cola, id]);

  const actualizar = (id: number, cambios: Partial<FilaCmt>) =>
    setFilas(actuales => actuales.map(f => f.id === id ? { ...f, ...cambios } : f));

  async function procesar(fila: FilaCmt, { generar = false, sinTextos = fila.sinTextos } = {}) {
    const decisiones = sinTextos === fila.sinTextos ? fila.decisiones : {};
    actualizar(fila.id, { ocupado: generar ? 'Generando…' : 'Analizando…', decisiones, sinTextos, envio: undefined, error: undefined });
    try {
      const resultado = await prepararArchivo(fila.archivo, decisiones, sinTextos, fetch, generar, generar ? fila.resultado?.huella : undefined, fila.carpeta);
      actualizar(fila.id, { resultado, revision: fila.revision + 1 });
      if (resultado.listo && resultado.stockLona?.aplica) abrirStock(fila.id);
    } catch (error) {
      actualizar(fila.id, { error: error instanceof Error ? error.message : 'No se pudo leer el plano.' });
    } finally {
      actualizar(fila.id, { ocupado: undefined });
    }
  }

  /**
   * Un plano que ya está abierto no se repite: se vuelve a él. Si el fichero ha cambiado (se guardó otra vez en ZWCAD),
   * se lee de nuevo en su sitio.
   */
  async function agregar(archivos: File[], carpeta?: string) {
    if (!archivos.length) return;
    const actuales = filasActuales.current;
    const aLeer: FilaCmt[] = [];
    const nuevas: FilaCmt[] = [];
    let primera: number | undefined;
    for (const archivo of archivos) {
      const origen = carpeta ?? archivo.webkitRelativePath?.split('/').slice(0, -1).join('/');
      const abierta = actuales.find(f => f.carpeta === origen && f.archivo.name.toLowerCase() === archivo.name.toLowerCase());
      if (abierta && (abierta.ocupado || mismoArchivo(abierta.archivo, archivo))) {
        primera ??= abierta.id;
        continue;
      }
      const fila: FilaCmt = abierta
        ? { ...abierta, archivo, decisiones: {}, sinTextos: false, resultado: undefined, error: undefined, envio: undefined, ocupado: 'Analizando…' }
        : { id: siguienteId.current++, revision: 0, archivo, carpeta: origen, ocupado: 'Analizando…', sinTextos: false, decisiones: {} };
      primera ??= fila.id;
      aLeer.push(fila);
      if (!abierta) nuevas.push(fila);
    }
    setFilas(previas => [...previas.map(f => aLeer.find(n => n.id === f.id) ?? f), ...nuevas]);
    if (primera !== undefined) setActiva(primera);
    for (const f of aLeer) await procesar(f);
  }

  function cerrar(id: number) {
    const indice = filas.findIndex(f => f.id === id);
    const quedan = filas.filter(f => f.id !== id);
    setFilas(quedan);
    setColaStock(cola => cola.filter(enCola => enCola !== id));
    if (activa === id) setActiva(quedan[Math.min(indice, quedan.length - 1)]?.id ?? null);
  }

  async function guardar(operacion: () => Promise<unknown>) {
    setDescarga({ ocupado: true, error: '', mensaje: '' });
    try {
      await operacion();
    } catch (error) {
      setDescarga({ ocupado: false, error: `No se pudo guardar el corte. ${error instanceof Error ? error.message : 'Vuelve a intentarlo.'}`, mensaje: '' });
    } finally {
      setDescarga(actual => ({ ...actual, ocupado: false }));
    }
  }

  async function guardarTodos() {
    const { descargados } = await descargarPlanos(planos);
    const omitidos = filas.length - descargados;
    setDescarga(actual => ({ ...actual, mensaje: omitidos ? `Se han omitido ${mm(omitidos)} ${omitidos === 1 ? 'plano sin generar' : 'planos sin generar'}.` : '' }));
  }

  return <section className={`cmt-vista cmt-mesa${arrastrando ? ' cmt-arrastrando' : ''}`} aria-label="Planos a corte"
    onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastrando(false); }}
    onDrop={e => { e.preventDefault(); setArrastrando(false); void agregar(Array.from(e.dataTransfer.files)); }}>
    <aside className="cmt-lateral" aria-label="Elegir planos">
      <BuscadorPlanos onElegir={(archivo, carpeta) => void agregar([archivo], carpeta)} />
      <div className="cmt-entrada">
        <Upload aria-hidden="true" />
        <div><strong>Arrastra DWG o DXF</strong><p>Aquí o en cualquier parte de la pantalla. Máximo 30 MB.</p></div>
        <input ref={selector} type="file" accept=".dxf,.dwg" multiple hidden aria-label="Elegir ficheros DWG o DXF"
          onChange={e => { void agregar(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <button type="button" className="ghost-button boton-3d" onClick={() => selector.current?.click()}>Elegir ficheros</button>
      </div>
      {filas.length > 0 && <section className="cmt-abiertos panel-vidrio" aria-label="Planos abiertos">
        <div className="cmt-abiertos-cabecera">
          <div>
            <strong>Abiertos</strong>
            <p role="status">{`${mm(listos)} de ${mm(filas.length)} listos${procesando ? ' · Procesando…' : ''}`}{descarga.mensaje && ` ${descarga.mensaje}`}</p>
          </div>
          <button type="button" className="ghost-button" disabled={procesando || descarga.ocupado} onClick={() => {
            setFilas([]); setActiva(null); setColaStock([]); setDescarga({ ocupado: false, error: '', mensaje: '' });
          }}>Limpiar lista</button>
        </div>
        <ul>
          {filas.map(f => <li key={f.id} className={f.id === activa ? 'cmt-abierto-activo' : undefined}>
            <button type="button" className="cmt-abierto" aria-current={f.id === activa || undefined} onClick={() => setActiva(f.id)}>
              <strong>{f.archivo.name}</strong>
              <span className={`cmt-estado ${terminadoDe(f.resultado) ? 'pildora-plantear' : 'pildora-aviso'}`}>{estadoDe(f)}</span>
            </button>
            <button type="button" className="cmt-cerrar" aria-label={`Cerrar ${f.archivo.name}`} title="Cerrar" disabled={Boolean(f.ocupado)}
              onClick={() => cerrar(f.id)}><X aria-hidden="true" /></button>
          </li>)}
        </ul>
      </section>}
    </aside>
    <div className="cmt-panel panel-vidrio">
      {descarga.error && <p className="cmt-error" role="alert">{descarga.error}</p>}
      {fila ? <Ficha key={fila.id} fila={fila} listos={listos} descargando={descarga.ocupado}
        onProcesar={opciones => void procesar(fila, opciones)}
        onCambio={cambios => actualizar(fila.id, cambios)}
        onStock={() => abrirStock(fila.id)}
        onGuardar={operacion => void guardar(operacion)}
        onGuardarTodos={() => void guardar(guardarTodos)} />
        : <div className="cmt-vacio">
          <FolderOpen aria-hidden="true" />
          <strong>Elige un plano</strong>
          <p>Búscalo en los planos de la oficina o arrastra un DWG o un DXF. En los DWG se corta lo que hay dentro del rectángulo de la capa 0. Antes de generar verás el corte y lo que haya que decidir.</p>
        </div>}
    </div>
    {deteccionStock?.aplica && <StockLonaPlano key={planoStock} deteccion={deteccionStock} cerrar={() => setColaStock(cola => cola.slice(1))} />}
  </section>;
}

function Ficha({ fila, listos, descargando, onProcesar, onCambio, onStock, onGuardar, onGuardarTodos }: {
  fila: FilaCmt;
  listos: number;
  descargando: boolean;
  onProcesar: (opciones?: { generar?: boolean; sinTextos?: boolean }) => void;
  onCambio: (cambios: Partial<FilaCmt>) => void;
  onStock: () => void;
  onGuardar: (operacion: () => Promise<unknown>) => void;
  onGuardarTodos: () => void;
}) {
  const r = fila.resultado;
  const terminado = terminadoDe(r);
  const decidir = r && hayPendientes(r.pendientes);
  return <article className="cmt-fichero" aria-label={fila.archivo.name} aria-busy={Boolean(fila.ocupado)}>
    <header className="cmt-fichero-cabecera">
      <div className="cmt-nombre">
        <h3>{fila.archivo.name}</h3>
        <p className="cmt-resumen">
          <span className={`cmt-estado ${terminado ? 'pildora-plantear' : 'pildora-aviso'}`}>{estadoDe(fila)}</span>
          {r?.medidasMm && <span><strong>{medidas(r.medidasMm.ancho, r.medidasMm.alto)}</strong></span>}
          {r?.escala && <span>Escala a mm ×{mm(r.escala)}</span>}
          {r?.resumen && <span>{mm(r.resumen.objetos)} objetos</span>}
          {fila.sinTextos && <span>Sin textos</span>}
        </p>
      </div>
      <div className="cmt-fichero-acciones">
        {r?.preparado && !r.listo && <button type="button" className="primary-button boton-3d" disabled={Boolean(fila.ocupado)}
          onClick={() => onProcesar({ generar: true })}>{fila.ocupado === 'Generando…' ? 'Generando…' : 'Generar DXF y CMT'}</button>}
        {r && terminado && <>
          {r.stockLona?.aplica && <button type="button" className="ghost-button boton-3d" onClick={onStock}>Comprobar stock</button>}
          <MenuMas etiqueta="Descargas" icono={<Download size={16} aria-hidden="true" />}>
            <button type="button" role="menuitem" className="menu-mas-item" disabled={descargando} onClick={() => onGuardar(() => descargarDxf(r))}>
              <FileDown size={16} aria-hidden="true" />Descargar DXF</button>
            <button type="button" role="menuitem" className="menu-mas-item" disabled={descargando} onClick={() => onGuardar(() => descargarCmt(r))}>
              <FileDown size={16} aria-hidden="true" />Descargar CMT</button>
            {listos > 1 && <button type="button" role="menuitem" className="menu-mas-item" disabled={descargando} onClick={onGuardarTodos}>
              <Download size={16} aria-hidden="true" />Descargar todos los listos ({mm(listos)})</button>}
          </MenuMas>
          <BotonMandarMaquina principal ruta="/api/cmt/enviar" cuerpo={async () => ({ ...terminado, sinTextos: fila.sinTextos, recolocar: true })}
            onEnviado={envio => onCambio({ envio })} />
        </>}
      </div>
    </header>
    {fila.envio && <p className="cmt-enviado" role="status">Mandado a la máquina por {controlLabel(fila.envio.usuario)} a las {new Date(fila.envio.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>}
    {fila.error && <p className="cmt-error" role="alert">{fila.error}</p>}
    {!!r?.dudas.length && <div className="cmt-notas cmt-dudas"><h4>Revisa el plano antes de generar</h4><ul>{r.dudas.map(d => <li key={d}>{d}</li>)}</ul>
      {permiteSinTextos(r.dudas, fila.sinTextos) && <button type="button" className="ghost-button" disabled={Boolean(fila.ocupado)}
        onClick={() => onProcesar({ sinTextos: true })}>Convertir sin textos</button>}
    </div>}
    {r?.revisarVista && <p className="cmt-notas" role="status">{r.revisarVista}</p>}
    {r ? <div className={`cmt-revision${decidir ? ' cmt-revision-decisiones' : ''}`}>
      <VistaPreparacion vista={r.vista} marcos={r.pendientes.marcos} marco={fila.decisiones.marco} zonas={r.pendientes.solapes} />
      {decidir && <Pendientes key={fila.revision} pendientes={r.pendientes} valor={fila.decisiones}
        ocupado={Boolean(fila.ocupado)} onCambio={decisiones => onCambio({ decisiones })} onAplicar={() => onProcesar()} />}
    </div> : fila.ocupado && <p className="cmt-cargando" role="status">{fila.ocupado}</p>}
    {(!!r?.resumen?.porHerramienta.length || !!r?.avisos.length) && <footer className="cmt-fichero-pie">
      {!!r?.resumen?.porHerramienta.length && <dl className="cmt-herramientas" aria-label="Trazos por herramienta">
        {r.resumen.porHerramienta.map(h => <div key={h.herramienta}><dt>{h.etiqueta}</dt><dd>{mm(h.trazos)} {h.trazos === 1 ? 'trazo' : 'trazos'}</dd></div>)}
      </dl>}
      {r?.resumen && !r.medidasMm && <p className="cmt-progreso">{medidasCmt(r.resumen)}</p>}
      {!!r?.avisos.length && <details className="cmt-notas"><summary>Avisos ({mm(r.avisos.length)})</summary><ul>{r.avisos.map(a => <li key={a}>{a}</li>)}</ul></details>}
    </footer>}
  </article>;
}
