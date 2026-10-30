// Estudio reproducible. No escribe src, documentos de producción ni rutas de red.
// --comprobar verifica fuentes, separación de muestra, geometría y tabla de contraste;
// un resultado «no cuadra» sigue apareciendo como fallo del método, nunca se oculta.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fuentes, guardar, salida, hash } from './medidas-fuentes.mjs';
import { compararFuente } from './medidas-cad.mjs';
import { distancia, construirMorro } from './medidas-geometria.mjs';
import { dibujarPropuesta, dibujarComparado } from './medidas-dibujar.mjs';

const entradaPos=process.argv.indexOf('--entrada');
if(entradaPos>=0){
  const entrada=JSON.parse(fs.readFileSync(process.argv[entradaPos+1]));
  if(entrada.unidad!=='mm')throw Error('La entrada debe declarar unidad mm');
  if(!(entrada.medidas?.largoCuerpo>0))throw Error('Falta el largo positivo de la parte recta, en mm');
  const modelo=construirMorro(entrada.medidas),lamina=dibujarPropuesta(modelo,'entrada',{cliente:entrada.cliente??'MODELO POR MEDIDAS',pedido:entrada.pedido??'Entrada geométrica'});
  guardar('entrada-desarrollada.json',{entrada,modelo,lamina,validado:false});
  console.log('tmp/ganado-medidas/entrada-desarrollada.json: 3D y desarrollo calculados desde la entrada, en mm.');
  process.exit(0);
}

