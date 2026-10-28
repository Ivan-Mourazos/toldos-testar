import { escribirDxf2004 } from './dxfCorte.js';
import { anchoArial } from './texto.js';

// Un solo DXF por pedido con todas las telas, una encima de otra (Iván, 22/10/2026: en la máquina hay un
// técnico que elige el corte, así que las dos opciones van en el mismo archivo). Una tela con alternativa
// lleva sus dos opciones seguidas y rotuladas; la bamba sola, una vez. La clave incluye el ancho porque un
// mismo código puede venir en rollos distintos.
export function archivoCorte(cortes, pedido) {
  if (!cortes.conSacos.length) return null;
  const dibujo = { lineas: [], textos: [], arcos: [] };
  let siguiente = 0;
  const alcance = t => t.giro ? anchoArial(t.valor, t.h) : t.h;
  const apilar = (corte, etiqueta) => {
    const { lineas, textos } = corte.dibujo;
    // Se reserva espacio para cabeceras y avisos de restos, además de todo el ancho del rollo.
    const abajo = Math.min(0, ...lineas.flatMap(l => [l.y1, l.y2]), ...textos.map(t => t.y - alcance(t)));
    const arriba = Math.max(corte.anchoRollo, ...lineas.flatMap(l => [l.y1, l.y2]), ...textos.map(t => t.y + alcance(t)));
    const dy = siguiente - abajo;
    dibujo.lineas.push(...lineas.map(l => ({ ...l, y1: l.y1 + dy, y2: l.y2 + dy })));
    dibujo.textos.push(...textos.map(t => ({ ...t, y: t.y + dy })));
    // Iván, 28/10/2026: el archivo final del bot conserva los arcos reales de los embudos.
    dibujo.arcos.push(...(corte.dibujo.arcos ?? []).map(a => ({ ...a, y: a.y + dy })));
    let techo = arriba + dy;
    if (etiqueta) {
      dibujo.textos.push({ capa: 'texto', x: 0, y: techo + 250, h: 150, valor: etiqueta });
      techo += 400;
    }
    siguiente = techo + 1000;
  };
  for (const corte of cortes.conSacos) {
    const separado = cortes.trozoSeparado?.find(o => o.codigoTela === corte.codigoTela && o.anchoRollo === corte.anchoRollo);
    apilar(corte, separado ? `${corte.material.toUpperCase()} · OPCIÓN 1 · CON SACOS · ELEGIR SOLO UNA` : null);
    if (separado) apilar(separado, `${corte.material.toUpperCase()} · OPCIÓN 2 · TROZO SEPARADO · ELEGIR SOLO UNA`);
  }
  return { filename: `${pedido}.dxf`, dibujo, dxf: escribirDxf2004(dibujo) };
}
