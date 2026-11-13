import React, { useRef, useState } from 'react';
import { convertirArchivo, medidasCmt, permiteSinTextos, textoEstado, type EstadoCmt, type ResultadoCmt } from '../cmt/conversion';
import { descargarCmt, descargarTodos } from '../cmt/descarga';
import '../cmt/cmt.css';

interface FilaCmt {
  id: number;
  archivo: File;
  estado: EstadoCmt;
  sinTextos: boolean;
  resultado?: ResultadoCmt;
  error?: string;
}

export function CmtView() {
  const [filas, setFilas] = useState<FilaCmt[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');
  const siguienteId = useRef(0);
  const selector = useRef<HTMLInputElement>(null);
  const listos = filas.flatMap(f => f.estado === 'listo' && f.resultado ? [f.resultado] : []);
  const convirtiendo = filas.some(f => f.estado === 'convirtiendo');

  async function convertir(fila: FilaCmt, sinTextos = false) {
    setFilas(actuales => actuales.map(f => f.id === fila.id ? { ...f, estado: 'convirtiendo', sinTextos, resultado: undefined, error: undefined } : f));
    try {
      const resultado = await convertirArchivo(fila.archivo, sinTextos);
      setFilas(actuales => actuales.map(f => f.id === fila.id ? { ...f, resultado, estado: resultado.ok ? 'listo' : 'error' } : f));
    } catch (error) {
      setFilas(actuales => actuales.map(f => f.id === fila.id ? { ...f, estado: 'error', error: error instanceof Error ? error.message : 'No se pudo leer el DXF.' } : f));
    }
  }

  async function agregar(archivos: File[]) {
    const nuevas = archivos.map(archivo => ({ id: siguienteId.current++, archivo, estado: 'convirtiendo' as const, sinTextos: false }));
    setFilas(actuales => [...actuales, ...nuevas]);
    // Leer de uno en uno para no acumular varios DXF grandes codificados a la vez.
    for (const fila of nuevas) await convertir(fila);
  }

  async function guardar(resultados: ResultadoCmt[]) {
    setGuardando(true); setErrorGuardado('');
    try {
      if (resultados.length === 1) await descargarCmt(resultados[0]);
      else await descargarTodos(resultados);
    } catch (error) {
      setErrorGuardado(`No se pudo guardar el CMT: ${error instanceof Error ? error.message : 'vuelve a intentarlo.'}`);
    } finally { setGuardando(false); }
  }

  return (
    <section className="cmt-vista" aria-label="Conversión de DXF a CMT">
      <div className="cmt-introduccion">
        <p>Convierte los DXF de corte para CUTMatic y descarga los CMT donde quieras. La leyenda se quita siempre.</p>
        {filas.length > 0 && <div className="cmt-acciones">
          <button type="button" className="ghost-button" disabled={convirtiendo || guardando} onClick={() => setFilas([])}>Limpiar lista</button>
          {filas.length > 1 && <button type="button" className="primary-button" disabled={!listos.length || guardando} onClick={() => void guardar(listos)}>Descargar todos{listos.length ? ` (${listos.length})` : ''}</button>}
        </div>}
      </div>
      <div className={`cmt-entrada panel-vidrio${arrastrando ? ' cmt-arrastrando' : ''}`}
        onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastrando(false); }}
        onDrop={e => { e.preventDefault(); setArrastrando(false); void agregar(Array.from(e.dataTransfer.files)); }}>
        <div><strong>Arrastra aquí uno o varios DXF</strong><p>Máximo 30 MB por fichero.</p></div>
        <input ref={selector} type="file" accept=".dxf" multiple className="sr-only" aria-label="Elegir ficheros DXF"
          onChange={e => { void agregar(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
        <button type="button" className="primary-button" onClick={() => selector.current?.click()}>Elegir DXF</button>
      </div>
      {errorGuardado && <p className="cmt-error" role="alert">{errorGuardado}</p>}
      <p className="cmt-progreso" role="status">{filas.length ? `${listos.length.toLocaleString('es-ES')} de ${filas.length.toLocaleString('es-ES')} ficheros listos${convirtiendo ? ' · Convirtiendo…' : ''}` : 'Los ficheros convertidos aparecerán aquí.'}</p>
      <div className="cmt-resultados">
        {filas.map(fila => <article key={fila.id} className="cmt-fichero panel-vidrio" aria-label={fila.archivo.name} aria-busy={fila.estado === 'convirtiendo'}>
          <div className="cmt-fichero-cabecera">
            <div className="cmt-nombre"><h3>{fila.archivo.name}</h3>{fila.sinTextos && <span>Sin textos</span>}</div>
            <span className={`cmt-estado ${fila.estado === 'listo' ? 'pildora-plantear' : 'pildora-aviso'}`}>{textoEstado(fila.estado)}</span>
            {fila.estado === 'listo' && fila.resultado && <button type="button" className="primary-button" disabled={guardando} onClick={() => void guardar([fila.resultado!])}>Descargar CMT</button>}
          </div>
          {fila.resultado && <>
            <div className="cmt-resumen">
              <span><strong>{medidasCmt(fila.resultado.resumen)}</strong>{fila.resultado.ok ? ' · Medidas del dibujo' : ' · Parte convertible'}</span>
              <span>{fila.resultado.resumen.objetos.toLocaleString('es-ES')} objetos</span>
            </div>
            {fila.resultado.resumen.porHerramienta.length > 0 && <dl className="cmt-herramientas" aria-label="Trazos por herramienta">
              {fila.resultado.resumen.porHerramienta.map(h => <div key={h.herramienta}><dt>{h.etiqueta}</dt><dd>{h.trazos.toLocaleString('es-ES')} {h.trazos === 1 ? 'trazo' : 'trazos'}</dd></div>)}
            </dl>}
            {fila.resultado.avisos.length > 0 && <div className="cmt-notas"><h4>Avisos</h4><ul>{fila.resultado.avisos.map(a => <li key={a}>{a}</li>)}</ul></div>}
            {fila.resultado.dudas.length > 0 && <div className="cmt-notas cmt-dudas"><h4>No se pudo convertir</h4><ul>{fila.resultado.dudas.map(d => <li key={d}>{d}</li>)}</ul>
              {permiteSinTextos(fila.resultado.dudas, fila.sinTextos) && <button type="button" className="ghost-button" onClick={() => void convertir(fila, true)}>Convertir sin textos</button>}
            </div>}
          </>}
          {fila.error && <p className="cmt-error" role="alert">{fila.error}</p>}
        </article>)}
      </div>
    </section>
  );
}
