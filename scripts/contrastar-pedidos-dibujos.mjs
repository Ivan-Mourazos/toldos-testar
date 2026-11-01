// Contrasta el trazado compartido con páginas de pedidos, sin completar datos de fabricación ausentes.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildFabricDiagramSvg, getFabricPatternDiagram } from '../src/domain/planteamientoPdf.js';
const out=path.resolve('tmp/ui-audit/dibujos-html/revision');
const casos=JSON.parse(fs.readFileSync('docs/revision-dibujos-casos.json','utf8'));
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const svgHtml=datos=>renderToStaticMarkup(React.createElement('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 242 300'},datos.nodes.map((n,i)=>React.createElement(n.tag,{...n.attrs,key:i},n.tag==='text'?n.text:undefined))));
const resultados=[];
for(const c of casos) {
 if(!fs.existsSync(path.join(out,c.original))) throw new Error(`Falta la página de ${c.pedido}: ${c.original}`);
 const seleccionado=c.entrada?getFabricPatternDiagram(c.entrada):null;
 if(seleccionado&&seleccionado!==c.diagrama) throw new Error(`${c.id}: selección ${seleccionado}, esperada ${c.diagrama}`);
 const datos=c.entrada?buildFabricDiagramSvg({diagram:seleccionado,awning:c.entrada,calculation:c.corte}):null;
 const dibujo=datos?svgHtml(datos):null;
 if(dibujo) fs.writeFileSync(path.join(out,`${c.id}-web.svg`),dibujo);
 resultados.push({...c,seleccionado,dibujo});
}
const estilo=`<style>
:root{color-scheme:light dark;--fondo:#f0f1f2;--tinta:#202527;--panel:#fff;--borde:#bfc7ca}
@media(prefers-color-scheme:dark){:root{--fondo:#202527;--tinta:#eee;--panel:#2c3336;--borde:#566267}}
body{font:16px/1.5 Arial,sans-serif;background:var(--fondo);color:var(--tinta);margin:24px}
a{color:inherit}h1{font-size:28px}h2{font-size:21px;margin:0 0 8px}article{border:1px solid var(--borde);padding:20px;margin:24px 0;background:var(--panel);break-inside:avoid}
.comparacion{display:grid;grid-template-columns:1fr 1fr;gap:18px}figure{margin:0}figcaption{margin:6px 0;font-weight:bold}figure img{width:100%;height:780px;object-fit:contain;object-position:top;background:#fff}figure svg{width:100%;height:600px;background:#fff;display:block}
pre{font:13px/1.5 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}details{margin-top:12px}nav{display:flex;gap:8px;flex-wrap:wrap}nav a{border:1px solid var(--borde);padding:4px 8px;text-decoration:none}.nota{padding:12px;border-left:4px solid #bb861d}
@media print{body{color:#000;background:#fff}nav,details{display:none}article{break-after:page}figure svg{height:420px}figure img{max-height:540px}}
</style>`;
fs.writeFileSync(path.join(out,'contraste-pedidos.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><title>Pedidos de taller y dibujo actual</title>${estilo}<h1>Pedidos de taller y dibujo actual</h1><p>${casos.length} comparaciones de ${new Set(casos.map(c=>c.pedido)).size} pedidos distintos. Páginas reales a la izquierda; trazado compartido de SVG/pdfkit a la derecha.</p><p class="nota">Las medidas del corte se transcriben del documento y se suministran al dibujante actual para aislar el trazado. Esta página no recalcula el pedido ni acredita sus reservas. Solo se introducen las opciones leídas; los campos ausentes se ven en «Datos». Las discrepancias se conservan explícitas. Una hoja antigua de la aplicación no equivale a un CAD de fabricación independiente.</p><p><a href="index.html">Láminas de las72 variantes y HERA</a> · <a href="embudos/index.html">Presentaciones CAD de Embudo</a></p><nav>${resultados.map(c=>`<a href="#${c.id}">${c.pedido} · ${esc(c.diagrama)}</a>`).join('')}</nav>${resultados.map(c=>`<article id="${c.id}"><h2>${c.pedido} · ${esc(c.diagrama)}</h2><p>${esc(c.visto)}</p><div class="comparacion"><figure><figcaption>Pedido real · <a href="${esc(c.original)}">abrir página completa</a></figcaption><img loading="lazy" src="${esc(c.original)}" alt="Página original de ${c.pedido}"></figure><figure><figcaption>${c.dibujo?'Dibujo actual · corte documentado':'Sin entrada web equivalente'}</figcaption>${c.dibujo||'<p>Contorno especial no representable con los campos actuales. No se sustituye por un rectángulo.</p>'}</figure></div><details><summary>Datos transcritos y corte suministrado al dibujo</summary><pre>${esc(JSON.stringify({opcionesLeidas:c.entrada,corteDocumentado:c.corte,seleccionActual:c.seleccionado},null,2))}</pre></details></article>`).join('')}</html>`);
fs.writeFileSync(path.join(out,'contraste-pedidos.json'),JSON.stringify(resultados.map(({dibujo:_dibujo,...c})=>c),null,2));
console.log(JSON.stringify({comparaciones:resultados.length,pedidos:new Set(casos.map(c=>c.pedido)).size,diagramas:new Set(casos.map(c=>c.diagrama)).size}));
