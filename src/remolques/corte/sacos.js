// Mismas medidas, tolerancia y elección de sacos que toldos y puertas. Las piezas del pedido ya están
// colocadas: solo se aprovechan rectángulos libres dentro del rollo gastado, nunca las piezas de restos.
import { sacosEnRetales } from '../../domain/corteLona/colocacion.js';
import { anchoArial } from '../../domain/corteLona/texto.js';

export function sacosDeStock(ocupadas, rollo, ofStock) {
  if (!ofStock) return { sacos: [], lineas: [], textos: [] };
  const sacos = sacosEnRetales(ocupadas, rollo, ofStock);
  const lineas = [], textos = [];
  for (const s of sacos) {
    const { x, y, ancho: w, hueco: h } = s;
    lineas.push([x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]);
    const rotulo = [s.of, 'SACO', s.medida, 'STOCK'];
    // A lo largo del lado largo, como en los sacos de AR2604390/4990/5000. Solo texto de consulta:
    // las marcas de montaje en ROTULADOR siguen siendo las del remolque, de 1 cm.
    const vertical = h > w, largo = Math.max(w, h), corto = Math.min(w, h);
    const alto = Math.min(150, corto / 8, corto * 0.9 / (3 * 1.6 + 1), ...rotulo.map(v => largo * 0.9 / anchoArial(v, 1)));
    rotulo.forEach((valor, k) => {
      const d = (1.5 - k) * alto * 1.6;
      textos.push({ capa: 'texto', x: x + w / 2 - (vertical ? d : 0), y: y + h / 2 + (vertical ? 0 : d),
        h: alto, valor, centrado: true, ...(vertical ? { giro: 90 } : {}) });
    });
  }
  return { sacos, lineas, textos };
}
