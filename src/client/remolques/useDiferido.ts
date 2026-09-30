import { useEffect, useState } from 'react';

/** El valor con un pequeño retraso: el render no se rehace en cada tecla, sino al parar. */
export function useDiferido<T>(valor: T, ms = 150): T {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const espera = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(espera);
  }, [valor, ms]);
  return diferido;
}
