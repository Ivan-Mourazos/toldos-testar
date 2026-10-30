// Auditoría del estudio. Verifica fuentes y los resultados tal como son, incluidos
// fallos y ausencias; no transforma esos fallos en aciertos de producción.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { raiz, salida, fuentes, guardar, hash } from './medidas-fuentes.mjs';
const leer=n=>JSON.parse(fs.readFileSync(path.join(salida,n)));
const inv=leer('inventario.json'),contraste=leer('contraste.json'),acabados=leer('acabados-cal.json'),propuesta=leer('propuesta.json'),rps=leer('rps-entrada.json').body.pedido;
const catalogo=leer('fuentes/pedidos-base.json').pedidos;
assert.equal(fuentes().length,inv.con3d.length+inv.sin3d.length);
assert.equal(inv.errores.length,0);assert.equal(contraste.errores.length,0);
for(const r of contraste.filas){assert.ok(fs.existsSync(r.fuente));assert.equal(hash(r.fuente),r.sha256);if(/^AR|^SA|^BE/.test(r.id))assert.ok(catalogo.some(p=>p.pedido===r.id),'Pedido inexistente: '+r.id);}
const resumen=contraste.resumen;
for(const [grupo,s] of Object.entries(resumen)){const rs=contraste.filas.filter(r=>r.grupo===grupo);assert.equal(rs.length,s.fuentes);assert.equal(rs.filter(r=>r.mejor?.estado==='cuadra').length,s.cuadran);}
const doc=path.join(raiz,'docs/modelos/remolque-ganado-medidas.md'),md=fs.readFileSync(doc,'utf8');
const enlaces=[...md.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]).filter(s=>!/^https?:/.test(s));
for(const enlace of enlaces)assert.ok(fs.existsSync(path.resolve(path.dirname(doc),enlace)), 'Enlace sin archivo: '+enlace);
for(const fila of md.split(/\r?\n/).filter(l=>/^\| (Deducción|Reservado) \|/.test(l))){const c=fila.split('|').map(s=>s.trim()),id=path.basename(c[2].match(/\]\(([^)]+)\)/)[1],'.dxf'),r=contraste.filas.find(r=>r.id===id);assert.ok(r);assert.ok(Math.abs(Number(c[3].replace(',','.'))-r.mejor.errorVerticesMm)<.00051);assert.ok(Math.abs(Number(c[4].replace(',','.'))-r.mejor.errorLongitudesMm)<.00051);}
const linea=rps.lineas.find(l=>l.numeroLinea===propuesta.entrada.linea);
assert.equal(rps.numero,propuesta.entrada.pedido);assert.equal(rps.cliente.codigo,'016573');assert.equal(linea.ordenFabricacion,propuesta.entrada.of);assert.equal(linea.codigoArticulo,'LONAREMGANA');
assert.equal(propuesta.entrada.validado,false);assert.equal(propuesta.entrada.medidas.altoA-propuesta.entrada.medidas.altoB,100);
const familiaRef=acabados.filas.find(r=>r.id==='AR2605157'&&r.terminado==='18B32');assert.ok(familiaRef);
const familia=acabados.filas.filter(r=>/^AR/.test(r.id)&&r.radiosTerminadoMm.length===familiaRef.radiosTerminadoMm.length&&r.radiosTerminadoMm.every((x,i)=>Math.abs(x-familiaRef.radiosTerminadoMm[i])<.001));
const incrementoReferencia=familiaRef.incrementosRadioMm[0];
for(const r of familia)for(const d of r.incrementosRadioMm)assert.ok(Math.abs(d-incrementoReferencia)<.001);
const imagenes=['hoja-entrada-p3.png','hoja-entrada-p4.png','curva-orientativa.png','propuesta-3d.png','propuesta-plano.png','caso-real-lado-a-lado.png'].map(f=>{const p=path.join(salida,f),b=fs.readFileSync(p);assert.equal(b.subarray(1,4).toString(),'PNG');return {archivo:f,ancho:b.readUInt32BE(16),alto:b.readUInt32BE(20),sha256:hash(p)};});
const comprobados=contraste.filas.filter(r=>r.grupo==='reservado'&&r.mejor?.estado==='cuadra');
const fallos=contraste.filas.filter(r=>r.grupo==='reservado'&&r.mejor?.estado==='no cuadra');
const salidaFinal={auditoriaCorrecta:true,metodoAprobado:false,fuentes:fuentes().length,inventario3d:inv.con3d.length,resumen,coincidenciasReservadas:comprobados.map(r=>({id:r.id,errorVerticesMm:r.mejor.errorVerticesMm,errorLongitudesMm:r.mejor.errorLongitudesMm})),fallosReservados:fallos.map(r=>({id:r.id,errorVerticesMm:r.mejor.errorVerticesMm,errorLongitudesMm:r.mejor.errorLongitudesMm})),familiaCal:{pedidos:[...new Set(familia.map(r=>r.id))],formasDistintas:new Set(familia.map(r=>r.medidaTerminadoMm.map(x=>Math.round(x*10)).join(','))).size,incrementoRadioMm:incrementoReferencia,pedidosConArcosBotComprobados:[...new Set(familia.filter(r=>r.contrasteArcosBot?.estado==='cuadra').map(r=>r.id))]},enlacesComprobados:enlaces.length,imagenes,nota:'La verificación automática de PNG comprueba formato y huella; la revisión visual se ha realizado aparte en la sesión.'};
guardar('verificacion.json',salidaFinal);
console.log(JSON.stringify({auditoriaCorrecta:true,metodoAprobado:false,fuentes:salidaFinal.fuentes,resumen,familiaCal:salidaFinal.familiaCal,enlaces:enlaces.length,imagenes:imagenes.length}));
