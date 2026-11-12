import fs from 'node:fs/promises';
import path from 'node:path';
import { dxfACmt } from './cmt/index.ts';

/** El DXF puede venir en UTF-8 o en Windows-1252 aunque su cabecera diga otra cosa: se prueba UTF-8 estricto primero. */
export function textoDxf(contents) {
  if (typeof contents === 'string') return contents;
  try { return new TextDecoder('utf-8', { fatal: true }).decode(contents); }
  catch { return new TextDecoder('windows-1252').decode(contents); }
}

const lineaDuda = ({ motivo, capa, handle }) => {
  const detalle = [capa && `capa ${capa}`, handle && `entidad ${handle}`].filter(Boolean).join(', ');
  return detalle ? `${motivo} (${detalle})` : motivo;
};

// La leyenda del bot no va al CMT: en la máquina sobra y descoloca el dibujo (Iván, 12/11/2026).
const sinLeyenda = (texto) => dxfACmt(texto, { sinLeyenda: true });

/**
 * Piloto: con cada DXF que va al robot, deja en una carpeta aparte el CMT hecho por la web, para
 * compararlo con el que genere el robot. No es la carpeta de la máquina y nada depende de él:
 * cualquier fallo se anota y el envío sigue.
 */
export async function dejarCmtPiloto({ carpeta, archivos, convertir = sinLeyenda, aviso = console.warn }) {
  if (!carpeta) return [];
  const resultados = [];
  for (const { filename, contents } of archivos) {
    try {
      const base = path.basename(filename).replace(/\.dxf$/i, '');
      const cmt = path.join(carpeta, `${base}.cmt`), dudas = path.join(carpeta, `${base}.dudas.txt`);
      const r = convertir(textoDxf(contents));
      await fs.mkdir(carpeta, { recursive: true });
      if (r.cmt) {
        await fs.writeFile(cmt, r.cmt);
        await fs.rm(dudas, { force: true });
        resultados.push({ filename: `${base}.cmt`, ok: true, objetos: r.objetos.length });
      } else {
        // Sin fichero a medias: lo que no se sabe convertir queda escrito para revisarlo.
        await fs.writeFile(dudas, `${filename}: la web no ha generado el CMT.\n${[...new Set(r.dudas.map(lineaDuda))].join('\n')}\n`, 'utf8');
        await fs.rm(cmt, { force: true });
        resultados.push({ filename: `${base}.dudas.txt`, ok: false, dudas: r.dudas.length });
      }
    } catch (error) {
      aviso(`Piloto del CMT: no se pudo preparar ${filename}: ${error.message}`);
      resultados.push({ filename, ok: false, error: error.message });
    }
  }
  return resultados;
}
