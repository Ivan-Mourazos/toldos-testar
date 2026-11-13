export interface ResumenCmt {
  objetos: number;
  porHerramienta: { herramienta: string; etiqueta: string; trazos: number }[];
  anchoMm: number;
  altoMm: number;
}
export interface ResultadoCmt {
  ok: boolean;
  nombre: string;
  cmtBase64: string | null;
  resumen: ResumenCmt;
  avisos: string[];
  dudas: string[];
}
export type EstadoCmt = 'convirtiendo' | 'listo' | 'error';
export const textoEstado = (estado: EstadoCmt) => ({ convirtiendo: 'Convirtiendo…', listo: 'Listo', error: 'No se pudo convertir' })[estado];
export const medidasCmt = (r: ResumenCmt) => `${r.anchoMm.toLocaleString('es-ES', { maximumFractionDigits: 2 })} × ${r.altoMm.toLocaleString('es-ES', { maximumFractionDigits: 2 })} mm`;
export const permiteSinTextos = (dudas: string[], sinTextos: boolean) => !sinTextos && dudas.some(d => /texto|m?text|fuente|arial|glifo|shx/i.test(d));

export async function convertirArchivo(archivo: File, sinTextos = false, pedir: typeof fetch = fetch): Promise<ResultadoCmt> {
  if (!/\.dxf$/i.test(archivo.name)) throw new Error('Elige un fichero con extensión .dxf.');
  if (archivo.size > 30 * 1024 * 1024) throw new Error('El DXF supera el máximo de 30 MB por fichero.');
  const dxfBase64 = await archivoBase64(archivo);
  const respuesta = await pedir('/api/cmt/convertir', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: archivo.name, dxfBase64, sinTextos }) });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo convertir el DXF.');
  return datos;
}

export async function archivoBase64(archivo: File): Promise<string> {
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const trozos: string[] = [];
  for (let i = 0; i < bytes.length; i += 32768) trozos.push(String.fromCharCode(...bytes.subarray(i, i + 32768)));
  return btoa(trozos.join(''));
}
