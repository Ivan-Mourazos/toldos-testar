/** Si este navegador puede pintar en 3D. Sin DOM (pruebas, servidor) no puede. */
export function soporteWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const contexto = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    // Se suelta enseguida: el navegador admite pocos contextos a la vez y el render necesita el suyo.
    contexto?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(contexto);
  } catch {
    return false;
  }
}
