import { useContext, useEffect, useId, useRef, useState } from 'react';
import {
  cuentaStockPlano, ERROR_STOCK_PLANO, PEDIDO_PLANO, sumarLonasPlano,
  type DeteccionStockPlano, type PropuestaStockPlano,
} from '../../cmt/stockPlano';
import { resolveFabric, serializeFabricSelection } from '../../domain/fabricCatalog.js';
import { esLonaAcrilica, TEXTO_ACRILICA, TEXTO_RESERVAS } from '../../domain/stockSinComprobar.js';
import { CorteMaquinaContexto } from '../components/CorteMaquina';
import { FabricCombobox } from '../components/FabricCombobox';
import { metrosLona } from '../components/LonasEntrega';
import { ReadModeContext } from '../components/ReadMode';
import { resumenGrupoLona, type FabricStock } from '../fabricStock';
import { useFabricStocks, useGruposLona, type FabricStockState, type GrupoLona } from '../hooks/useFabricStock';
import './stock-lona.css';

interface FilaLona { id: number; tela: string; metros: string }
interface Consulta { pedido: string; datos?: PropuestaStockPlano; error?: string }

const RUTA = '/api/cmt/stock-lona';
const metros = (n: number, maximos = 1) => n.toLocaleString('es-ES', {
  minimumFractionDigits: 1, maximumFractionDigits: maximos, useGrouping: 'always',
} as unknown as Intl.NumberFormatOptions);

// La lona y todas sus marcas del mismo ancho (domain/lonaSimple.js). El pedido sale de una sola
// bobina (Iván, 26/11/2026): llega si alguna bobina sola tiene sitio, no por el total.
export function CuentaLona({ codigo, descripcion, grupo, stocks, necesita }: {
  codigo: string; descripcion?: string; grupo: GrupoLona | null; stocks: Record<string, FabricStock>; necesita: number | null;
}) {
  const { marcas, mayor, mejor, veredicto } = resumenGrupoLona(codigo, grupo, stocks, necesita);
  const cuentas = marcas.map(stock => ({ stock, cuenta: cuentaStockPlano(stock) }));
  const suma = (clave: 'stock' | 'reservado' | 'disponible' | 'reservadoPropio') => cuentas.reduce((total, m) => total + m.cuenta[clave], 0);
  const titulo = grupo?.nombre ?? `${codigo}${descripcion && descripcion !== codigo ? ` · ${descripcion}` : ''}`;
  return <section className="stock-plano-cuenta">
    <h3>{titulo}</h3>
    {cuentas.length > 1 && <ul className="stock-plano-marcas">{cuentas.map(m => <li key={m.stock.code}>
      <span>{m.stock.code}</span>
      <span>{metros(m.cuenta.disponible)} m · bobina mayor {metros(m.stock.mayorBobinaDisponible)} m</span>
    </li>)}</ul>}
    <dl>
      <div><dt>Stock en almacén</dt><dd>{metros(suma('stock'))} m</dd></div>
      <div><dt>− Reservado (otros pedidos)</dt><dd>{metros(suma('reservado'))} m</dd></div>
      <div className="stock-plano-disponible"><dt>= Disponible</dt><dd>{metros(suma('disponible'))} m</dd></div>
      <div><dt>Bobina mayor</dt><dd>{metros(mayor)} m{cuentas.length > 1 && mejor ? ` (${mejor.code})` : ''}</dd></div>
      <div><dt>Necesita este pedido</dt><dd>{necesita === null ? 'Por indicar' : `${metros(necesita, 2)} m`}</dd></div>
    </dl>
    <div className="stock-plano-estado">
      {suma('reservadoPropio') > 0 && <small>Reservado para este pedido: {metros(suma('reservadoPropio'))} m (no se resta)</small>}
      {veredicto && <strong className={veredicto.llega ? 'stock-plano-llega' : 'fabric-stock-line is-aviso'}>{veredicto.texto}</strong>}
    </div>
  </section>;
}