// Se fijó antes de ejecutar la muestra reservada. Son los dibujos inspeccionados al
// elegir la triangulación desde la cumbrera, incluidos los que ya fallaban.
const deduccion = new Set(['AR2605060', 'AR2604709', 'AR2604281', 'AR2603720', 'AR2601847', 't188', 't189', 't190']);
const unidad = n => n == null ? '—' : n.toLocaleString('es-ES', { maximumFractionDigits: 3, minimumFractionDigits: 3 });
const todos = fuentes();
const filas = [], errores = [];
for (const f of todos) {
  try {
    const r = compararFuente(f);
    if (r.perfiles.length) {
      r.grupo = deduccion.has(f.id) ? 'deducción' : 'reservado';
      r.sha256 = hash(f.dxf);
      // Solo se consideran pares con el mismo origen o con enlace espacial real.
      const apoyo = Math.max(0,...r.bandas.map(b=>b.apoyoEnlaces??0));
      r.bandasValidas = r.bandas.filter(b => !b.origen || (b.origen[0] === b.origen[1] && (!apoyo || b.apoyoEnlaces === apoyo)));
      // Se conservan todas las hipótesis en JSON; el resumen elige la menor
      // discrepancia de colocación, nunca modifica las medidas para acercarse.
      const medibles = r.bandasValidas.filter(b => b.errorVerticesMm != null).sort((a,b) => a.errorVerticesMm - b.errorVerticesMm);
      r.mejor = medibles[0] ?? r.bandasValidas[0] ?? null;
      filas.push(r);
    }
  } catch (e) { errores.push({ id: f.id, fuente: f.dxf, error: e.message }); }
}
// Una copia de una geometría usada para deducir no es una comprobación nueva.
const firma=r=>r.mejor?.anchoMm==null?null:JSON.stringify([r.mejor.anchoMm,r.mejor.frenteMm,r.mejor.proyeccionMm,...r.mejor.alturaMm,...r.mejor.radiosMm.flat()].map(x=>Math.round(x*1000)));
const conocidas=new Set(filas.filter(r=>r.grupo==='deducción').map(firma).filter(Boolean));
for(const r of filas)if(r.grupo==='reservado'&&firma(r)&&conocidas.has(firma(r)))r.grupo='duplicado de deducción';
const resumen = {};
for (const grupo of ['deducción', 'reservado', 'duplicado de deducción']) {
  const rs = filas.filter(r => r.grupo === grupo);
  resumen[grupo] = { fuentes: rs.length, cuadran: rs.filter(r => r.mejor?.estado === 'cuadra').length, noCuadran: rs.filter(r => r.mejor?.estado === 'no cuadra').length, sinCorrespondencia: rs.filter(r => !['cuadra', 'no cuadra'].includes(r.mejor?.estado)).length };
}
const tabla = '| Archivo | Muestra | Secciones 3D | Desarrollo plano (identificadores) | Vértices ida mm | Vuelta mm | Longitudes mm | Resultado |\n|---|---|---|---|---:|---:|---:|---|\n' + filas.map(r => `| ${r.id} | ${r.grupo} | ${r.mejor?.perfiles?.join('; ') ?? r.perfiles.map(p => p.id).join('; ')} | ${r.mejor?.referenciaPlana?.join('; ') ?? 'sin identificar'} | ${unidad(r.mejor?.errorIdaMm)} | ${unidad(r.mejor?.errorVueltaMm)} | ${unidad(r.mejor?.errorLongitudesMm)} | ${r.mejor?.estado ?? 'sin pareja 3D'} |`).join('\n');
guardar('contraste.json', { metodo: 'Triangulación desde la cumbrera, sin escala en el ajuste. Se leen secciones, radios y referencias planas de cada DXF; no hay medidas de pedidos escritas en el generador. Tolerancia geométrica: 1 mm. Los arcos se discretizan con los puntos espaciales conservados; si faltan, cuatro cuerdas por arco. Las cifras de esta tabla son de la banda terminada, no del corte ni de los acabados.', deduccion: [...deduccion], resumen, filas, errores });
guardar('CONTRASTE.md', '# Contraste generado\n\n' + JSON.stringify(resumen, null, 2) + '\n\n' + tabla + '\n\n## Fuentes\n\n' + filas.map(r => `- ${r.id}: \`${r.fuente}\`; original \`${r.original}\`; SHA-256 DXF \`${r.sha256}\`.`).join('\n') + '\n\nLos guiones significan que no se ha identificado una referencia comparable: no equivalen a cero. La geometría de corte y sus arcos requieren el contraste adicional de acabados; no se cuentan como validados por esta tabla.\n');
const tablaArcos='\n\n## Arcos de los perfiles y las cabezas terminadas\n\n| Archivo | Perfil 3D | Cabeza plana | Arcos | Vértices mm | Radio mm | Largo de arco mm | Resultado |\n|---|---|---|---:|---:|---:|---:|---|\n'+filas.flatMap(r=>r.arcos.map(a=>`| ${r.id} | ${a.perfil} | ${a.referenciaPlana} | ${a.arcos} | ${unidad(a.errorVerticesMm)} | ${unidad(a.errorRadiosMm)} | ${unidad(a.errorLongitudArcoMm)} | ${a.estado} |`)).join('\n');
fs.appendFileSync(path.join(salida,'CONTRASTE.md'),tablaArcos+'\n');
dibujarComparado(filas.find(r=>r.id==='AR2601298'));
console.log(tabla);
console.log(JSON.stringify({ resumen, errores }));
if (process.argv.includes('--comprobar')) {
  assert.equal(errores.length, 0, 'Hay fuentes que no se han podido analizar');
  for (const r of filas) {
    assert.ok(fs.existsSync(r.fuente)); assert.equal(hash(r.fuente), r.sha256);
    assert.equal(r.grupo === 'deducción', deduccion.has(r.id));
    for (const b of r.bandas.filter(b => b.errorVerticesMm != null)) {
      assert.equal(b.generado.length, b.referencia.length);
      assert.ok(Number.isFinite(b.errorLongitudesMm));
      assert.ok(b.errorVerticesMm >= 0 && b.errorIdaMm >= 0 && b.errorVueltaMm >= 0);
      const vuelta = b.referencia.map(p => Math.min(...b.generado.map(q => distancia(p, q)))) ;
      assert.ok(Math.abs(Math.max(...vuelta) * 1000 - b.errorVueltaMm) < 1e-6);
    }
  }
  console.log('Comprobación de auditoría correcta; «cuadra» se refiere solo a las filas que lo indican. El método NO queda aprobado para producción.');
}
