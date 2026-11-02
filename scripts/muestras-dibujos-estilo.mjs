// Láminas finales de los trazados de confección conservados. No cambia la selección de dibujos del catálogo.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildFabricDiagramSvg, buildFabricDiagramBoxPdf, SVG_FABRIC_DIAGRAMS } from '../src/domain/planteamientoPdf.js';
const out=path.resolve('tmp/ui-audit/dibujos-estilo/final');fs.mkdirSync(out,{recursive:true});
// Retira únicamente los archivos de láminas que este generador creó para trazados eliminados.
const vigentes=new Set(SVG_FABRIC_DIAGRAMS.map(d=>d.toLowerCase().replaceAll(' ','-')));
if(fs.existsSync(out+'/casos.json'))for(const {id} of JSON.parse(fs.readFileSync(out+'/casos.json','utf8'))){
 if(!/^[a-z0-9-]+$/.test(id))throw Error('Nombre de lámina no válido');
 if(vigentes.has(id))continue;
 for(const sufijo of ['.png','.pdf','-principal.svg','-otra-tela.svg','-sin-bamba.svg']){
  const file=path.join(out,id+sufijo);if(fs.existsSync(file))fs.unlinkSync(file);
 }
}
const casos=JSON.parse(fs.readFileSync('docs/revision-dibujos-casos.json','utf8'));
const svgHtml=datos=>renderToStaticMarkup(React.createElement('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 242 300'},datos.nodes.map((n,i)=>React.createElement(n.tag,{...n.attrs,key:i},n.tag==='text'?n.text:undefined))));
const registros=[];
for(const diagram of SVG_FABRIC_DIAGRAMS){
 const real=casos.find(c=>c.diagrama===diagram&&c.entrada);
 const model=diagram==='ANTICA'?'ANTICA':diagram.startsWith('CORTINA')?'ELECTRA':diagram==='BAMBALINA'||diagram==='SUPLEMENTO'?'BAMBALINA':diagram==='GENERAL'?'ARZUA PRO':diagram;
 const base={model,width:400,projection:250,valanceHeight:25,valanceCurve:'RECTA',valanceFabric:'OTRA',anticaVariant:'TUBO 30X10 CON BAMBA',curtainWindowExit:250,curtainWindowCorner:20,curtainWindowHeight:136,curtainWindowFloorHeight:70,curtainVelcroHeight:250,irisFrontTop:400,irisExitLeft:250,irisAssumeSquare:true,embudo:{alto:90,contornoArriba:88,contornoAbajo:76,largoCinta:100},supplementFastening:'BROCHES',supplementFasteningPitchCm:15,supplementJoinHemCm:3,supplementSideHemCm:3,supplementBottomHemCm:3,supplementWaveOverlapCm:5};
 const awning=real?real.entrada:base;const calculation={fabricWidth:400,fabricDrop:300,...real?.corte};
 const id=diagram.toLowerCase().replaceAll(' ','-');
 const variantes=[['principal',awning],['otra-tela',{...awning,valanceHeight:25,valanceFabric:'OTRA'}],['sin-bamba',{...awning,valanceHeight:0,valanceFabric:''}]];
 const dibujos=[];
 for(const [variante,a] of variantes){
  const datos={diagram,awning:a,calculation};const svg=svgHtml(buildFabricDiagramSvg(datos));
  fs.writeFileSync(`${out}/${id}-${variante}.svg`,svg);
  dibujos.push({variante,svg});
 }
 fs.writeFileSync(`${out}/${id}.pdf`,await buildFabricDiagramBoxPdf({diagram,awning,calculation}));
 registros.push({id,diagram,awning,calculation,fuente:real?real.pedido:'Ensayo de presentación; no acredita fabricación',dibujos});
}
const css=`<style>body{margin:24px;background:#eee;color:#111;font:16px/1.4 'Segoe UI',Arial}article{margin:20px 0;background:white;padding:16px;border:1px solid #bbb}h2{margin:0}section{display:flex;gap:16px}figure{margin:0;width:484px;background:white;color:black}svg{display:block;width:484px;height:600px}figcaption{padding:8px;font-size:14px}.principal{padding:12px;background:white;width:484px}pre{white-space:pre-wrap}@media(prefers-color-scheme:dark){body{background:#202527;color:#eee}article{background:#2c3336}}@media print{body,article{background:white;color:black}article{break-after:page}}</style>`;
fs.writeFileSync(`${out}/index.html`,`<!doctype html><html lang="es"><meta charset="utf-8"><title>Confección · ${SVG_FABRIC_DIAGRAMS.length} dibujos en blanco y negro</title>${css}<h1>Confección · ${SVG_FABRIC_DIAGRAMS.length} dibujos en blanco y negro</h1><p>Estilo activo en la aplicación y en pdfkit. Bamba unida al cuerpo; otra tela solo cambia el rótulo. Las muestras adicionales prueban el espacio; no son cálculos de fabricación.</p>${registros.map(c=>`<article id="${c.id}"><h2>${c.diagram}</h2><p>${c.fuente} · tela ${c.calculation.fabricWidth.toLocaleString('es-ES')} × ${c.calculation.fabricDrop.toLocaleString('es-ES')} cm</p><section>${c.dibujos.map(d=>`<figure id="${c.id}-${d.variante}"><figcaption>${c.diagram} · ${d.variante}</figcaption>${d.svg}</figure>`).join('')}</section></article>`).join('')}</html>`);
fs.writeFileSync(`${out}/casos.json`,JSON.stringify(registros.map(({dibujos:_dibujos,...c})=>c),null,2));console.log(JSON.stringify({dibujos:registros.length,svg:registros.length*3,out}));
