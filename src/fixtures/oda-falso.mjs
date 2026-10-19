// Ejecutable de prueba: imita la interfaz de carpetas de ODA sin instalarlo.
import fs from 'node:fs/promises';
import path from 'node:path';
const [entrada, salida, version, formato, recursivo, auditoria, filtro] = process.argv.slice(2);
if (version !== 'ACAD2018' || recursivo !== '0' || auditoria !== '1' || !filtro.startsWith('*.')) process.exit(3);
if (process.env.ODA_FAKE_MODE === 'timeout') await new Promise((resolve) => setTimeout(resolve, 30_000));
if (process.env.ODA_FAKE_MODE === 'exit') process.exit(2);
if (process.env.ODA_FAKE_MODE === 'err') await fs.writeFile(path.join(salida, 'conversion.ERR'), 'Error de conversión');
if (process.env.ODA_FAKE_MODE !== 'missing') {
  const [nombre] = await fs.readdir(entrada);
  const destino = path.join(salida, path.parse(nombre).name + '.' + formato.toLowerCase());
  await fs.writeFile(destino, formato === 'DWG' ? 'AC1032DWG FALSO' : await fs.readFile(path.join(entrada, nombre)));
}
