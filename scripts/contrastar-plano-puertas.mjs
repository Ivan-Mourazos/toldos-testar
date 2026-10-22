// Lee únicamente copias locales del estudio. Escribe DXF, inventarios y comparaciones en tmp/.
// node scripts/contrastar-plano-puertas.mjs <carpeta local dxf-estudio/puertas>
// Requiere las dos ayudas copiadas a tmp/puertas-plano, según el encargo de fase 3.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { registrosDxf, numero, valor } from '../src/domain/corteLona/dxfTestHelpers.js';
import { escribirPlanoPuertas } from '../src/puertas/plano.ts';
import { geometriaAlzado } from '../src/puertas/alzado.ts';
import { calcularPuerta } from '../src/puertas/calcular.ts';
import { pedidoDe } from '../src/puertas/__fixtures__/ejemplos.ts';
import { puertaPlanoReal, referenciasPlano } from '../src/puertas/__fixtures__/planosReales.ts';

export const salidaPlano = 'tmp/ui-audit/puertas-fase3-plano';
const n = (r, codigo, defecto = 0) => valor(r, codigo) === undefined ? defecto : numero(r, codigo);
const limpiar = texto => texto.replace(/\\P/g, ' ').replace(/\\px[^;]*;/g, '').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, '')
  .replace(/%%C|∅/gi, 'Ø').replace(/\s+/g, ' ').trim();
const leer = archivo => {
  const b = fs.readFileSync(archivo), utf = b.toString('utf8');
  return utf.includes('\ufffd') ? b.toString('latin1') : utf;
};
const zonaVentana = (dxf, id) => {
  const r = registrosDxf(dxf).find(r => r.tipo === 'VIEWPORT' && n(r, 69) === id);
  if (!r) throw new Error(`Falta la ventana de corte ${id}`);
  const alto = n(r, 45), ancho = alto * n(r, 40) / n(r, 41), x = n(r, 12), y = n(r, 22);
  return [x - ancho / 2, y - alto / 2, x + ancho / 2, y + alto / 2];
};

/** Inventario del modelo, incluyendo textos insertados y cotas; sin tomar las cotas como simples líneas. */
export function inventarioPlano(dxf, zona) {
  const bloques = new Map(); let actual;
  for (const r of registrosDxf(dxf, 'BLOCKS')) {
    if (r.tipo === 'BLOCK') { actual = { x: n(r, 10), y: n(r, 20), entidades: [] }; bloques.set(valor(r, 2), actual); }
    else if (r.tipo === 'ENDBLK') actual = undefined;
    else actual?.entidades.push(r);
  }
  const textos = [], cotas = [];
  const dentro = (x, y) => x >= zona[0] && y >= zona[1] && x <= zona[2] && y <= zona[3];
  function recorrer(ents, T, escala = 1, giro = 0, nivel = 0) {
    if (nivel > 8) throw new Error('Bloques demasiado anidados');
    for (const r of ents) {
      if (r.tipo === 'INSERT') {
        const b = bloques.get(valor(r, 2)); if (!b) continue;
        const a = n(r, 50) * Math.PI / 180, sx = n(r, 41, 1), sy = n(r, 42, 1);
        recorrer(b.entidades, (x, y) => {
          const u = (x - b.x) * sx, v = (y - b.y) * sy;
          return T(n(r, 10) + u * Math.cos(a) - v * Math.sin(a), n(r, 20) + u * Math.sin(a) + v * Math.cos(a));
        }, escala * sx, giro + n(r, 50), nivel + 1);
      } else if (r.tipo === 'DIMENSION') {
        const [x, y] = T(n(r, 11), n(r, 21));
        if (dentro(x, y)) cotas.push({ x, y, medida: Number((n(r, 42) * escala).toFixed(4)), estilo: valor(r, 3), escrito: valor(r, 1) ?? '' });
      } else if (r.tipo === 'TEXT' || r.tipo === 'MTEXT') {
        const alineado = r.tipo === 'TEXT' && (n(r, 72) || n(r, 73));
        const [x, y] = T(n(r, alineado ? 11 : 10), n(r, alineado ? 21 : 20));
        if (dentro(x, y)) textos.push({ x, y, texto: limpiar(valor(r, 1) ?? ''), altura: n(r, 40) * escala * 100,
          giro: giro + (r.tipo === 'MTEXT' ? Math.atan2(n(r, 21), n(r, 11, 1)) * 180 / Math.PI : n(r, 50)) });
      }
    }
  }
  recorrer(registrosDxf(dxf).filter(r => valor(r, 67) !== '1'), (x, y) => [x, y]);
  return { textos, cotas };
}

