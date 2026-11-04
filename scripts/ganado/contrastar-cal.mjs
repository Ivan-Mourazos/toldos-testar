// Solo copias locales y salidas en tmp/. No consulta RPS, red ni el .env.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { calcularMedidasCal, MEDIDAS_CAL_5319, MEDIDAS_CAL_GEMELO } from '../../src/remolques/ganado/medidas.ts';
import { juegoCorteCal, medidaPiezaCal } from '../../src/remolques/ganado/salidasCal.ts';
import { calcGanado } from '../../src/remolques/calc/ganado.ts';
import { emptyGanado } from '../../src/remolques/entradas-vacias.ts';
import { generarCorteRemolques } from '../../src/remolques/corte/index.js';
import { escribirPlanoRemolques } from '../../src/remolques/corte/plano.js';
import { escribirDxf2004 } from '../../src/domain/corteLona/dxfCorte.js';
import { DEFAULT_PARAMS } from '../../src/remolques/calc/params.ts';
import { RECTANGULOS_ESTANDAR_PENDIENTES } from '../../src/remolques/ganado/estandarConfeccion.ts';
import { compararFuente } from './medidas-cad.mjs';
import { hojas, leerReglas, comprobarCaso } from './corte-completo.mjs';
import { aceptarGemeloCal } from './aceptacion-cal.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const salida = path.join(raiz, 'tmp/ganado-cal');
const indice = process.argv.indexOf('--fuentes');
const fuentes = path.resolve(indice >= 0 ? process.argv[indice + 1] : path.join(raiz, 'tmp/ganado-medidas/fuentes'));
if (/^(?:\\\\|\/\/)/.test(fuentes)) throw Error('Usa únicamente una carpeta de copias locales.');
fs.mkdirSync(salida, { recursive: true });
const guardar = (nombre, s) => fs.writeFileSync(path.join(salida, nombre), typeof s === 'string' ? s : JSON.stringify(s, null, 2));
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
// Los diez caballos citados en RADIOS-CAL y el gemelo. El manifiesto añade los demás Cal del estudio si está disponible.
const ids = new Set(['AR2605157','AR2601621','AR2601124','AR2506199','AR2502712','AR2405521','AR2405130','AR2401758','AR2306796','AR2300359','AR2506052']);
const manifiesto = path.join(fuentes, 'pedidos-base.json');
if (fs.existsSync(manifiesto)) {
  for (const p of JSON.parse(fs.readFileSync(manifiesto)).pedidos) if (/\bCAL\b/i.test(JSON.stringify(p.cliente))) ids.add(p.pedido);
}
ids.delete('AR2500389'); // Q-GAN02: especial; no es evidencia de reglas generales.
const historico = [...ids].sort().map(id => {
  const dxf = path.join(fuentes, 'dxf', id + '.dxf'), bot = path.join(fuentes, 'bot', id + '.dxf');
  if (!fs.existsSync(dxf)) return { id, estado: 'NO COMPROBADO: falta la copia CAD de oficina', botDisponible: fs.existsSync(bot) };
  try {
    const r = compararFuente({ id, dxf });
    const apoyo = Math.max(0, ...r.bandas.map(b => b.apoyoEnlaces ?? 0));
    const bandas = r.bandas.filter(b => !b.origen || (b.origen[0] === b.origen[1] && (!apoyo || b.apoyoEnlaces === apoyo)));
    const mejor = bandas.filter(b => b.errorVerticesMm != null).sort((a,b) => a.errorVerticesMm-b.errorVerticesMm)[0] ?? bandas[0];
    return { id, estado: mejor?.estado ?? 'sin pareja 3D', botDisponible: fs.existsSync(bot), sha256Cad:hash(dxf),
      sha256Bot:fs.existsSync(bot)?hash(bot):null, mejor, desarrollo: r };
  } catch (e) { return { id, estado: 'NO COMPROBADO: ' + e.message, botDisponible: fs.existsSync(bot) }; }
});

// El gemelo tiene hoja y acabados identificados, por lo que permite comparar el corte completo.
let corteGemelo;
try {
  const r = comprobarCaso(hojas[0],leerReglas());
  const aceptacion = aceptarGemeloCal(r.piezas);
  corteGemelo = { estado:aceptacion.aceptado?'ACEPTADO POR IVÁN':r.cuadra?'cuadra':'NO CUADRA', aceptacion, fuente:r.fuenteBot, sha256Bot:r.sha256Bot,
    piezas:r.piezas.map(p=>({nombre:p.nombre,cuadra:p.cuadra,contraste:p.contraste})) };
} catch(e) { corteGemelo = { estado:'NO COMPROBADO: '+e.message }; }

