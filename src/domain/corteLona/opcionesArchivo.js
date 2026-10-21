import { escribirDxf2004 } from './dxfCorte.js';
import { anchoArial } from './texto.js';

// Un archivo completo por opción: las telas sin alternativa se repiten en las dos salidas.
// La clave incluye el ancho porque un mismo código puede venir en rollos distintos.
export function opcionesArchivo(cortes, pedido) {
  if (!cortes.conSacos.length) return [];
  const alternativas = cortes.trozoSeparado?.length > 0;
  return (alternativas ? ['conSacos', 'trozoSeparado'] : ['conSacos']).map(opcion => {
    const grupos = cortes.conSacos.map(c => cortes[opcion]?.find(o => o.codigoTela === c.codigoTela && o.anchoRollo === c.anchoRollo) ?? c);
    const dibujo = { lineas: [], textos: [] };
    let siguiente = 0;
    for (const corte of grupos) {
      const { lineas, textos } = corte.dibujo;
      // El alto del rótulo girado es su ancho de texto. Se reserva espacio también para cabeceras
      // y avisos de restos, además de todo el ancho del rollo, con 1 m libre entre telas.
      const alcance = t => t.giro ? anchoArial(t.valor, t.h) : t.h;
      const abajo = Math.min(0, ...lineas.flatMap(l => [l.y1, l.y2]), ...textos.map(t => t.y - alcance(t)));
      const arriba = Math.max(corte.anchoRollo, ...lineas.flatMap(l => [l.y1, l.y2]), ...textos.map(t => t.y + alcance(t)));
      const dy = siguiente - abajo;
      dibujo.lineas.push(...lineas.map(l => ({ ...l, y1: l.y1 + dy, y2: l.y2 + dy })));
      dibujo.textos.push(...textos.map(t => ({ ...t, y: t.y + dy })));
      siguiente = arriba + dy + 1000;
    }
    const sufijo = alternativas ? ` (${opcion === 'conSacos' ? 'con sacos' : 'trozo separado'})` : '';
    return { opcion, filename: `${pedido}${sufijo}.dxf`, dibujo, dxf: escribirDxf2004(dibujo) };
  });
}
