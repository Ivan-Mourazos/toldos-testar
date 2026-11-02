// Solo cuatro muestras optativas. No activa el estilo en la aplicación.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildFabricDiagramSvg, buildFabricDiagramBoxPdf } from '../src/domain/planteamientoPdf.js';
const out=path.resolve('tmp/ui-audit/dibujos-estilo/muestras');
fs.mkdirSync(out,{recursive:true});
const casos=JSON.parse(fs.readFileSync('docs/revision-dibujos-casos.json','utf8'));
const ids=['cortina-ventana-5193','toldo-velcro-6340','antica-50-2673','general-arzua-4541'];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const articulos=[];
for(const id of ids) {
 const c=casos.find(c=>c.id===id);
 const datos={diagram:c.diagrama,awning:c.entrada,calculation:c.corte};
 const figuras=[];
 for(const [fase,estiloTecnico] of [['antes',false],['despues',true]]) {
  const svg=buildFabricDiagramSvg({...datos,estiloTecnico});
  const html=renderToStaticMarkup(React.createElement('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 242 300'},svg.nodes.map((n,i)=>React.createElement(n.tag,{...n.attrs,key:i},n.tag==='text'?n.text:undefined))));
  fs.writeFileSync(`${out}/${id}-${fase}.svg`,html);
  fs.writeFileSync(`${out}/${id}-${fase}.pdf`,await buildFabricDiagramBoxPdf({...datos,estiloTecnico}));
  figuras.push(`<figure id="${id}-${fase}"><figcaption>${fase==='antes'?'Antes':'Propuesta'} · ${c.pedido} · ${c.diagrama}</figcaption>${html}</figure>`);
 }
 articulos.push(`<article id="${id}"><h2>${c.pedido} · ${c.diagrama}</h2><p>Corte documentado: ${c.corte.fabricWidth.toLocaleString('es-ES')} × ${c.corte.fabricDrop.toLocaleString('es-ES')} cm. No se recalcula.</p><div>${figuras.join('')}</div><p>${esc(c.visto)}</p><details><summary>Medidas transcritas</summary><pre>${esc(JSON.stringify(datos,null,2))}</pre></details></article>`);
}
fs.writeFileSync(`${out}/index.html`,`<!doctype html><html lang="es"><meta charset="utf-8"><title>Cuatro muestras de confección</title><style>body{font:16px/1.45 'Segoe UI',Arial;margin:24px;background:#eee;color:#111}article{border:1px solid #bbb;margin:24px 0;padding:16px;background:#fff}article>div{display:flex;gap:20px}figure{margin:0;background:#fff;color:#000;width:484px}figcaption{padding:8px;font-size:14px}svg{display:block;width:484px;height:600px;background:#fff}pre{white-space:pre-wrap}@media(prefers-color-scheme:dark){body{background:#202527;color:#eee}article{background:#2c3336;border-color:#566267}}@media print{body,article{background:#fff;color:#000}article{break-after:page}details{display:none}}</style><h1>Propuesta de plano técnico · pendiente de elección</h1><p>GENERAL como referencia. Solo estas cuatro muestras usan la propuesta; la aplicación conserva el estilo actual. El cristal histórico de 137 cm se transcribe para el contraste, sin restaurarlo como regla.</p>${articulos.join('')}</html>`);
console.log(out);
