import { useEffect, useState } from 'react';

// Buscador de planos de la carpeta del año (Iván, 23/11/2026): se elige el DWG de la oficina en una lista paginada,
// sin arrastrarlo. El plano elegido entra en la misma lista que los arrastrados.

export interface PlanoCarpeta {
  ruta: string;
  nombre: string;
  subcarpeta: string;
  modificado: string;
  tamano: number;
  abierto: boolean;
}

export interface PaginaPlanos {
  anio: number;
  total: number;
  pagina: number;
  paginas: number;
  porPagina: number;
  planos: PlanoCarpeta[];
}

type Buscar = typeof fetch;

/** Números de página a enseñar: primera, última y las de alrededor de la actual; `null` es un hueco («…»). */
export function paginasVisibles(actual: number, total: number): (number | null)[] {
  const numeros = [...new Set([1, total, actual - 1, actual, actual + 1])].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  return numeros.flatMap((n, i) => (i && n - numeros[i - 1] > 1 ? [null, n] : [n]));
}

export function fechaPlano(iso: string, ahora = new Date()): string {
  const fecha = new Date(iso);
  const dos = (n: number) => String(n).padStart(2, '0');
  const hora = `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
  if (fecha.toDateString() === ahora.toDateString()) return `Hoy ${hora}`;
  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  if (fecha.toDateString() === ayer.toDateString()) return `Ayer ${hora}`;
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)} ${hora}`;
}

async function leerError(respuesta: Response, porDefecto: string) {
  try {
    return (await respuesta.json()).error || porDefecto;
  } catch {
    return porDefecto;
  }
}

export function ListaPlanos({ datos, cargandoRuta, onElegir, onPagina }: {
  datos: PaginaPlanos;
  cargandoRuta?: string;
  onElegir: (plano: PlanoCarpeta) => void;
  onPagina: (pagina: number) => void;
}) {
  if (!datos.planos.length) return <p className="cmt-buscador-vacio">No hay ningún plano con ese texto en la carpeta de {datos.anio}.</p>;
  return <>
    <ul className="cmt-buscador-lista">
      {datos.planos.map(plano => <li key={plano.ruta}>
        <button type="button" className="cmt-buscador-plano" disabled={Boolean(cargandoRuta)} onClick={() => onElegir(plano)}
          title={plano.abierto ? 'Está abierto en ZWCAD: guarda el plano antes de mandarlo al corte.' : `Preparar ${plano.nombre} para el corte`}>
          <span className="cmt-buscador-nombre">
            <strong>{plano.nombre}</strong>
            {plano.subcarpeta && <small>{plano.subcarpeta}</small>}
          </span>
          {plano.abierto && <span className="cmt-estado pildora-aviso">Abierto en ZWCAD</span>}
          <span className="cmt-buscador-fecha">{cargandoRuta === plano.ruta ? 'Cargando…' : fechaPlano(plano.modificado)}</span>
        </button>
      </li>)}
    </ul>
    {datos.paginas > 1 && <nav className="cmt-buscador-paginas" aria-label="Páginas de planos">
      <button type="button" className="ghost-button" disabled={datos.pagina <= 1} onClick={() => onPagina(datos.pagina - 1)}>Anterior</button>
      <div className="segmented-control" role="group" aria-label="Página">
        {paginasVisibles(datos.pagina, datos.paginas).map((n, i) => n === null
          ? <span key={`hueco-${i}`} className="cmt-buscador-hueco" aria-hidden="true">…</span>
          : <button key={n} type="button" className={`segmented-option${n === datos.pagina ? ' active' : ''}`}
            aria-current={n === datos.pagina ? 'page' : undefined} onClick={() => onPagina(n)}>{n}</button>)}
      </div>
      <button type="button" className="ghost-button" disabled={datos.pagina >= datos.paginas} onClick={() => onPagina(datos.pagina + 1)}>Siguiente</button>
    </nav>}
  </>;
}