export function StockLonaPlano({ deteccion, cerrar }: { deteccion: Extract<DeteccionStockPlano, { aplica: true }>; cerrar: () => void }) {
  const { usuario, notify } = useContext(CorteMaquinaContexto);
  const dialogo = useRef<HTMLDialogElement>(null);
  const contador = useRef(0);
  const titulo = useId();
  const [textoPedido, setTextoPedido] = useState(deteccion.pedido);
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [editadas, setEditadas] = useState<FilaLona[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const pedido = textoPedido.trim().toUpperCase();
  const pedidoValido = PEDIDO_PLANO.test(pedido);
  const resultado = consulta?.pedido === pedido ? consulta : null;
  const consultando = pedidoValido && !resultado;
  // Todas las OF del pedido: su reserva cuenta como propia.
  const ofsPedido = resultado?.datos?.ofs ?? [];
  const filas = editadas ?? (resultado?.datos?.lonas ?? []).map(({ codigo, descripcion, ml }, i) => ({
    id: -i - 1, tela: codigo ? serializeFabricSelection({ code: codigo, description: descripcion, family: 'LONA' }) : '',
    metros: ml.toLocaleString('es-ES', { useGrouping: false, maximumFractionDigits: 2 }),
  }));
  const lineas = filas.map(fila => {
    const tela = resolveFabric(fila.tela);
    return { codigo: tela?.code.toUpperCase() ?? '', descripcion: tela?.description, ml: metrosLona(fila.metros) };
  });
  const necesidad = new Map(sumarLonasPlano(lineas).map(lona => [lona.codigo, lona.ml]));
  const telas = new Map(lineas.filter(fila => fila.codigo).map(fila => [fila.codigo, fila.descripcion]));
  // Las acrílicas (se asignan con el Excel) y las OF incluidas en reservas no se comprueban: ni se consulta su stock ni el servidor las cuenta.
  // Si solo algunas OF están incluidas en reservas, el servidor quita sus lonas.
  const enReservas = resultado?.datos?.enReservas ?? [];
  const todoEnReservas = ofsPedido.length > 0 && ofsPedido.every(of => enReservas.some(fila => fila.of === of));
  const noSeComprueba = (codigo: string) => todoEnReservas || esLonaAcrilica({ codigo, descripcion: telas.get(codigo) });
  const aComprobar = !consultando && ofsPedido.length ? [...telas.keys()].filter(codigo => !noSeComprueba(codigo)) : [];
  // Cada lona trae las de otras marcas y anchos: su stock también se enseña.
  const grupos = useGruposLona(aComprobar);
  const grupoDe = (codigo: string) => { const g = grupos[codigo]; return g?.status === 'ready' ? g.grupo : null; };
  const gruposListos = aComprobar.every(codigo => grupos[codigo] && grupos[codigo].status !== 'loading');
  const stocks: Record<string, FabricStockState> = useFabricStocks(gruposListos ? aComprobar.flatMap(codigo => {
    const g = grupoDe(codigo);
    return g ? [codigo, ...g.mismoAncho, ...g.masAnchas.map(a => a.codigo)] : [codigo];
  }) : [], ofsPedido);
  const sinStock = Object.values(stocks).some(stock => stock.status === 'error');
  const cargandoStock = !gruposListos || Object.values(stocks).some(stock => stock.status === 'loading');
  const filasValidas = lineas.length > 0 && lineas.every(fila => fila.codigo && fila.ml !== null && fila.ml >= 0.01);
  const sinOf = Boolean(resultado?.datos && !ofsPedido.length);

  useEffect(() => {
    const modal = dialogo.current;
    if (modal && !modal.open) modal.showModal();
  }, []);

  useEffect(() => {
    if (!pedidoValido) return;
    const control = new AbortController();
    const espera = window.setTimeout(async () => {
      try {
        const respuesta = await fetch(RUTA + '/propuesta', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: control.signal,
          body: JSON.stringify({ pedido, tramos: deteccion.tramos }),
        });
        if (!respuesta.ok) throw new Error(ERROR_STOCK_PLANO);
        const datos: PropuestaStockPlano = await respuesta.json();
        if (!control.signal.aborted) setConsulta({ pedido, datos });
      } catch {
        if (!control.signal.aborted) setConsulta({ pedido, error: ERROR_STOCK_PLANO });
      }
    }, 200);
    return () => { window.clearTimeout(espera); control.abort(); };
  }, [pedido, pedidoValido, deteccion.tramos]);

  function cambiarPedido(value: string) {
    setTextoPedido(value);
    if (value.trim().toUpperCase() === pedido) return;
    setConsulta(null);
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
        body: JSON.stringify({ pedido, usuario, tramos: deteccion.tramos, lonas: lineas.map(({ codigo, ml }) => ({ codigo, ml })) }),
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
            {consultando && <p role="status">Leyendo las lonas del plano…</p>}
          </div>
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
          </div>
        </fieldset>
        {cargandoStock && <p role="status">Consultando stock en RPS…</p>}
        {(error || resultado?.error || sinStock || sinOf) && <p className="stock-plano-error" role="alert">
          {error || resultado?.error || (sinOf ? `El pedido ${pedido} no tiene OF en RPS.` : ERROR_STOCK_PLANO)}
        </p>}
        {enReservas.length > 0 && !todoEnReservas && <ul className="stock-plano-reservas">{enReservas.map(({ of, codigo }) =>
          <li key={of}>OF <strong>{of}</strong> ({codigo}) · {TEXTO_RESERVAS}</li>)}</ul>}
        {telas.size > 0 && <div className="stock-plano-cuentas">
          {[...telas].map(([codigo, descripcion]) => {
            if (noSeComprueba(codigo)) return <section key={codigo} className="stock-plano-cuenta">
              <h3>{codigo}{descripcion && descripcion !== codigo ? ` · ${descripcion}` : ''}</h3>
              <p>{todoEnReservas ? `Pedido ${TEXTO_RESERVAS[0].toLowerCase()}${TEXTO_RESERVAS.slice(1)}` : TEXTO_ACRILICA}</p>
            </section>;
            const estado = stocks[codigo];
            const sinMetros = lineas.some(fila => fila.codigo === codigo && (fila.ml === null || fila.ml < 0.01));
            const listos = Object.fromEntries(Object.entries(stocks).flatMap(([c, s]) => s.status === 'ready' ? [[c, s.stock]] : []));
            return estado?.status === 'ready' ? <CuentaLona key={codigo} codigo={codigo} descripcion={descripcion} grupo={grupoDe(codigo)}
              stocks={listos} necesita={sinMetros ? null : necesidad.get(codigo) ?? null} /> : null;
          })}
        </div>}
      </div>
      <footer>
        <button type="button" className="ghost-button boton-3d" onClick={() => dialogo.current?.close()}>Ahora no</button>
        <button type="submit" className="primary-button boton-3d"
          disabled={!pedidoValido || sinOf || !filasValidas || consultando || cargandoStock || enviando}>
          {enviando ? 'Avisando a CoordinaOT…' : 'Confirmar y avisar a CoordinaOT'}
        </button>
      </footer>
    </form>
  </dialog>;
}