export async function contrastarPlano(carpeta) {
  fs.mkdirSync(salidaPlano, { recursive: true });
  const filas = [], navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1600, height: 1000 } });
    for (const ref of referenciasPlano) {
      const p = puertaPlanoReal(ref.pedido), g = geometriaAlzado(p, calcularPuerta(p));
      const archivo = path.join(carpeta, ref.archivo), dxfReal = leer(archivo);
      const dxf = escribirPlanoPuertas({ pedido: pedidoDe(ref.pedido, p), cabecera: { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' } });
      const web = `${salidaPlano}/${ref.pedido}.dxf`; fs.writeFileSync(web, dxf);
      fs.writeFileSync(`${salidaPlano}/${ref.pedido}-pedido.json`, JSON.stringify(pedidoDe(ref.pedido, p), null, 2));
      const zonaWeb = [99.9, 100 - (g.vista.yMin + g.vista.alto) / 100 - 0.1, 100 + g.vista.ancho / 100 + 0.1, 100 - g.vista.yMin / 100 + 0.3];
      const real = inventarioPlano(dxfReal, ref.zona), generado = inventarioPlano(dxf, zonaWeb);
      const canon = t => t.toUpperCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^A-Z0-9Ø]/g, '');
      const textoSeguido = canon(generado.textos.map(t => t.texto).join(' '));
      const textos = [...new Set(real.textos.map(t => t.texto))].map(texto => ({ texto,
        presente: textoSeguido.includes(canon(texto)) }));
      const cotas = [...new Set(real.cotas.map(c => c.medida))].map(medida => ({ medida,
        presente: generado.cotas.some(c => Math.abs(c.medida - medida) < .01 || Math.abs(Number(c.escrito.replace(',', '.')) - medida) < .01) }));
      filas.push({ pedido: ref.pedido, archivo: ref.archivo, zona: ref.zona, textos, cotas, real, generado });
      fs.writeFileSync(`${salidaPlano}/${ref.pedido}-inventario.json`, JSON.stringify(filas.at(-1), null, 2));
      const zonas = [[archivo, 'real', ref.zona], [web, 'web', zonaWeb],
        [archivo, 'corte-real', zonaVentana(dxfReal, 4)], [web, 'corte-web', zonaVentana(dxf, 3)]];
      for (const [fuente, nombre, zona] of zonas) {
        execFileSync(process.execPath, ['tmp/puertas-plano/pintar-dxf.mjs', fuente, `${salidaPlano}/${ref.pedido}-${nombre}.png`, ...zona.map(String)], { stdio: 'pipe' });
      }
      const foto = nombre => `data:image/png;base64,${fs.readFileSync(`${salidaPlano}/${ref.pedido}-${nombre}.png`).toString('base64')}`;
      const html = `<html lang="es"><meta charset="utf-8"><style>body{margin:0;font:16px Arial;background:white}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}img{width:100%}h1,h2{margin:12px}</style><h1>${ref.pedido} · ${p.frente} × ${p.alto} cm</h1><main><section><h2>Plano real</h2><img src="${foto('real')}"></section><section><h2>Plano generado</h2><img src="${foto('web')}"></section></main></html>`;
      fs.writeFileSync(`${salidaPlano}/${ref.pedido}-comparacion.html`, html);
      await pagina.setContent(html); await pagina.screenshot({ path: `${salidaPlano}/${ref.pedido}-comparacion.png`, fullPage: true });
      const htmlCorte = html.replace(foto('real'), foto('corte-real')).replace(foto('web'), foto('corte-web')).replace('cm</h1>', 'cm · corte del plano</h1>');
      fs.writeFileSync(`${salidaPlano}/${ref.pedido}-corte-comparacion.html`, htmlCorte);
      await pagina.setContent(htmlCorte); await pagina.screenshot({ path: `${salidaPlano}/${ref.pedido}-corte-comparacion.png`, fullPage: true });
      console.log(`${ref.pedido}: ${textos.filter(t => t.presente).length}/${textos.length} textos; ${cotas.filter(c => c.presente).length}/${cotas.length} medidas distintas del alzado real`);
    }
  } finally { await navegador.close(); }
  fs.writeFileSync(`${salidaPlano}/contraste.json`, JSON.stringify(filas, null, 2));
  const informe = ['# Contraste de planos de puertas', '', 'Comparación automática de textos y medidas presentes en la zona indicada; no certifica igualdad de colocación ni de todas las entidades.', '',
    ...filas.flatMap(f => [`## ${f.pedido}`, '', `Fuente: ${f.archivo}; zona: ${f.zona.join(' ')}.`, '',
      `Textos sin coincidencia literal: ${f.textos.filter(t => !t.presente).map(t => t.texto).join('; ') || 'ninguno'}.`,
      `Medidas sin coincidencia: ${f.cotas.filter(c => !c.presente).map(c => c.medida).join('; ') || 'ninguna'}.`, '',
      `Comparaciones visuales: ${f.pedido}-comparacion.png y ${f.pedido}-corte-comparacion.png.`, ''])].join('\n');
  fs.writeFileSync(`${salidaPlano}/contraste.md`, informe);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Indica la carpeta local del estudio de puertas');
  await contrastarPlano(path.resolve(process.argv[2]));
}
