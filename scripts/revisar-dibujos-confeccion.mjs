import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { models } from '../src/domain/catalog.js';
import { exampleAwning, webDrawingVariants } from '../src/domain/drawingCatalog.js';
import { normalizeOrder } from '../src/domain/validation.js';
import { calculateOrder } from '../src/domain/rules.js';
import { buildFabricDiagramSvg, getFabricPatternDiagram } from '../src/domain/planteamientoPdf.js';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generarCorteLona } from '../src/domain/corteLona/index.js';
import { htmlPresentaciones, leerPlanoTexto, textoDxf, presentacionesDxf } from '../src/flujoDwg/planoDxf.js';
import { piezasEmbudo } from '../src/domain/corteLona/embudo.js';
const out = path.resolve('tmp/ui-audit/dibujos-html/revision');
fs.mkdirSync(`${out}/embudos`, { recursive: true });
const original = process.env.FUENTES_TOLDOS || 'C:/Users/ivan.sanchez/Documents/Proyectos DEV/toldos-testar/tmp';
const esc = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-');
const fuentePorModelo = { 'ARZUA PRO':'arzua-pro', 'GALICIA':'galicia', 'XACOBEO':'xacobeo', 'MONOBLOCK 350':'monoblock-350', 'PUNTO RECTO':'punto-recto', 'CAMBIO TELA':'cambio-tela', 'CAMBIO CORTINA':'cambio-cortina', CORTINA:'cortina', SELENA:'selena', ELECTRA:'verticales', MAXISCREEM:'verticales', ENROLLABLE:'enrollable', BAMBALINA:'bambalina', ANTICA:'antica', 'CAMBIO ANTICA':'cambio-antica', IRIS:'iris', HERA:'hera', EMBUDO:'embudo', SOLAPAS:'cortina-pvc-corte' };
const fuentes = [...new Set(models.map(m=>`docs/modelos/${fuentePorModelo[m.code] || 'cofres'}.md`)), 'docs/product-decisions.md', 'docs/modelos/dudas-abiertas.md'];
fs.writeFileSync(`${out}/fuentes.json`,JSON.stringify(fuentes.map(f=>({ fichero:f, sha256:createHash('sha256').update(fs.readFileSync(f)).digest('hex'), pasajes:fs.readFileSync(f,'utf8').split(/\r?\n/).map((text,i)=>({linea:i+1,text})).filter(r=>/confecci|dibujo|patr[oó]n|varilla|bastilla|ventana|manual|pendiente/i.test(r.text)) })),null,2));
const estilo = '<style>body{font:15px Arial;margin:24px;background:#eee;color:#222}article{background:white;padding:18px;margin-bottom:20px;break-inside:avoid}figure{display:inline-block;vertical-align:top;margin:8px}figure svg{width:242px;height:300px;border:1px solid #aaa}figcaption{max-width:255px}pre{white-space:pre-wrap;font-size:12px}a{color:#174d82}@media print{body{background:white;margin:0}article{break-after:page}figure svg{width:242px;height:300px}}</style>';
const numero = n => Number(n).toLocaleString('es-ES');
const svgHtml = datos => renderToStaticMarkup(React.createElement('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 242 300'}, datos.nodes.map((n,i)=>React.createElement(n.tag,{...n.attrs,key:i},n.tag==='text'?n.text:undefined))));
const variantes=[];
for(const {code} of models) for(const v of webDrawingVariants(code)) {
  const id=slug(`${code}-${v.id}`), fuente=`docs/modelos/${fuentePorModelo[code] || 'cofres'}.md`;
  const casos=[];
  for(const [nombre,medida,bamba] of [['ejemplo',400,25],['pequeno',50,0],['extremo',1200.9,120.5]]) {
    const base={...exampleAwning(v),width:medida,projection:medida,valanceHeight:bamba,valanceCurve:nombre==='extremo'?'EXTRASUAVE':'RECTA',device:'MOTOR',machineSide:nombre==='extremo'?'M.F.IZQ':'M.F.DER',placement:'FRONTAL',structureColor:'BLANCO',tubeLoad:'TUBO DE CARGA EVO 80',armCount:2,sensor:'SIN SENSOR',rotFabric:'NO',rotValance:'NO',anticaSupportHeight:75,irisAssumeSquare:true,irisFrontTop:medida,irisExitLeft:medida,irisGuideType:'ESTÁNDAR',irisGuideFixing:'FRONTAL',irisWindBlock:false,heraInteriorFace:'DERECHO',heraJoin:'NINGUNO',heraBottomFinish:'VARILLA BLANCA',heraChainColor:'BLANCO',fabric:'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR'};
    const order=normalizeOrder({fabric:base.fabric,sameFabric:true,awnings:[base]});
    const awning=order.awnings[0], calc=calculateOrder(order).ofs[0]?.calculation;
    // Las medidas de simulación se declaran como tales; nunca se presentan como cálculo aprobado.
    const calculation=calc?.valid?calc:{fabricWidth:medida,fabricDrop:medida+25};
    const diagram=getFabricPatternDiagram(awning), datos=buildFabricDiagramSvg({diagram,awning,calculation});
    casos.push({nombre,awning,diagram,calculation,calculoReal:!!calc?.valid,datos});
  }
  const estado='ensayo de espacio';
  const motivo='La evidencia de fabricación y las correcciones están en el informe de revisión de dibujos y en contraste-pedidos.html. Este ensayo no homologa remates ni cálculos fuera de rango.';
  const r={id,model:code,variante:v.id,label:v.label,estado,motivo,fuente,webDrawing:v.webDrawing,casos};
  variantes.push(r);
  fs.writeFileSync(`${out}/${id}.html`,`<!doctype html><meta charset="utf-8"><title>${esc(code)} ${esc(v.label)}</title>${estilo}<article><h1>${esc(code)} · ${esc(v.label)}</h1><p>${estado}: ${esc(motivo)}</p><p>Fuente: ${fuente}. Casos pequeño/extremo: prueba de espacio, pueden estar fuera de límites de fabricación.</p>${casos.map(c=>`<figure>${svgHtml(c.datos)}<figcaption>${c.nombre} · ${c.diagram} · ${c.calculoReal?'cálculo del motor':'medidas simuladas para probar espacio'}</figcaption><pre>${esc(JSON.stringify({frente:c.awning.width,salida:c.awning.projection,bamba:c.awning.valanceHeight,frenteTela:c.calculation.fabricWidth,caidaTela:c.calculation.fabricDrop,ventana:c.awning.curtainHasWindow,laterales:c.awning.curtainFinish,abajo:c.awning.curtainBottomFinish},null,2))}</pre></figure>`).join('')}</article>`);
}
fs.writeFileSync(`${out}/variantes.json`,JSON.stringify(variantes.map(({casos,...r})=>({...r,casos:casos.map(({datos: _datos,...c})=>c)})),null,2));
fs.writeFileSync(`${out}/index.html`,`<!doctype html><meta charset="utf-8"><title>Revisión de confección</title>${estilo}<h1>Revisión de dibujos · noviembre 2026</h1><p>${variantes.filter(v=>v.webDrawing).length} variantes del catálogo + HERA. Sin evidencia no significa correcto. Las medidas extremas prueban el espacio; no autorizan fabricar fuera de límites.</p><a href="contraste-pedidos.html">Contraste con pedidos reales</a> · <a href="embudos/index.html">Presentaciones CAD de embudos</a>${variantes.map(r=>`<article><h2><a href="${r.id}.html">${esc(r.model)} · ${esc(r.label)}</a></h2><p>${r.estado} · ${esc(r.motivo)}</p>${r.casos.map(c=>`<figure>${svgHtml(c.datos)}<figcaption>${c.nombre}: ${numero(c.awning.width)} × ${numero(c.awning.projection)}; tela ${numero(c.calculation.fabricWidth)} × ${numero(c.calculation.fabricDrop)} cm (${c.calculoReal?'motor':'simulado'})</figcaption></figure>`).join('')}</article>`).join('')}`);
// Embudos: se conservan originales completos, sin confundir geometría copiada fuera de la presentación con fabricación.
const dir=path.join(original,'embudos/dxfs');
const inventario=[];
for(const file of fs.readdirSync(dir).filter(f=>/\.dxf$/i.test(f))) {
  const bytes=fs.readFileSync(path.join(dir,file)),src=textoDxf(bytes), plano=leerPlanoTexto(src), hojas=presentacionesDxf(src);
  inventario.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),hojas:hojas.map(h=>h.nombre),textos:plano.modelo.filter(p=>p.tipo==='texto').map(p=>p.valor)});
  fs.writeFileSync(`${out}/embudos/${file.replace('.dxf','-oficina.html')}`,htmlPresentaciones(src,`${file} · oficina`));
}
const oficina=JSON.parse(fs.readFileSync('src/domain/__fixtures__/embudos-oficina.json','utf8'));
const casosEmbudo=[
 ...['AR2503676','AR2600734','AR2605215'].map(pedido=>({pedido,...oficina.conico, fuente:'Barcala: mismos radios 660,15 / 570,13 y generatriz 90,02 en tres pedidos',of:pedido==='AR2503676'?'0219135':pedido==='AR2600734'?'0225549':'0233311'})),
 {pedido:'AR2600169',...oficina.recto,of:'0224292',fuente:'Fixture revisado con Iván: corte 70 × 116; rayas a 20 y 104'},
 {pedido:'AR2506008',cantidad:1,of:'0223203',entrada:{...oficina.recto.entrada,alto:120,contornoArriba:63,remateArriba:'REFUERZO 10',remateAbajo:'REFUERZO 10',sujecion:'NINGUNA'},fuente:'Expediente: 120 → 140; contorno de 63 empleado en prueba existente, comprobar redondeo con plano'},
 {pedido:'AR2601252-A',cantidad:3,of:'0226528',entrada:{...oficina.conico.entrada,alto:80,contornoArriba:100,contornoAbajo:65,largoCinta:120},fuente:'DXF: radios 229,12 / 148,93; X3. No extrapolar la línea RPS que solo dice diferentes medidas'},
 {pedido:'AR2601252-B',cantidad:3,of:'0226528',entrada:{...oficina.conico.entrada,alto:100,contornoArriba:100,contornoAbajo:65,largoCinta:120},fuente:'DXF: radios 286,16 / 186; X3. No extrapolar a otros clientes'}
];
const embudos=[];
for(const c of casosEmbudo) {
  const order={orderCode:c.pedido,customer:'REVISIÓN DE OFICINA',technician:'IVÁN',reviewer:'',orderDate:'2026-11-01',fabric:'PVC900BL|||250|||LONA PVC 900 BLANCO :250 AN|||PLASTICA (LONA)',sameFabric:true,awnings:[{id:'a',of:c.of,model:'EMBUDO',units:c.cantidad,embudo:c.entrada}]};
  const result=generarCorteLona(order,{ofStockSacos:'2600001'});
  if(result.avisos.length || !result.plano.length) throw new Error(JSON.stringify({c,avisos:result.avisos}));
  const p=result.plano[0];
  fs.writeFileSync(`${out}/embudos/${c.pedido}-web.dxf`,p.dxf);
  fs.writeFileSync(`${out}/embudos/${c.pedido}-web.html`,htmlPresentaciones(p.dxf,`${c.pedido} · web`));
  const piezas=piezasEmbudo({embudo:c.entrada});
  embudos.push({...c,hojas:p.geometria.hojas,piezas:piezas.map(p=>({nombre:p.nombre,largo:p.largo,alto:p.alto,textos:p.geometria.textos.map(t=>t.valor)}))});
}
fs.writeFileSync(`${out}/embudos/inventario-oficina.json`,JSON.stringify(inventario,null,2));
fs.writeFileSync(`${out}/embudos/casos.json`,JSON.stringify(embudos,null,2));
fs.writeFileSync(`${out}/embudos/index.html`,`<!doctype html><meta charset="utf-8"><title>Embudos CAD</title>${estilo}<h1>Presentaciones de embudos</h1><p>Flujo de producción conservado. Comparar presentación de oficina y propuesta generada; el modelo DXF puede contener restos de otros trabajos.</p>${embudos.map(c=>`<article><h2>${c.pedido}</h2><p>${esc(c.fuente)}</p><a href="${c.pedido}-web.html">Presentación generada</a> · <a href="${c.pedido.replace(/-[AB]$/,'')}-oficina.html">Oficina</a><pre>${esc(JSON.stringify(c.entrada,null,2))}</pre></article>`).join('')}<h2>Todos los DXF de oficina (${inventario.length})</h2>${inventario.map(r=>`<p><a href="${r.file.replace('.dxf','-oficina.html')}">${r.file}</a> · ${r.hojas.join(', ')}</p>`).join('')}`);
console.log(JSON.stringify({variantes:variantes.length,web:variantes.filter(v=>v.webDrawing).length,dxfs:inventario.length,embudos:embudos.length,out}));
