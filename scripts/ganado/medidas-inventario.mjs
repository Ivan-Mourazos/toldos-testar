import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fuentes, guardar, salida, hash } from './medidas-fuentes.mjs';
import { leerDxf, vertices, bulges, texto, normal } from './medidas-dxf.mjs';
const caja = ps => [0, 1, 2].map(i => [Math.min(...ps.map(p => p[i])), Math.max(...ps.map(p => p[i]))]);
export function analizarFuente(f) {
  const d = leerDxf(f.dxf), es = d.entidades;
  const geometria = es.map(e => ({ e, ps: vertices(e) })).filter(x => x.ps.length);
  const espacial = geometria.filter(({ ps }) => { const c = caja(ps); return c[2][1] - c[2][0] > 0.001; });
  const perfiles = espacial.filter(({ e, ps }) => ['LWPOLYLINE', 'POLYLINE'].includes(e.t) && ps.length >= 4 && caja(ps)[0][1] - caja(ps)[0][0] < 0.00001).map(({ e, ps }) => ({ id: e.id, capa: e.capa, vertices: ps, bulges: bulges(e), normal: normal(e), caja: caja(ps), cerrada: !!(+e.g[70] & 1) }));
  const planos = geometria.filter(({ e, ps }) => ['LWPOLYLINE', 'POLYLINE'].includes(e.t) && ps.length >= 4 && caja(ps)[2][1] - caja(ps)[2][0] < 0.00001).map(({ e, ps }) => ({ id: e.id, capa: e.capa, vertices: ps, bulges: bulges(e), cerrada: !!(+e.g[70] & 1) }));
  const porCapa = {};
  for (const { e } of espacial) { const k = e.capa + ' / ' + e.t; porCapa[k] = (porCapa[k] ?? 0) + 1; }
  return { ...f, sha256Dxf: hash(f.dxf), entidades: es.length, espaciales: espacial.length, porCapa, perfiles, planos, arcos3d: espacial.filter(({ e }) => e.t === 'ARC').map(({ e, ps }) => ({ id: e.id, capa: e.capa, radio: +e.g[40], normal: normal(e), vertices: ps })), lineas3d: espacial.filter(({ e }) => e.t === 'LINE').map(({ e, ps }) => ({ id: e.id, capa: e.capa, vertices: ps })), textos: es.filter(e => /TEXT/.test(e.t)).map(e => ({ id: e.id, capa: e.capa, texto: texto(e), punto: [+e.g[10], +e.g[20]] })) };
}
export function inventariar() {
  const out = [], sin3d = [], errores = [];
  for (const f of fuentes()) {
    try { const r = analizarFuente(f); if (r.espaciales) out.push(r); else sin3d.push({ id: f.id, fuente: f.dxf, entidades: r.entidades }); }
    catch (e) { errores.push({ id: f.id, fuente: f.dxf, error: e.message }); }
  }
  const cp=path.join(salida,'contraste.json'),contrastes=fs.existsSync(cp)?JSON.parse(fs.readFileSync(cp)).filas:[];
  for(const f of out){const c=contrastes.find(c=>c.id===f.id);f.piezasPlanas=c?{bandas:c.bandasValidas.map(b=>({secciones3d:b.perfiles,pieza:'Morro terminado',referenciasPlanas:b.referenciaPlana??null,estado:b.estado,errorMm:b.errorVerticesMm??null,cierres:b.cierresIdentificados??null})),cabezas:c.arcos.map(a=>({seccion3d:a.perfil,pieza:'Cabeza terminada; posición por confirmar',referenciaPlana:a.referenciaPlana,estado:a.estado,errorRadioMm:a.errorRadiosMm,errorCentroMm:a.errorCentrosMm}))}:null;}
  guardar('inventario.json', { criterio: 'Geometría de modelo expandida de INSERT, OCS convertido a WCS, variación Z > 1 mm; no incluye textos ni cotas. La presencia 3D es candidata, no asigna automáticamente un morro ni una pieza de corte.', con3d: out, sin3d, errores });
  guardar('INVENTARIO.md', '# Inventario generado\n\nGeometría candidata con variación real de altura. Los bloques se expanden y los arcos se orientan en su plano. Una correspondencia sin resolver se declara como tal.\n\n| Archivo | Fuente | Geometría espacial por capa y tipo | Perfiles completos | Pieza plana |\n|---|---|---|---:|---|\n' + out.map(x => `| ${x.id} ${x.nombre ?? x.cliente ?? ''} | ${x.dxf} | ${Object.entries(x.porCapa).map(([k,v]) => k + ': ' + v).join('; ')} | ${x.perfiles.length} | ${x.perfiles.length >= 2 ? 'Candidato a banda del morro; ver contraste y entidades de referencia' : 'Sin asignar: requiere identificar las secciones'} |`).join('\n') + `\n\nSin variación 3D: ${sin3d.length}. Errores de lectura: ${errores.length}.\n`);
  fs.appendFileSync(path.join(salida,'INVENTARIO.md'),'\n\n## Correspondencia de entidades, generada\n\n'+out.filter(f=>f.piezasPlanas).map(f=>'### '+f.id+'\n\n'+f.piezasPlanas.bandas.map(b=>`- Secciones \`${b.secciones3d.join('; ')}\` → morro terminado \`${b.referenciasPlanas?.join('; ')??'sin identificar'}\`: ${b.estado}${b.errorMm==null?'':'; diferencia '+b.errorMm.toFixed(3)+' mm'}.`).join('\n')+'\n'+f.piezasPlanas.cabezas.map(b=>`- Sección \`${b.seccion3d}\` → cabeza plana \`${b.referenciaPlana}\`: ${b.estado}; diferencia de radio ${b.errorRadioMm.toFixed(3)} mm.`).join('\n')).join('\n\n'));
  console.log(JSON.stringify({ revisados:out.length+sin3d.length,con3d:out.length,sin3d:sin3d.length,errores }));
  return out;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) inventariar();
