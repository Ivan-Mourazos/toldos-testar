// Herramientas de contraste: el lector y el dibujo de planos viven en src/flujoDwg/planoDxf.js.
import fs from 'node:fs';
import { leerPlanoTexto, textoDxf } from '../../src/flujoDwg/planoDxf.js';
export { cajaPrimitiva, enZona, limpiarTextoDxf, proyectarPagina, svgPrimitivas, transformarPrimitiva } from '../../src/flujoDwg/planoDxf.js';
export const leerPlanoDxf = (ruta) => leerPlanoTexto(textoDxf(fs.readFileSync(ruta)));