const elemento = (m, numeroPedido, of) => {
  const input = { ...emptyGanado('CAL_MEDIDAS'), medidasCal: m, ancho: m.ancho, largo: 300,
    material: 'LONA PVC 580 GRIS 7037 :250 AN (580)', arcosComprobados: true };
  input.cabecera = { ...input.cabecera, numeroPedido, ordenFabricacion: of, cliente: 'TALLERES CAL', realizadoPor: 'IVÁN' };
  return { tipo: 'ganado', version: '10', of, input, result: calcGanado(input) };
};
const casos = [
  ['AR2506052', '0223263', MEDIDAS_CAL_GEMELO], ['AR2605319', '0233492', MEDIDAS_CAL_5319],
].map(([id, of, m]) => {
  const g = calcularMedidasCal(m), e = elemento(m, id, of);
  const pedido = { orderCode: id, summary: { customer: 'TALLERES CAL', technician: 'IVÁN' }, elementos: [e], params: DEFAULT_PARAMS };
  const produccion = generarCorteRemolques(pedido);
  if (produccion.archivo) {
    guardar(id + '-corte.dxf', produccion.archivo.dxf);
    guardar(id + '-plano.dxf', produccion.archivo.plano.dxf);
  } else {
    // Evidencia de revisión: nombres y rótulos impiden confundirlo con un pedido completo.
    const c = juegoCorteCal(m, of);
    const entidades = {
      lineas: [...c.lineas.map(([x1,y1,x2,y2]) => ({ capa:'DISCO1',x1,y1,x2,y2 })), ...c.rot.map(([x1,y1,x2,y2]) => ({ capa:'ROTULADOR',x1,y1,x2,y2 }))],
      arcos: c.arcos.map(a => ({ ...a, capa:'DISCO1' })), circulos: c.ollaos.map(([x,y]) => ({ capa:'ROTULADOR',x,y,r:2.5 })),
      textos: [...c.textos.map(t => ({ ...t, capa:'texto' })), { capa:'texto',x:0,y:c.h+150,h:75,valor:'PARCIAL - FALTA PUERTA - NO VALIDO PARA CORTAR EL PEDIDO' }],
    };
    guardar(id + '-PARCIAL-NO-CORTAR.dxf', escribirDxf2004(entidades));
    guardar(id + '-PARCIAL-plano.dxf', escribirPlanoRemolques({ pedido, lonas:[], ganados:[e], params:DEFAULT_PARAMS,
      cortes:[{ entidades,largo:c.w,material:e.input.material }] }));
  }
  return { id, entrada:m, largoHechoCm:g.largoHecho/10, radioExteriorCm:m.radio, ventana:g.ventana,
    piezas:g.piezas.map(p => ({ nombre:p.nombre,corte:medidaPiezaCal(p),ollaos:p.ollaos.length })),
    pendientes:g.pendientes, exportacionCompleta:!!produccion.archivo };
});
const informe = { fecha:'2026-11-04', alcance:'Contraste desde copias locales del archivo: desarrollo de todos los Cal del manifiesto salvo el 00389 y corte completo del gemelo. Los casos sin correspondencia no se cuentan como aciertos; el desarrollo no acredita por sí solo los acabados de cada pedido.',
  manifiestoDisponible:fs.existsSync(manifiesto), excluido:'AR2500389 (Q-GAN02)', historico, corteGemelo, casos,
  estandar:{ rectangulos:RECTANGULOS_ESTANDAR_PENDIENTES, conclusion:'Q-GAN06, Iván 04/11/2026: 98 × 32 es el hueco de puerta; 34,5 × 56 es la tapa de ventana. Sin añadir acabados no confirmados.' } };
guardar('contraste.json', informe);
const fmt=x=>x==null?'—':x.toLocaleString('es-ES',{maximumFractionDigits:3});
const tabla = '| Pedido | Desarrollo desde 3D | Vértices ida / vuelta (mm) | Longitudes (mm) | Bot local |\n|---|---|---|---|---|\n' + historico.map(r => `| ${r.id} | ${r.estado} | ${fmt(r.mejor?.errorIdaMm)} / ${fmt(r.mejor?.errorVueltaMm)} | ${fmt(r.mejor?.errorLongitudesMm)} | ${r.botDisponible?'Sí':'No'} |`).join('\n');
const filasGemelo=corteGemelo.piezas?.map(p=>{const n=k=>{const c=p.contraste[k];return `${c.ida.cuadran}/${c.ida.total} · ${c.vuelta.cuadran}/${c.vuelta.total}; máx. ${fmt(Math.max(c.ida.max,c.vuelta.max))} mm`;};return `| ${p.nombre} | ${n('tramos')} | ${n('arcos')} | ${n('ollaos')} | ${n('marcas')} | ${p.cuadra?'Cuadra':'NO CUADRA'} |`;}).join('\n')??corteGemelo.estado;
guardar('CONTRASTE.md', '# Cal por medidas · 04/11/2026\n\n' + informe.alcance + '\n\n' + tabla + '\n\n## Corte del gemelo, ida / vuelta\n\n| Pieza | Tramos | Arcos | Ollaos | Marcas | Resultado geométrico a 1 mm |\n|---|---|---|---|---|---|\n'+filasGemelo+'\n\nAceptación de taller: '+corteGemelo.estado+'. '+(corteGemelo.aceptacion?.excepcionHistorica??'')+'\n\nEl 00389 queda excluido. Ver `contraste.json` para el cálculo del gemelo y el 5319 y las huellas de todas las fuentes locales. La exportación completa de cada caso se indica expresamente en ese JSON.\n');
console.log(tabla);
console.log(JSON.stringify({ casos, manifiestoDisponible:informe.manifiestoDisponible },null,2));
if (process.argv.includes('--comprobar')) {
  if (!informe.manifiestoDisponible || corteGemelo.estado.startsWith('NO COMPROBADO') || historico.some(r => !r.botDisponible || r.estado.startsWith('NO COMPROBADO'))) process.exitCode = 2;
  else if (corteGemelo.estado==='NO CUADRA' || historico.some(r=>r.estado!=='cuadra')) process.exitCode=1;
}
