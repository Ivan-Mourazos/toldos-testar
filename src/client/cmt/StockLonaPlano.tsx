import { useContext, useEffect, useId, useRef, useState } from 'react';
import {
  cuentaStockPlano, ERROR_STOCK_PLANO, PEDIDO_PLANO, propuestaLonasPlano, sumarLonasPlano,
  type DeteccionStockPlano, type PedidoStockPlano,
} from '../../cmt/stockPlano';
import { resolveFabric, serializeFabricSelection } from '../../domain/fabricCatalog.js';
import { normalizeOf } from '../../reviewRules.js';
import { CorteMaquinaContexto } from '../components/CorteMaquina';
import { FabricCombobox } from '../components/FabricCombobox';
import { metrosLona } from '../components/LonasEntrega';
import { ReadModeContext } from '../components/ReadMode';
import type { FabricStock } from '../fabricStock';
import { useFabricStocks } from '../hooks/useFabricStock';
import './stock-lona.css';

interface FilaLona { id: number; tela: string; metros: string }
interface Consulta { pedido: string; datos?: PedidoStockPlano; error?: string }

const RUTA = '/api/cmt/stock-lona';
const metros = (n: number, maximos = 1) => n.toLocaleString('es-ES', {
  minimumFractionDigits: 1, maximumFractionDigits: maximos, useGrouping: 'always',
} as unknown as Intl.NumberFormatOptions);

function CuentaLona({ codigo, descripcion, stock, necesita }: {
  codigo: string; descripcion?: string; stock: FabricStock; necesita: number | null;
}) {
  const cuenta = cuentaStockPlano(stock);
  const falta = necesita === null ? 0 : Math.round((necesita - cuenta.disponible) * 100) / 100;
  return <section className="stock-plano-cuenta">
    <h3>{codigo}{descripcion && descripcion !== codigo ? ` · ${descripcion}` : ''}</h3>
    <dl>
      <div><dt>Stock en almacén</dt><dd>{metros(cuenta.stock)} m</dd></div>
      <div><dt>− Reservado (otros pedidos)</dt><dd>{metros(cuenta.reservado)} m</dd></div>
      <div className="stock-plano-disponible"><dt>= Disponible</dt><dd>{metros(cuenta.disponible)} m</dd></div>
      <div><dt>Necesita este pedido</dt><dd>{necesita === null ? 'Por indicar' : `${metros(necesita, 2)} m`}</dd></div>
    </dl>
    <div className="stock-plano-estado">
      {cuenta.reservadoPropio > 0 && <small>Reservado para este pedido: {metros(cuenta.reservadoPropio)} m (no se resta)</small>}
      {necesita !== null && (falta > 0
        ? <strong className="fabric-stock-line is-aviso">No llega: faltan {metros(falta, 2)} m</strong>
        : <strong className="stock-plano-llega">✔ Llega</strong>)}
    </div>
  </section>;
}

