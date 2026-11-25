import React, { useId } from 'react';
import { Eraser, FilePen, RefreshCw } from 'lucide-react';
import { MenuMas } from './MenuMas';
import type { FlujoCorteDwg } from '../flujoCorteDwg';
import { regenerarCortePedido } from '../toldosEditable';

function Opcion({ icono: Icono, titulo, detalle, motivo, peligro = false, accion }: {
  icono: typeof Eraser; titulo: string; detalle: string; motivo?: string; peligro?: boolean; accion: () => unknown;
}) {
  const id = useId();
  return <button type="button" role="menuitem" tabIndex={-1}
    aria-label={titulo} aria-describedby={id} className={`menu-mas-item menu-mas-opcion${peligro ? ' menu-mas-peligro' : ''}`}
    disabled={Boolean(motivo)} onClick={accion}>
    <Icono size={16} aria-hidden="true" />
    <span>{titulo}<small id={id}>{motivo || detalle}</small></span>
  </button>;
}

export function MenuOpcionesPedido({ corte, ocupado, motivoBorrador, motivoRegenerar, guardarBorrador, regenerar, limpiar }: {
  corte: Pick<FlujoCorteDwg, 'usuario' | 'preguntar'>; ocupado: boolean; motivoBorrador?: string; motivoRegenerar?: string;
  guardarBorrador: () => Promise<boolean>; regenerar: () => Promise<void>; limpiar: () => void | Promise<void>;
}) {
  const espera = ocupado ? 'Espera a que termine la operación.' : undefined;
  return <MenuMas etiqueta="Más opciones">
    <Opcion icono={FilePen} titulo="Guardar borrador" detalle="Continúa el pedido más tarde." motivo={espera ?? motivoBorrador} accion={guardarBorrador} />
    <hr className="menu-mas-separador" role="separator" />
    <Opcion icono={RefreshCw} titulo="Regenerar corte" detalle="Guarda el pedido y rehace su plano."
      motivo={espera ?? motivoRegenerar ?? (!corte.usuario ? 'Elige quién eres en «Soy».' : undefined)}
      accion={() => regenerarCortePedido(corte.preguntar, regenerar)} />
    <hr className="menu-mas-separador" role="separator" />
    <Opcion icono={Eraser} titulo="Limpiar" detalle="Vacía el formulario actual." motivo={espera} peligro accion={limpiar} />
  </MenuMas>;
}
