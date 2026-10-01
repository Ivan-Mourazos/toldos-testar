import { useEffect, useState } from 'react';
import type { ResumenBorrador } from '../../borradores/tipos.ts';
import type { Notify } from '../components/NotificationCenter';
import { listarBorradores } from '../borradores';

// Los borradores para Pedidos (diseño 01/10/2026). Se leen al entrar y cada vez que cambia
// `refreshKey`; no van en App porque no cuentan en «Pedidos N». Sin carpeta configurada, ninguno.
export function useBorradores(refreshKey: number, onError: Notify) {
  const [borradores, setBorradores] = useState<ResumenBorrador[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    listarBorradores()
      .then((datos) => {
        if (cancelado) return;
        setBorradores(datos.borradores);
        setCargando(false);
      })
      .catch((error) => {
        if (cancelado) return;
        setCargando(false);
        onError(error instanceof Error ? error.message : 'No se pudieron cargar los borradores.', { tone: 'error' });
      });
    return () => { cancelado = true; };
  }, [refreshKey, onError]);

  return { borradores, cargando };
}
