import React, { useContext, useState } from 'react';
import { Factory, FileText, PencilRuler, Scissors } from 'lucide-react';
import type { DestinoEntrega } from '../../entregasTipos';
import type { AskForConfirmation, Notify } from './NotificationCenter';
import { MenuMas } from './MenuMas';
import { ElegirDestinoEntrega } from './DestinoEntrega';
import { CorteMaquinaContexto } from './CorteMaquina';
import { EnviosCorte } from './EnviosCorte';
import { ejecutarSalidaPedido } from '../salidaPedido';

/** Las tres familias comparten acciones, confirmaciones y vuelta al listado. */
export function ProduccionPedido({ ruta, rutaPdf, rutaPlano, rutaCorte, tecnico, codigo, generado, permitido, motivo, ocupado,
  usuario, notify, preguntar, onChanged, onVolver, guardado, mas }: {
  ruta: string; rutaPdf: string; rutaPlano: string; rutaCorte?: string; tecnico: string; codigo: string;
  generado: boolean; permitido: boolean; motivo: string; ocupado: boolean; usuario: string; notify: Notify; preguntar: AskForConfirmation;
  onChanged?: () => void; onVolver: () => void; guardado: { ruta: string; cuerpo: Record<string, unknown>; usuario: string }; mas?: React.ReactNode;
}) {
  const { settings } = useContext(CorteMaquinaContexto);
  const [trabajando, setTrabajando] = useState(false);
  const [eleccion, elegir] = useState<'produccion' | 'pdf' | 'dxf' | null>(null);
  async function ejecutar(accion: 'produccion' | 'pdf' | 'plano' | 'dxf', destinoEntrega?: DestinoEntrega, destino?: 'bot' | 'dxfs', tecnicoDestino?: string) {
    if (trabajando || ocupado) return;
    elegir(null);
    setTrabajando(true);
    try {
      await ejecutarSalidaPedido({ ruta: accion === 'produccion' ? ruta + '/produccion' : accion === 'pdf' ? rutaPdf : accion === 'plano' ? rutaPlano : rutaCorte + '/enviar',
        usuario, preguntar, notify, guardado, maquina: settings?.corteDirectoEnabled, actualizado: onChanged, destinoEntrega, bot: accion === 'produccion' ? Boolean(rutaCorte) : destino === 'bot',
        cuerpo: { soloPdf: accion === 'pdf', sinPdf: true, destino, tecnicoDestino },
        terminado: () => { onChanged?.(); if (accion === 'produccion') onVolver(); } });
    } finally { setTrabajando(false); }
  }
  const bloqueado = ocupado || trabajando;
  return <>
    {!generado && <button type="button" className="primary-button boton-3d review-generate-button" disabled={bloqueado || !permitido} title={motivo || undefined} aria-busy={trabajando}
      onClick={() => elegir('produccion')}><Factory size={16} aria-hidden="true" />{trabajando ? 'Preparando producción…' : 'Pasar a producción'}</button>}
    <MenuMas etiqueta="Hacer por separado">
      <button type="button" role="menuitem" className="menu-mas-item" disabled={bloqueado || !permitido} onClick={() => elegir('pdf')}><FileText size={16} aria-hidden="true" />Generar PDF</button>
      {rutaCorte && <button type="button" role="menuitem" className="menu-mas-item" disabled={bloqueado || !permitido} onClick={() => void ejecutar('plano')}><PencilRuler size={16} aria-hidden="true" />Guardar plano</button>}
      {rutaCorte && <button type="button" role="menuitem" className="menu-mas-item" disabled={bloqueado} onClick={() => elegir('dxf')}><Scissors size={16} aria-hidden="true" />DXF de corte</button>}
      {mas}
    </MenuMas>
    {(eleccion === 'produccion' || eleccion === 'pdf') && <ElegirDestinoEntrega ruta={ruta + '/destinos-entrega'} codigo={codigo} preguntar={preguntar} cancelar={() => elegir(null)}
      etiqueta={eleccion === 'produccion' ? 'Pasar a producción' : 'Generar PDF'} generar={d => void ejecutar(eleccion, d)} />}
    {eleccion === 'dxf' && rutaCorte && <EnviosCorte tecnicoPedido={tecnico} descarga={rutaCorte + '/descargar/dxf'} cancelar={() => elegir(null)} enviar={(d, t) => {
      if (!permitido) { notify(motivo, { tone: 'warning' }); return; }
      void ejecutar('dxf', undefined, d, t);
    }} />}
  </>;
}
