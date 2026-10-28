// Ejemplos locales; ejecutar desde la raíz: node tmp/embudos-ejemplos/generar.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import oficina from '../../src/domain/__fixtures__/embudos-oficina.json' with { type: 'json' };
import { generarCorteLona } from '../../src/domain/corteLona/index.js';
import { calculateOrder } from '../../src/domain/rules.js';

const salida = new URL('./salida/', import.meta.url);
await mkdir(salida, { recursive: true });
const resumen = [];
for (const ejemplo of [oficina.conico, oficina.recto]) {
  const order = { orderCode: ejemplo.pedido, customer: 'EJEMPLO LOCAL · OFICINA TÉCNICA',
    orderDate: '2026-10-28', technician: 'IVÁN', reviewer: 'OFICINA TÉCNICA',
    sameFabric: true, fabric: 'PVC900BL|||250|||LONA PVC 900 BLANCO :250 AN|||PLASTICA (LONA)',
    awnings: [{ id: ejemplo.pedido, of: ejemplo.pedido.slice(2), model: 'EMBUDO', units: ejemplo.cantidad, embudo: ejemplo.entrada }] };
  const calc = calculateOrder(order);
  if (calc.diagnostics.some(d => d.level === 'error')) throw new Error(JSON.stringify(calc.diagnostics));
  if (calc.ofs.some(o => o.materials.length)) throw new Error('El embudo no debe reservar material.');
  const r = generarCorteLona(order, { ofStockSacos: '2600001' });
  if (r.avisos.length) throw new Error(r.avisos.join('\n'));
  const corte = r.cortes.conSacos[0], plano = r.plano[0];
  await writeFile(new URL(`${ejemplo.pedido}-corte.dxf`, salida), Buffer.from(corte.dxf, 'latin1'));
  await writeFile(new URL(`${ejemplo.pedido}-plano.dxf`, salida), plano.dxf, 'utf8');
  await writeFile(new URL(`${ejemplo.pedido}-corte.svg`, salida), vistaCorte(corte));
  resumen.push({ pedido: ejemplo.pedido, cantidad: ejemplo.cantidad, piezas: corte.colocadas.filter(p => !p.saco).length,
    metros: (corte.largoMaterial ?? corte.largo) / 1000, materialesReservados: 0, arcos: corte.dibujo.arcos.length,
    hojas: plano.geometria.hojas.map(h => h.nombre) });
}
await writeFile(new URL('resumen.json', salida), JSON.stringify(resumen, null, 2) + '\n');
console.log(JSON.stringify({ salida: fileURLToPath(salida), ejemplos: resumen }, null, 2));

function vistaCorte(corte) {
  const d = corte.dibujo, ancho = corte.largo + 100, alto = corte.anchoRollo + 1100;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
  const color = capa => capa === 'DISCO1' ? '#202b39' : capa === 'ROTULADOR' ? '#c53434' : '#324e79';
  const ls = d.lineas.map(l => `<line x1="${l.x1}" y1="${alto - l.y1}" x2="${l.x2}" y2="${alto - l.y2}" stroke="${color(l.capa)}"/>`);
  const as = d.arcos.map(a => {
    const sitio = deg => [a.x + a.r * Math.cos(deg * Math.PI / 180), alto - a.y - a.r * Math.sin(deg * Math.PI / 180)];
    const [p, q] = [sitio(a.desde), sitio(a.hasta)];
    return `<path d="M ${p.join(' ')} A ${a.r} ${a.r} 0 ${a.hasta - a.desde > 180 ? 1 : 0} 0 ${q.join(' ')}" fill="none" stroke="${color(a.capa)}"/>`;
  });
  const ts = d.textos.map(t => `<text x="${t.x}" y="${alto - t.y}" font-size="${t.h}" text-anchor="${t.centrado ? 'middle' : 'start'}" dominant-baseline="middle" fill="${color(t.capa)}" transform="rotate(${-Number(t.giro || 0)} ${t.x} ${alto - t.y})">${esc(t.valor)}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="900" viewBox="-50 -50 ${ancho} ${alto + 100}" style="background:white;font-family:Arial"><rect x="0" y="${alto - corte.anchoRollo}" width="${corte.largo}" height="${corte.anchoRollo}" fill="#f7f9fb" stroke="#a5adb7"/><g stroke-width="1.5">${ls.join('')}${as.join('')}</g>${ts.join('')}</svg>`;
}
