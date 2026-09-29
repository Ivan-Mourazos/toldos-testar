import React from 'react';
import { Container } from 'lucide-react';

// Aviso de Nuevo pedido de toldos cuando RPS trae un pedido que no es de toldos sino de
// remolques (lo decide `interpretarLineaRps` en el servidor de remolques). Sustituye al
// «pedido sin toldos» que se veía antes y lleva a la pantalla de Remolques con el número ya
// puesto.
export function AvisoPedidoRemolques({ numero, lineas, onAbrir }: {
  numero: string;
  lineas: number;
  onAbrir: () => void;
}) {
  return (
    <div className="rem-aviso-pedido" role="status">
      <Container aria-hidden="true" />
      <span>
        <strong>Este pedido es de remolques</strong>
        {numero} trae {lineas === 1 ? '1 línea' : `${lineas} líneas`} de lona de remolque y ninguna de toldo.
      </span>
      <button type="button" className="ghost-button" onClick={onAbrir}>Abrir en Remolques</button>
    </div>
  );
}
