import { useEffect, useState, type FormEvent } from 'react';
import { CAPAS_FIJAS, claveCapa } from '../../cmt/preparacion/capas.ts';
import { HERRAMIENTAS, type Herramienta } from '../../cmt/preparacion/tipos.ts';
import { ETIQUETAS } from '../cmt/Pendientes';
import '../cmt/cmt.css';

type Tabla = Record<string, Herramienta>;
const esEditable = (capa: string) => capa !== '' && capa !== '0' && !Object.hasOwn(CAPAS_FIJAS, capa);

export function filasCapas(tabla: Tabla) {
  return Object.entries(tabla).filter(([nombre]) => esEditable(claveCapa(nombre)))
    .sort(([a], [b]) => a.localeCompare(b, 'es'));
}

export function editarCapa(tabla: Tabla, nombre: string, herramienta: Herramienta | null): Tabla {
  const capa = claveCapa(nombre);
  if (!esEditable(capa)) throw new Error('Elige un nombre de capa que no sea una capa fija.');
  if (capa.length > 255) throw new Error('El nombre de capa supera los 255 caracteres.');
  const siguiente = { ...tabla };
  if (herramienta === null) delete siguiente[capa];
  else siguiente[capa] = herramienta;
  return siguiente;
}

async function peticionTabla(pedir: typeof fetch, init: RequestInit): Promise<Tabla> {
  const r = await pedir('/api/cmt/capas', init);
  const datos = await r.json();
  if (!r.ok) throw new Error(datos.error ?? 'No se pudo abrir la tabla de capas.');
  return datos.tabla;
}

export const leerTablaCapas = (pedir: typeof fetch = fetch, signal?: AbortSignal) => peticionTabla(pedir, { method: 'GET', signal });
export const guardarTablaCapas = (tabla: Tabla, pedir: typeof fetch = fetch) => peticionTabla(pedir, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tabla }),
});

const mensajeError = (error: unknown) => error instanceof Error ? error.message : 'No se pudo guardar la tabla de capas.';

interface FormProps {
  tabla: Tabla;
  ocupado: boolean;
  onCambio: (tabla: Tabla) => void;
  onGuardar: () => void;
  sucio?: boolean;
  mensaje?: string;
}
export function TablaCapasCorteForm({ tabla, ocupado, onCambio, onGuardar, sucio = false, mensaje = '' }: FormProps) {
  const [nombre, setNombre] = useState('');
  const [herramienta, setHerramienta] = useState<Herramienta | ''>('');
  const [error, setError] = useState('');
  const filas = filasCapas(tabla);
  function anadir(evento: FormEvent) {
    evento.preventDefault();
    if (!herramienta) return;
    try {
      if (Object.hasOwn(tabla, claveCapa(nombre))) throw new Error('Esa capa ya está en la tabla.');
      onCambio(editarCapa(tabla, nombre, herramienta));
      setNombre('');
      setHerramienta('');
      setError('');
    } catch (e) {
      setError(mensajeError(e));
    }
  }
  return <section className="cmt-config-capas" aria-label="Capas del corte">
    <h3>Capas del corte</h3>
    <p>Asigna una herramienta a las capas que usas al preparar DWG y DXF.</p>
    <table className="cmt-tabla-capas">
      <thead><tr><th scope="col">Capa</th><th scope="col">Herramienta</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
      <tbody>
        {filas.map(([capa, h]) => <tr key={capa}>
          <th scope="row">{capa}</th>
          <td><select aria-label={`Herramienta para ${capa}`} value={h} disabled={ocupado}
            onChange={e => onCambio(editarCapa(tabla, capa, e.target.value as Herramienta))}>
            {HERRAMIENTAS.map(opcion => <option key={opcion} value={opcion}>{ETIQUETAS[opcion]}</option>)}
          </select></td>
          <td><button type="button" className="ghost-button" aria-label={`Quitar ${capa}`} disabled={ocupado}
            onClick={() => onCambio(editarCapa(tabla, capa, null))}>Quitar</button></td>
        </tr>)}
        {!filas.length && <tr><td colSpan={3}>Aún no hay capas guardadas.</td></tr>}
      </tbody>
    </table>
    <form className="cmt-tabla-capas cmt-capa-nueva" onSubmit={anadir}>
      <label>Nombre de capa<input value={nombre} maxLength={255} disabled={ocupado} onChange={e => setNombre(e.target.value)} /></label>
      <label>Herramienta<select aria-label="Herramienta de la capa nueva" value={herramienta} disabled={ocupado} onChange={e => setHerramienta(e.target.value as Herramienta | '')}>
        <option value="">Elegir…</option>
        {HERRAMIENTAS.map(h => <option key={h} value={h}>{ETIQUETAS[h]}</option>)}
      </select></label>
      <button type="submit" className="ghost-button" disabled={ocupado || !nombre.trim() || !herramienta}>Añadir capa</button>
    </form>
    {error && <p className="cmt-error" role="alert">{error}</p>}
    <div className="cmt-resultado-acciones">
      <button type="button" className="primary-button" disabled={ocupado || !sucio} onClick={onGuardar}>{ocupado ? 'Guardando…' : 'Guardar capas'}</button>
      <span className="cmt-progreso" role="status">{mensaje}</span>
    </div>
  </section>;
}

export function TablaCapasCorte() {
  const [tabla, setTabla] = useState<Tabla | null>(null);
  const [sucio, setSucio] = useState(false);
  const [intento, setIntento] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  useEffect(() => {
    const carga = new AbortController();
    void leerTablaCapas(fetch, carga.signal).then(setTabla).catch(e => {
      if (!carga.signal.aborted) setError(mensajeError(e));
    });
    return () => carga.abort();
  }, [intento]);

  async function guardar() {
    if (!tabla) return;
    setError('');
    setMensaje('');
    setOcupado(true);
    try {
      setTabla(await guardarTablaCapas(tabla));
      setSucio(false);
      setMensaje('Capas guardadas.');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  if (!tabla) return <section className="cmt-config-capas" aria-label="Capas del corte">
    <h3>Capas del corte</h3>
    {error ? <><p className="cmt-error" role="alert">{error}</p>
      <button type="button" className="ghost-button" onClick={() => { setError(''); setIntento(i => i + 1); }}>Volver a cargar</button></>
      : <p role="status">Cargando capas…</p>}
  </section>;

  return <>
    <TablaCapasCorteForm tabla={tabla} ocupado={ocupado} sucio={sucio} mensaje={mensaje}
      onCambio={siguiente => { setTabla(siguiente); setSucio(true); setMensaje('Cambios sin guardar.'); }}
      onGuardar={() => void guardar()} />
    {error && <p className="cmt-error" role="alert">{error}</p>}
  </>;
}