export function BuscadorPlanos({ onElegir, buscar = fetch }: { onElegir: (archivo: File) => void; buscar?: Buscar }) {
  const [texto, setTexto] = useState('');
  const [consulta, setConsulta] = useState({ texto: '', pagina: 1, actualizar: false });
  const [datos, setDatos] = useState<PaginaPlanos | null>(null);
  const [error, setError] = useState('');
  // Consulta ya contestada: mientras no sea la actual, se está leyendo la carpeta.
  const [respondida, setRespondida] = useState<typeof consulta | null>(null);
  const cargando = respondida !== consulta;
  const [cargandoRuta, setCargandoRuta] = useState<string>();

  // Espera a que se deje de escribir para no recorrer la carpeta en cada tecla.
  useEffect(() => {
    const espera = setTimeout(() => setConsulta(actual => actual.texto === texto.trim() ? actual : { texto: texto.trim(), pagina: 1, actualizar: false }), 250);
    return () => clearTimeout(espera);
  }, [texto]);

  useEffect(() => {
    const control = new AbortController();
    const parametros = new URLSearchParams({ texto: consulta.texto, pagina: String(consulta.pagina) });
    if (consulta.actualizar) parametros.set('actualizar', '1');
    buscar(`/api/cmt/planos?${parametros}`, { signal: control.signal })
      .then(async respuesta => {
        if (!respuesta.ok) throw new Error(await leerError(respuesta, 'No se pudo leer la carpeta de planos.'));
        setDatos(await respuesta.json());
        setError('');
      })
      .catch(e => { if (!control.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudo leer la carpeta de planos.'); })
      .finally(() => { if (!control.signal.aborted) setRespondida(consulta); });
    return () => control.abort();
  }, [consulta, buscar]);

  async function elegir(plano: PlanoCarpeta) {
    setCargandoRuta(plano.ruta);
    setError('');
    try {
      const respuesta = await buscar(`/api/cmt/planos/archivo?${new URLSearchParams({ ruta: plano.ruta })}`);
      if (!respuesta.ok) throw new Error(await leerError(respuesta, 'No se pudo leer el plano.'));
      onElegir(new File([await respuesta.blob()], plano.nombre, { lastModified: Date.parse(plano.modificado) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el plano.');
    } finally {
      setCargandoRuta(undefined);
    }
  }

  return <section className="cmt-buscador panel-vidrio" aria-label="Planos de la carpeta del año" aria-busy={cargando}>
    <div className="cmt-buscador-cabecera">
      <div>
        <strong>Planos de la oficina{datos ? ` de ${datos.anio}` : ''}</strong>
        <p>{datos ? `${datos.total.toLocaleString('es-ES')} ${datos.total === 1 ? 'plano' : 'planos'}${consulta.texto ? ' con ese texto' : ''}, del más reciente al más antiguo.` : 'Leyendo la carpeta…'}</p>
      </div>
      <label className="cmt-buscador-campo">
        <span className="sr-only">Buscar plano</span>
        <input type="search" value={texto} placeholder="Buscar por pedido o nombre, p. ej. 5626" autoComplete="off" spellCheck={false}
          onChange={e => setTexto(e.target.value)} />
      </label>
      <button type="button" className="ghost-button" disabled={cargando} title="Vuelve a leer la carpeta: para un plano que se acaba de guardar"
        onClick={() => setConsulta(actual => ({ ...actual, actualizar: true }))}>{cargando ? 'Leyendo…' : 'Actualizar'}</button>
    </div>
    {error && <p className="cmt-error" role="alert">{error}</p>}
    {datos && <ListaPlanos datos={datos} cargandoRuta={cargandoRuta} onElegir={plano => void elegir(plano)}
      onPagina={pagina => setConsulta(actual => ({ ...actual, pagina, actualizar: false }))} />}
  </section>;
}
