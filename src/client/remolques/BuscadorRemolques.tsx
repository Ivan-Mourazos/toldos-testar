import React, { useEffect, useState } from 'react';
import { FileSearch, Search, X } from 'lucide-react';
import { PERFILES } from '../../remolques/calc/params.ts';
import { etiquetaOpcion } from '../../remolques/etiquetas.ts';
import { CAMPOS_MEDIDA, MARGEN_POR_DEFECTO, type CampoMedida, type FiltrosBusqueda } from '../../remolques/flujo/buscar.ts';
import type { Notify } from '../components/NotificationCenter';
import { SelectField } from '../components/SelectField';
import {
  buscarRemolques, ETIQUETAS_MEDIDA, fechaCorta, filtrosDesdeFormulario, formularioVacio, leerOpcionesBuscador, textoCliente, textoContador,
  textoCorte, textoMedidas, textoRecogidas,
  type EstadoBuscador, type FormularioBusqueda, type MedidaFormulario, type OpcionesBuscador,
} from './busquedaRemolques';
import { InputDecimal } from './InputDecimal';
import { formatearNumeroEs } from './numeroEs';

// Buscador de remolques en Pedidos (diseño 02/10/2026): filtros por las características del
// remolque sobre todos los pedidos guardados y una fila por elemento. Pulsar una fila abre la
// ficha de lectura del pedido con ese elemento elegido. Los filtros y el último resultado viven en
// ReviewsView (`estado`), para que sigan ahí al volver del pedido. Mismas piezas que Pedidos.

const CUALQUIERA = 'Cualquiera';
type Opcion<T extends string> = { value: T; label: string };

const TIPOS: Opcion<FormularioBusqueda['tipo']>[] = [
  { value: '', label: 'Todos' }, { value: 'lona', label: 'Lona' }, { value: 'baqueton', label: 'Baquetón' },
];
const ESTADOS: Opcion<FormularioBusqueda['estado']>[] = [
  { value: '', label: 'Todos' }, { value: 'pendientes', label: 'Pendientes' }, { value: 'generados', label: 'Generados' },
];
const LADOS: Opcion<FormularioBusqueda['ladoRecogida']>[] = [
  { value: 'cualquiera', label: 'Cualquier lado' }, { value: 'delante', label: 'Delante' }, { value: 'detras', label: 'Detrás' },
];
const SI_NO: Opcion<FormularioBusqueda['ventana']>[] = [
  { value: '', label: 'Da igual' }, { value: 'si', label: 'Sí' }, { value: 'no', label: 'No' },
];
const CAMPOS_SI_NO = [
  ['ventana', 'Ventana'], ['rotulacion', 'Rotulación'], ['bastilla', 'Bastilla de enfundar'], ['detrasDistinto', 'Detrás distinto'],
] as const;

