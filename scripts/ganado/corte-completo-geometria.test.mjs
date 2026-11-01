import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { linea, compararPrimitivas, offsetPoligono, arco, puntosPrimitiva } from './corte-completo-geometria.mjs';
import { hojas, leerReglas, generar } from './corte-completo.mjs';

test('el contraste detecta una raya real que falta y una calculada que sobra', () => {
  const a=linea([0,0],[100,0]),b=linea([0,20],[100,20]);
  assert.equal(compararPrimitivas([a],[a,b]).vuelta.max,20);
  assert.equal(compararPrimitivas([a,b],[a]).ida.max,20);
});
test('no se permite corregir la escala para ocultar un error de medida', () => {
  assert.equal(compararPrimitivas([linea([0,0],[110,0])],[linea([0,0],[100,0])]).ida.max,10);
});
test('el margen se intersecta en las esquinas y conserva el margen por borde', () => {
  const p=offsetPoligono([[0,0],[100,0],[100,50],[0,50]],[10,20,30,40]);
  assert.deepEqual(p,[[-40,-10],[120,-10],[120,80],[-40,80]]);
});
test('los arcos conservan centro, radio y barrido, no solo sus extremos', () => {
  const a=arco([0,0],100,0,Math.PI),b=arco([0,0],100,0,-Math.PI);
  assert.ok(compararPrimitivas([a],[b]).ida.max>100);
  assert.equal(puntosPrimitiva(a).length>2,true);
});
test('el cálculo de piezas funciona sin leer ningún bot', () => {
  const leer=fs.readFileSync;
  fs.readFileSync=function(f,...args){
    if(String(f).replaceAll('\\','/').includes('/fuentes/bot/'))throw Error('El cálculo ha intentado leer su resultado de referencia');
    return leer.call(this,f,...args);
  };
  try {
    const reglas=leerReglas();
    for(const h of hojas){const r=generar(h,reglas);assert.ok(r.piezas.every(p=>p.corte.length&&p.contorno.length));}
  } finally {fs.readFileSync=leer;}
});
