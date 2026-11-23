import { useRef, useState } from 'react';
import { BotonMandarMaquina, type EnvioMaquina } from '../components/CorteMaquina';
import { controlLabel } from '../components/controlLabels';
import { medidas, medidasCmt, mm, permiteSinTextos, prepararArchivo, type PlanoPreparado } from '../cmt/conversion';
import { descargarCmt, descargarDxf, descargarPlanos } from '../cmt/descarga';
import { BuscadorPlanos } from '../cmt/BuscadorPlanos';
import { hayPendientes, Pendientes } from '../cmt/Pendientes';
import { VistaPreparacion } from '../cmt/VistaPreparacion';
import type { DecisionesPreparacion } from '../../cmt/preparacion/index.ts';
import '../cmt/cmt.css';

interface FilaCmt {
  id: number;
  revision: number;
  archivo: File;
  ocupado?: 'Analizando…' | 'Generando…';
  sinTextos: boolean;
  decisiones: DecisionesPreparacion;
  resultado?: PlanoPreparado;
  error?: string;
  envio?: EnvioMaquina;
}

export function CmtView() {
  const [filas, setFilas] = useState<FilaCmt[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [descarga, setDescarga] = useState({ ocupado: false, error: '', mensaje: '' });
  const siguienteId = useRef(0);
  const selector = useRef<HTMLInputElement>(null);
  const planos = filas.flatMap(f => f.resultado ? [f.resultado] : []);
  const listos = planos.filter(p => p.listo).length;
  const procesando = filas.some(f => f.ocupado);

  const actualizar = (id: number, cambios: Partial<FilaCmt>) =>
    setFilas(actuales => actuales.map(f => f.id === id ? { ...f, ...cambios } : f));

  async function procesar(fila: FilaCmt, { generar = false, sinTextos = fila.sinTextos } = {}) {
    const decisiones = sinTextos === fila.sinTextos ? fila.decisiones : {};
    actualizar(fila.id, { ocupado: generar ? 'Generando…' : 'Analizando…', decisiones, sinTextos, envio: undefined, error: undefined });
    try {
      const resultado = await prepararArchivo(fila.archivo, decisiones, sinTextos, fetch, generar, generar ? fila.resultado?.huella : undefined);
      actualizar(fila.id, { resultado, revision: fila.revision + 1 });
    } catch (error) {
      actualizar(fila.id, { error: error instanceof Error ? error.message : 'No se pudo leer el plano.' });
    } finally {
      actualizar(fila.id, { ocupado: undefined });
    }
  }

  async function agregar(archivos: File[]) {
    const nuevas = archivos.map((archivo): FilaCmt => ({
      id: siguienteId.current++, revision: 0, archivo, ocupado: 'Analizando…', sinTextos: false, decisiones: {},
    }));
    setFilas(actuales => [...actuales, ...nuevas]);
    for (const fila of nuevas) await procesar(fila);
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

  return <section className="cmt-vista" aria-label="Conversión de DXF a CMT">
    <div className="cmt-introduccion">
      <p>Elige el plano en la lista de la oficina o arrastra un DWG o un DXF. En los DWG se corta lo que hay dentro del rectángulo de la capa 0. Antes de generar verás el corte y lo que haya que decidir.</p>
      {filas.length > 0 && <div className="cmt-acciones">
        <button type="button" className="ghost-button" disabled={procesando || descarga.ocupado} onClick={() => {
          setFilas([]); setDescarga({ ocupado: false, error: '', mensaje: '' });
        }}>Limpiar lista</button>
        {filas.length > 1 && <button type="button" className="primary-button" disabled={!listos || descarga.ocupado}
          onClick={() => void guardar(guardarTodos)}>Descargar todos{listos ? ` (${listos})` : ''}</button>}
      </div>}
    </div>
    <BuscadorPlanos onElegir={archivo => void agregar([archivo])} />
    <div className={`cmt-entrada panel-vidrio${arrastrando ? ' cmt-arrastrando' : ''}`}
      onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastrando(false); }}
      onDrop={e => { e.preventDefault(); setArrastrando(false); void agregar(Array.from(e.dataTransfer.files)); }}>
      <div><strong>Arrastra aquí uno o varios DWG o DXF</strong><p>Máximo 30 MB por fichero.</p></div>
      <input ref={selector} type="file" accept=".dxf,.dwg" multiple hidden aria-label="Elegir ficheros DWG o DXF"
        onChange={e => { void agregar(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      <button type="button" className="primary-button" onClick={() => selector.current?.click()}>Elegir ficheros</button>
    </div>
    {descarga.error && <p className="cmt-error" role="alert">{descarga.error}</p>}
    <p className="cmt-progreso" role="status">{filas.length ? `${mm(listos)} de ${mm(filas.length)} planos listos${procesando ? ' · Procesando…' : ''}` : 'Los planos aparecerán aquí.'}{descarga.mensaje && ` ${descarga.mensaje}`}</p>
    <div className="cmt-resultados">
      {filas.map(fila => {
        const r = fila.resultado;
        const terminado = r?.listo && r.nombreDxf && r.dxfBase64 ? { nombre: r.nombreDxf, dxfBase64: r.dxfBase64 } : null;
        const estado = fila.ocupado || (terminado ? 'Listo' : fila.error || r?.dudas.length ? 'Revisar plano' : r?.preparado ? 'Revisar vista previa' : 'Decisiones pendientes');
        return <article key={fila.id} className="cmt-fichero panel-vidrio" aria-label={fila.archivo.name} aria-busy={Boolean(fila.ocupado)}>
          <div className="cmt-fichero-cabecera">
            <div className="cmt-nombre"><h3>{fila.archivo.name}</h3>{fila.sinTextos && <span>Sin textos</span>}</div>
            <span className={`cmt-estado ${terminado ? 'pildora-plantear' : 'pildora-aviso'}`}>{estado}</span>
          </div>
          {r && <div className="cmt-resumen">
            {r.medidasMm && <span><strong>{medidas(r.medidasMm.ancho, r.medidasMm.alto)}</strong> · Medidas del corte</span>}
            {r.escala && <span>Escala a mm ×{mm(r.escala)}</span>}
            {r.resumen && <span>{mm(r.resumen.objetos)} objetos</span>}
          </div>}
          {r && <div className={`cmt-revision${hayPendientes(r.pendientes) ? ' cmt-revision-decisiones' : ''}`}>
            <VistaPreparacion vista={r.vista} marcos={r.pendientes.marcos} marco={fila.decisiones.marco} zonas={r.pendientes.solapes} />
            {hayPendientes(r.pendientes) && <Pendientes key={fila.revision} pendientes={r.pendientes} valor={fila.decisiones}
              ocupado={Boolean(fila.ocupado)} onCambio={decisiones => actualizar(fila.id, { decisiones })} onAplicar={() => void procesar(fila)} />}
          </div>}
          {r?.revisarVista && <p className="cmt-notas" role="status">{r.revisarVista}</p>}
          {r?.preparado && !r.listo && <div className="cmt-resultado-acciones">
            <button type="button" className="primary-button" disabled={Boolean(fila.ocupado)} onClick={() => void procesar(fila, { generar: true })}>Generar DXF y CMT</button>
          </div>}
          {r && terminado && <div className="cmt-resultado-acciones">
            <button type="button" className="primary-button" disabled={descarga.ocupado} onClick={() => void guardar(() => descargarDxf(r))}>Descargar DXF</button>
            <button type="button" className="ghost-button" disabled={descarga.ocupado} onClick={() => void guardar(() => descargarCmt(r))}>Descargar CMT</button>
            <BotonMandarMaquina ruta="/api/cmt/enviar" cuerpo={async () => ({ ...terminado, sinTextos: fila.sinTextos, recolocar: true })}
              onEnviado={envio => actualizar(fila.id, { envio })} />
          </div>}
          {fila.envio && <p className="cmt-progreso">Mandado a la máquina por {controlLabel(fila.envio.usuario)} a las {new Date(fila.envio.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>}
          {!!r?.resumen?.porHerramienta.length && <dl className="cmt-herramientas" aria-label="Trazos por herramienta">
            {r.resumen.porHerramienta.map(h => <div key={h.herramienta}><dt>{h.etiqueta}</dt><dd>{mm(h.trazos)} {h.trazos === 1 ? 'trazo' : 'trazos'}</dd></div>)}
          </dl>}
          {r?.resumen && !r.medidasMm && <p className="cmt-progreso">{medidasCmt(r.resumen)}</p>}
          {!!r?.avisos.length && <details className="cmt-notas"><summary>Avisos ({mm(r.avisos.length)})</summary><ul>{r.avisos.map(a => <li key={a}>{a}</li>)}</ul></details>}
          {!!r?.dudas.length && <div className="cmt-notas cmt-dudas"><h4>Revisa el plano antes de generar</h4><ul>{r.dudas.map(d => <li key={d}>{d}</li>)}</ul>
            {permiteSinTextos(r.dudas, fila.sinTextos) && <button type="button" className="ghost-button" disabled={Boolean(fila.ocupado)}
              onClick={() => void procesar(fila, { sinTextos: true })}>Convertir sin textos</button>}
          </div>}
          {fila.error && <p className="cmt-error" role="alert">{fila.error}</p>}
        </article>;
      })}
    </div>
  </section>;
}