/** Una tira de teclas como «Pendientes de» en Pedidos. */
function Tira<T extends string>({ etiqueta, valor, opciones, onCambio }: {
  etiqueta: string;
  valor: T;
  opciones: Opcion<T>[];
  onCambio: (valor: T) => void;
}) {
  return (
    <div className="buscador-campo">
      <span className="buscador-rotulo" aria-hidden="true">{etiqueta}</span>
      <div className="orders-scope tira-3d glass-chip" role="group" aria-label={etiqueta}>
        {opciones.map((opcion) => (
          <button key={opcion.value} type="button" className={valor === opcion.value ? 'pestana-activa' : undefined}
            aria-pressed={valor === opcion.value} onClick={() => onCambio(opcion.value)}>
            {opcion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Una medida con su margen: «Largo [250] ± [5] cm». Vacía no filtra; margen vacío = ± 5. */
function Medida({ campo, medida, onCambio }: { campo: CampoMedida; medida: MedidaFormulario; onCambio: (medida: MedidaFormulario) => void }) {
  const etiqueta = ETIQUETAS_MEDIDA[campo];
  return (
    <div className="buscador-medida">
      <span className="buscador-rotulo">{etiqueta}</span>
      <InputDecimal aria-label={etiqueta} placeholder="—" value={medida.valor} onValor={(valor) => onCambio({ ...medida, valor })} />
      <span className="buscador-mas-menos" aria-hidden="true">±</span>
      <InputDecimal aria-label={`Margen de ${etiqueta.toLocaleLowerCase('es-ES')}`} placeholder={formatearNumeroEs(MARGEN_POR_DEFECTO)}
        value={medida.margen} onValor={(margen) => onCambio({ ...medida, margen })} />
      <span className="buscador-unidad" aria-hidden="true">cm</span>
    </div>
  );
}

export function BuscadorRemolques({ estado, onEstado, onVolver, onAbrir, onToast }: {
  estado: EstadoBuscador;
  onEstado: React.Dispatch<React.SetStateAction<EstadoBuscador>>;
  onVolver: () => void;
  /** Abre la ficha del pedido con ese elemento (por su versión) elegido. */
  onAbrir: (orderCode: string, version: string) => void;
  onToast: Notify;
}) {
  const { formulario, resultado } = estado;
  const [opciones, setOpciones] = useState<OpcionesBuscador>({ recogidas: [], clientes: [] });
  // La búsqueda en marcha. La primera vez que se abre, sin filtros: salen los más nuevos.
  const [peticion, setPeticion] = useState<{ filtros: FiltrosBusqueda } | null>(
    () => (resultado ? null : { filtros: filtrosDesdeFormulario(formulario) }),
  );
  const buscando = peticion !== null;

  useEffect(() => {
    let activo = true;
    void leerOpcionesBuscador().then((leidas) => { if (activo) setOpciones(leidas); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!peticion) return undefined;
    let activo = true;
    buscarRemolques(peticion.filtros)
      .then((nuevo) => { if (activo) onEstado((actual) => ({ ...actual, resultado: nuevo })); })
      .catch((error: unknown) => {
        if (!activo) return;
        // Sin resultado viejo en pantalla: se leería como la respuesta a los filtros nuevos.
        onEstado((actual) => ({ ...actual, resultado: null }));
        onToast(error instanceof Error ? error.message : 'No se pudo buscar en los pedidos de remolques.', { tone: 'error' });
      })
      .finally(() => { if (activo) setPeticion((actual) => (actual === peticion ? null : actual)); });
    return () => { activo = false; };
  }, [peticion, onEstado, onToast]);

  const cambiar = (cambios: Partial<FormularioBusqueda>) =>
    onEstado((actual) => ({ ...actual, formulario: { ...actual.formulario, ...cambios } }));
  const cambiarMedida = (campo: CampoMedida, medida: MedidaFormulario) =>
    onEstado((actual) => ({ ...actual, formulario: { ...actual.formulario, medidas: { ...actual.formulario.medidas, [campo]: medida } } }));
  const buscar = (evento: React.FormEvent) => {
    evento.preventDefault();
    setPeticion({ filtros: filtrosDesdeFormulario(formulario) });
  };
  const quitarFiltros = () => {
    onEstado((actual) => ({ ...actual, formulario: formularioVacio() }));
    setPeticion({ filtros: {} });
  };

  const perfilElegido = PERFILES.find((perfil) => perfil.value === formulario.perfil)?.label ?? CUALQUIERA;
  const recogidaElegida = formulario.recogida ? etiquetaOpcion(formulario.recogida) : CUALQUIERA;

  return (
    <section className="buscador-remolques" aria-label="Buscar remolques">
      <form className="buscador-form" onSubmit={buscar}>
        <header className="buscador-cabecera">
          <button type="button" className="ghost-button boton-3d reviews-back-button" onClick={onVolver}>← Pedidos</button>
          <h2>Buscar remolques</h2>
          <label className="orders-search">
            <Search aria-hidden="true" />
            <input type="search" value={formulario.texto} onChange={(evento) => cambiar({ texto: evento.target.value })}
              placeholder="Pedido, cliente, OF u observaciones…" aria-label="Buscar en los remolques" />
          </label>
          <div className="buscador-acciones">
            <button type="button" className="ghost-button boton-3d" disabled={buscando} onClick={quitarFiltros}>
              <X aria-hidden="true" />Quitar filtros
            </button>
            <button type="submit" className="primary-button boton-3d" disabled={buscando}>
              <Search aria-hidden="true" />Buscar
            </button>
          </div>
        </header>

        <div className="buscador-filtros bloque-3d-hundido">
          <label className="buscador-campo">
            <span className="buscador-rotulo">Cliente</span>
            <input type="text" list="buscador-clientes" value={formulario.cliente} placeholder="Nombre, ficha o código de RPS"
              onChange={(evento) => cambiar({ cliente: evento.target.value })} />
            <datalist id="buscador-clientes">
              {opciones.clientes.map(({ nombre, codigos }) => (
                <option key={nombre} value={nombre} label={codigos.length ? `${nombre} · RPS ${codigos.join(', ')}` : undefined} />
              ))}
            </datalist>
          </label>
          <Tira etiqueta="Tipo" valor={formulario.tipo} opciones={TIPOS} onCambio={(tipo) => cambiar({ tipo })} />
          <div className="buscador-campo">
            <SelectField label="Perfil" value={perfilElegido} options={[CUALQUIERA, ...PERFILES.map((perfil) => perfil.label)]}
              onChange={(valor) => cambiar({ perfil: PERFILES.find((perfil) => perfil.label === valor)?.value ?? '' })} />
          </div>
          <Tira etiqueta="Estado" valor={formulario.estado} opciones={ESTADOS} onCambio={(valor) => cambiar({ estado: valor })} />

          <div className="buscador-campo">
            <SelectField label="Recogida" value={recogidaElegida} options={[CUALQUIERA, ...opciones.recogidas.map(etiquetaOpcion)]}
              onChange={(valor) => cambiar({ recogida: opciones.recogidas.find((recogida) => etiquetaOpcion(recogida) === valor) ?? '' })} />
          </div>
          <Tira etiqueta="Lado de la recogida" valor={formulario.ladoRecogida} opciones={LADOS}
            onCambio={(ladoRecogida) => cambiar({ ladoRecogida })} />
          <label className="buscador-campo">
            <span className="buscador-rotulo">Material</span>
            <input type="text" value={formulario.material} placeholder="ALPHA, 7038…" onChange={(evento) => cambiar({ material: evento.target.value })} />
          </label>
          <div className="buscador-fechas">
            <label className="buscador-campo">
              <span className="buscador-rotulo">Desde</span>
              <input type="date" value={formulario.desde} onChange={(evento) => cambiar({ desde: evento.target.value })} />
            </label>
            <label className="buscador-campo">
              <span className="buscador-rotulo">Hasta</span>
              <input type="date" value={formulario.hasta} onChange={(evento) => cambiar({ hasta: evento.target.value })} />
            </label>
          </div>

          <div className="buscador-medidas">
            {CAMPOS_MEDIDA.map((campo) => (
              <Medida key={campo} campo={campo} medida={formulario.medidas[campo]} onCambio={(medida) => cambiarMedida(campo, medida)} />
            ))}
          </div>

          {CAMPOS_SI_NO.map(([campo, etiqueta]) => (
            <Tira key={campo} etiqueta={etiqueta} valor={formulario[campo]} opciones={SI_NO}
              onCambio={(valor) => cambiar({ [campo]: valor } as Partial<FormularioBusqueda>)} />
          ))}
        </div>
      </form>

      {buscando ? (
        <p className="buscador-contador" role="status">Buscando…</p>
      ) : resultado && resultado.total === 0 ? (
        <p className="review-empty buscador-contador" role="status"><FileSearch aria-hidden="true" />{textoContador(resultado)}</p>
      ) : resultado && (
        <p className="buscador-contador" role="status">{textoContador(resultado)}</p>
      )}
      {!buscando && resultado?.cortado && <p className="buscador-aviso pildora-aviso" role="note">{textoCorte(resultado)}</p>}

      {resultado && resultado.filas.length > 0 && (
        <div className="buscador-resultados">
          <div className="buscador-columnas" aria-hidden="true">
            <span>Pedido</span><span>Cliente</span><span>Fecha</span><span>Perfil</span><span>Medidas</span>
            <span>Recogidas (delante / detrás)</span><span>Material</span><span>Estado</span>
          </div>
          <ul className="buscador-lista" aria-label="Remolques encontrados">
            {resultado.filas.map((fila) => (
              <li key={`${fila.orderCode}-${fila.version}`}>
                <button type="button" className="buscador-fila bloque-3d" aria-label={`Abrir ${fila.numeroPedido} · ${fila.letra}`}
                  onClick={() => onAbrir(fila.orderCode, fila.version)}>
                  <strong className="buscador-pedido">{fila.numeroPedido}<span>{` · ${fila.letra}`}</span></strong>
                  {/* El código de RPS siempre se ve: si no cabe, se corta el nombre. */}
                  <span className="buscador-cliente" title={textoCliente(fila)}>
                    <span>{fila.cliente || 'Sin cliente'}</span>
                    {fila.codigoCliente && <>{' '}<span className="buscador-cliente-codigo">· {fila.codigoCliente}</span></>}
                  </span>
                  <span>{fechaCorta(fila.fecha)}</span>
                  <span>{fila.modelo}</span>
                  <span>{textoMedidas(fila)}</span>
                  <span>{textoRecogidas(fila)}</span>
                  <span title={fila.material}>{fila.material || '—'}</span>
                  <span className={fila.estado === 'PRODUCED' ? 'pildora-plantear' : 'pildora-revisar'}>
                    {fila.estado === 'PRODUCED' ? 'Generado' : 'Pendiente'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
