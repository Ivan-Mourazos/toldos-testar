type Familia = 'toldos' | 'puertas' | 'remolques';
const clave = (familia: Familia) => `toldos-testar-formulario-guardado:${familia}`;

/** La referencia del último guardado también acompaña al formulario recuperado del navegador. */
export function leerFormularioGuardado(familia: Familia): string | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(clave(familia)); }
  catch { return null; }
}
export function apuntarFormularioGuardado(familia: Familia, firma: string | null): string | null {
  try {
    if (firma === null) localStorage.removeItem(clave(familia));
    else localStorage.setItem(clave(familia), firma);
  } catch { /* Sin almacenamiento, la referencia sigue sirviendo durante esta sesión. */ }
  return firma;
}