export function StockLonaPlano({ deteccion, cerrar }: { deteccion: Extract<DeteccionStockPlano, { aplica: true }>; cerrar: () => void }) {
  const { usuario, notify } = useContext(CorteMaquinaContexto);
  const dialogo = useRef<HTMLDialogElement>(null);
  const contador = useRef(0);
  const titulo = useId();
  const [textoPedido, setTextoPedido] = useState(deteccion.pedido);
  const [entrega, setEntrega] = useState(deteccion.entrega?.toString() ?? '');
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [seleccion, setSeleccion] = useState<string[] | null>(null);
  const [textoOf, setTextoOf] = useState('');
  const [editadas, setEditadas] = useState<FilaLona[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const pedido = textoPedido.trim().toUpperCase();
  const pedidoValido = PEDIDO_PLANO.test(pedido);
  const resultado = consulta?.pedido === pedido ? consulta : null;
  const ordenes = resultado?.datos?.ordenes ?? [];
  const consultando = pedidoValido && !resultado;
  const manuales = textoOf.trim().split(/[\s,;]+/).filter(Boolean).map(normalizeOf);
  const ofValida = manuales.every(of => /^\d{7,9}$/.test(of));
  const marcadas = seleccion ?? (ordenes.length === 1 ? [ordenes[0].of] : []);
  const ofs = [...new Set([...marcadas, ...manuales.filter(of => /^\d{7,9}$/.test(of))])];
  const propuestas = propuestaLonasPlano(ordenes, ofs, deteccion.mlPropuesto);
  const filas = editadas ?? propuestas.map(({ codigo, descripcion, ml }, i) => ({
    id: -i - 1, tela: codigo ? serializeFabricSelection({ code: codigo, description: descripcion, family: 'LONA' }) : '',
    metros: ml?.toLocaleString('es-ES', { useGrouping: false, maximumFractionDigits: 2 }) ?? '',
  }));
  const lineas = filas.map(fila => {
    const tela = resolveFabric(fila.tela);
    return { codigo: tela?.code.toUpperCase() ?? '', descripcion: tela?.description, ml: metrosLona(fila.metros), ofs };
  });
  const necesidad = new Map(sumarLonasPlano(lineas).map(lona => [lona.codigo, lona.ml]));
  const telas = new Map(lineas.filter(fila => fila.codigo).map(fila => [fila.codigo, fila.descripcion]));
  const stocks = useFabricStocks(!consultando && ofs.length ? [...telas.keys()] : [], [...ordenes.map(o => o.of), ...ofs]);
  const sinStock = Object.values(stocks).some(stock => stock.status === 'error');
  const cargandoStock = Object.values(stocks).some(stock => stock.status === 'loading');
  const entregaValida = entrega === '' || (/^\d+$/.test(entrega) && Number.isSafeInteger(Number(entrega)) && Number(entrega) > 0);
  const filasValidas = lineas.length > 0 && lineas.every(fila => fila.codigo && fila.ml !== null && fila.ml >= 0.01);

  useEffect(() => {
    const modal = dialogo.current;
    if (modal && !modal.open) modal.showModal();
  }, []);

  useEffect(() => {
    if (!pedidoValido) return;
    const control = new AbortController();
    const espera = window.setTimeout(async () => {
      try {
        const respuesta = await fetch(RUTA + '?' + new URLSearchParams({ pedido }), { signal: control.signal });
        if (!respuesta.ok) throw new Error(ERROR_STOCK_PLANO);
        const datos: PedidoStockPlano = await respuesta.json();
        if (!control.signal.aborted) setConsulta({ pedido, datos });
      } catch {
        if (!control.signal.aborted) setConsulta({ pedido, error: ERROR_STOCK_PLANO });
      }
    }, 200);
    return () => { window.clearTimeout(espera); control.abort(); };
  }, [pedido, pedidoValido]);

  function cambiarPedido(value: string) {
    setTextoPedido(value);
    if (value.trim().toUpperCase() === pedido) return;
    setConsulta(null);
    setSeleccion(null);
    setTextoOf('');
    setEditadas(null);
    setError('');
  }

  function editar(id: number, cambios: Partial<FilaLona>) {
    setEditadas(filas.map(fila => fila.id === id ? { ...fila, ...cambios } : fila));
    setError('');
  }

  async function confirmar() {
    if (enviando) return;
    setEnviando(true);
    setError('');
    try {
      const respuesta = await fetch(RUTA, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido, entrega: entrega === '' ? null : Number(entrega), usuario, ofs,
          mlPropuesto: deteccion.mlPropuesto, lonas: lineas.map(({ codigo, ml }) => ({ codigo, ml })) }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || ERROR_STOCK_PLANO);
      notify('Stock de lona comprobado y enviado a CoordinaOT.', { tone: 'success' });
      dialogo.current?.close();
    } catch (e) {
      setError(e instanceof TypeError || !(e instanceof Error) ? ERROR_STOCK_PLANO : e.message);
    } finally {
      setEnviando(false);
    }
  }

  return <dialog className="stock-plano" ref={dialogo} aria-labelledby={titulo} onClose={cerrar}>
    <form onSubmit={e => { e.preventDefault(); void confirmar(); }}>
      <h2 id={titulo}>Comprobar stock de lona</h2>
      <div className="stock-plano-contenido">
        <fieldset disabled={enviando} className="stock-plano-campos">
          <div className="stock-plano-pedido">
            <label className="field">Pedido<input value={textoPedido} onChange={e => cambiarPedido(e.target.value)} autoFocus
              autoComplete="off" placeholder="AR…" aria-invalid={Boolean(textoPedido && !pedidoValido)} /></label>
            <label className="field">Entrega<input value={entrega} onChange={e => setEntrega(e.target.value)} inputMode="numeric"
              placeholder="Sin entrega" aria-invalid={!entregaValida} /></label>
          </div>
          <fieldset className="stock-plano-ofs">
            <legend>OF del corte</legend>
            {consultando && <p role="status">Consultando las OF del pedido…</p>}
            <div className="stock-plano-ofs-campos">
              {ordenes.length > 0 && <div className="stock-plano-ofs-opciones">{ordenes.map(({ of }) => <label key={of}>
                <input type="checkbox" checked={marcadas.includes(of)} onChange={e => {
                  setSeleccion(e.target.checked ? [...marcadas, of] : marcadas.filter(n => n !== of));
                  setError('');
                }} />{of}
              </label>)}</div>}
              <label className="field">{ordenes.length ? 'Otras OF' : 'Introduce las OF'}
                <input value={textoOf} onChange={e => { setTextoOf(e.target.value); setError(''); }}
                  placeholder="Separa las OF con comas" aria-invalid={!ofValida} />
              </label>
            </div>
          </fieldset>
          <ReadModeContext.Provider value={false}>
            {filas.map((fila, i) => <div key={fila.id} className="stock-plano-lona">
              <FabricCombobox label={i === 0 ? 'Lona' : `Lona ${i + 1}`} value={fila.tela} soloReferencia enfocarAlMontar={false}
                onChange={tela => editar(fila.id, { tela })} disabled={enviando} />
              <label className="field">ML<input inputMode="decimal" value={fila.metros} aria-label={`ML de lona ${i + 1}`}
                onChange={e => editar(fila.id, { metros: e.target.value })} /></label>
              <button type="button" className="ghost-button boton-3d" aria-label={`Quitar lona ${i + 1}`} onClick={() => {
                setEditadas(filas.filter(f => f.id !== fila.id));
                setError('');
              }}>Quitar</button>
            </div>)}
          </ReadModeContext.Provider>
          <div className="stock-plano-anadir">
            <button type="button" className="ghost-button boton-3d" onClick={() => {
              setEditadas([...filas, { id: contador.current++, tela: '', metros: '' }]);
              setError('');
            }}>Añadir lona</button>
            {deteccion.mlPropuesto !== null && propuestas.every(lona => lona.ml === null) &&
              <small>Largo de las piezas: {metros(deteccion.mlPropuesto, 2)} m</small>}
          </div>
        </fieldset>
        {cargandoStock && <p role="status">Consultando stock en RPS…</p>}
        {(error || resultado?.error || sinStock) && <p className="stock-plano-error" role="alert">
          {error || resultado?.error || ERROR_STOCK_PLANO}
        </p>}
        {telas.size > 0 && <div className="stock-plano-cuentas">
          {[...telas].map(([codigo, descripcion]) => {
            const estado = stocks[codigo];
            const sinMetros = lineas.some(fila => fila.codigo === codigo && (fila.ml === null || fila.ml < 0.01));
            return estado?.status === 'ready' ? <CuentaLona key={codigo} codigo={codigo} descripcion={descripcion} stock={estado.stock}
              necesita={sinMetros ? null : necesidad.get(codigo) ?? null} /> : null;
          })}
        </div>}
      </div>
      <footer>
        <button type="button" className="ghost-button boton-3d" onClick={() => dialogo.current?.close()}>Ahora no</button>
        <button type="submit" className="primary-button boton-3d"
          disabled={!pedidoValido || !entregaValida || !ofValida || !ofs.length || !filasValidas || consultando || cargandoStock || enviando}>
          {enviando ? 'Avisando a CoordinaOT…' : 'Confirmar y avisar a CoordinaOT'}
        </button>
      </footer>
    </form>
  </dialog>;
}
