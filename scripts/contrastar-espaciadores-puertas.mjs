// Lectura local, sin red. Las únicas salidas se escriben en tmp/ui-audit/puertas-espaciador/.
// Uso: node scripts/contrastar-espaciadores-puertas.mjs <carpeta local del estudio puertas>
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { leerDxf } from './lib/leer-dxf.mjs';
import { calcularPuerta, nuevaPuerta } from '../src/puertas/calcular.ts';

const estudio = path.resolve(process.argv[2]);
const destino = path.resolve('tmp/ui-audit/puertas-espaciador');
const catalogo = JSON.parse(fs.readFileSync(path.join(estudio, 'genericas/contraste.json'), 'utf8'));
const verificadas = JSON.parse(fs.readFileSync('src/puertas/__fixtures__/espaciadores-reales.json', 'utf8'));
const muestras = catalogo.puertas.filter(p => p.tipo === 'PUERTAUTO');
// AR2604526 tiene varias puertas: se aíslan los dos paños de F=350 con bordes DISCO1.
muestras.push({ pedido: 'AR2604526', medidasRps: { A: 350, H: 420 }, cuerpos: [
  { x0: 435.703, y0: 88.71, x1: 785.703, y1: 388.71, w: 350, h: 300, alto: 300 },
  { x0: 785.703, y0: 88.71, x1: 1135.703, y1: 202.21, w: 350, h: 113.5, alto: 113.5 },
] });
const redondear = x => Number(x.toFixed(3));
const cerca = (a,b) => Math.abs(a-b) < .04;
const filas = [];
for (const f of muestras) {
  const fuente = `genericas/bot/${f.pedido}.dxf`;
  const es = leerDxf(path.join(estudio, fuente)).entidades;
  const lineas = es.filter(e => e.tipo === 'LINE').map(e => ({ ...e, x1:e.x1/10, y1:e.y1/10, x2:e.x2/10, y2:e.y2/10 }));
  for (const [i,c] of f.cuerpos.entries()) {
    const girado = cerca(c.h, f.medidasRps.A) && !cerca(c.w, f.medidasRps.A);
    const frontera = (a,b,t) => lineas.some(l => l.capa==='DISCO1' && cerca(l.x1,t) && cerca(l.x2,t)
      && Math.min(l.y1,l.y2)<=a+.04 && Math.max(l.y1,l.y2)>=b-.04);
    // Los bordes compartidos pueden continuar hacia otras piezas; no se usan las rayas horizontales.
    const disco = frontera(c.y0,c.y1,c.x0) && frontera(c.y0,c.y1,c.x1);
    const marcas = lineas.filter(e => e.capa==='ROTULADOR' && Math.min(e.x1,e.x2)>=c.x0-.04
      && Math.max(e.x1,e.x2)<=c.x1+.04 && Math.min(e.y1,e.y2)>=c.y0-.04 && Math.max(e.y1,e.y2)<=c.y1+.04)
      .filter(e => girado ? cerca(e.y1,e.y2) && Math.abs(e.x2-e.x1)>c.w*.4 : cerca(e.x1,e.x2) && Math.abs(e.y2-e.y1)>c.h*.4)
      .map(e => ({ x:redondear(girado?e.y1-c.y0:e.x1-c.x0),
        inicio:redondear(girado?Math.min(e.x1,e.x2)-c.x0:Math.min(e.y1,e.y2)-c.y0),
        fin:redondear(girado?c.x1-Math.max(e.x1,e.x2):c.y1-Math.max(e.y1,e.y2)) }))
      .sort((a,b)=>a.x-b.x);
    const fixture = verificadas.find(v => v.pedido===f.pedido);
    if (fixture) {
      assert.ok(disco, `${f.pedido}: bordes DISCO1 comprobados`);
      assert.equal(marcas.length,fixture.xDesdeDisco.length,`${f.pedido}: número de marcas`);
      marcas.forEach((m,j)=>assert.ok(cerca(m.x,fixture.xDesdeDisco[j]),`${f.pedido}: X desde DISCO1`));
    }
    const ancho=redondear(girado?c.h:c.w);
    filas.push({pedido:f.pedido,fuente,pano:i+1,ancho,alto:c.alto,girado,bordesDisco:disco,marcas,
      estado:fixture?'posiciones contrastadas':!marcas.length?'sin marcas identificadas':!cerca(ancho,f.medidasRps.A)?'ancho histórico distinto del pedido':'observación histórica; no fija opción'});
  }
}
// Comprueba también el cálculo contra las seis referencias, sin depender de su colocación en el rollo.
for (const f of verificadas) {
  const p={...nuevaPuerta('PUERTAUTO'),frente:f.frente,alto:f.alto,rollo:300,
    autorreparable:{empates:[],espaciadorCentral:f.centralEnCorte}};
  for (const x of calcularPuerta(p).piezas.filter(x=>x.clase==='pano')) {
    assert.deepEqual(x.marcas.filter(s=>s[0]===s[2] && Math.abs(s[3]-s[1])>5).map(s=>s[0]).sort((a,b)=>a-b),f.xDesdeDisco);
  }
}
fs.mkdirSync(destino,{recursive:true});
fs.writeFileSync(path.join(destino,'contraste-espaciadores.json'),JSON.stringify(filas,null,2));
const num = x => x.toLocaleString('es-ES',{maximumFractionDigits:3});
const tabla=['# Marcas de espaciadores medidas desde DISCO1', '',
  'Las cotas son cm. Inicio y fin son retranqueos desde la caja de corte, antes de deshacer el giro. La casilla se decide mirando el pedido; una marca histórica no la activa.', '',
  '| Pedido | Paño | Caja (ancho × alto) | Girado | X desde DISCO1 | Inicio / fin | Bordes DISCO1 | Resultado |',
  '|---|---|---|---|---|---|---|---|',
  ...filas.map(f=>`| ${f.pedido} | ${f.pano} | ${num(f.ancho)} × ${num(f.alto)} | ${f.girado?'sí':'no'} | ${f.marcas.map(m=>num(m.x)).join(' / ')} | ${f.marcas.map(m=>`${num(m.inicio)} / ${num(m.fin)}`).join('; ')} | ${f.bordesDisco?'sí':'revisar'} | ${f.estado} |`), '',
  'AR2604904: paños de 426; laterales a 10 y 416, central a 211,1 = F/2 − 1,9. El retranqueo superior es 33,5 = 30 + 3,5 en A1; el resto, 2.',
  'AR2604526: hay central a 173,1 en los dos paños de 350, aunque no se dibuje en el alzado revisado. Las verticales 115,2 / 402,2 / 412,2 / 428,7 pertenecen a otro conjunto del corte.',
  'Las diferencias de extremos en AR2604717 (1,5), AR2600951 (0) y AR2600651 (0/1), la central al otro lado del eje de AR2604212 y el ancho de AR2602802 se conservan como observaciones históricas; no sustituyen la referencia confirmada.', ''];
fs.writeFileSync(path.join(destino,'contraste-espaciadores.md'),tabla.join('\n'));
console.log(`${muestras.length} cortes locales, ${filas.length} paños; seis referencias comprobadas contra DISCO1 y el cálculo. Tabla: ${destino}/contraste-espaciadores.md`);
