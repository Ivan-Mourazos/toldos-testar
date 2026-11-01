// Pruebas independientes del CAD: distancias, orientación espacial y desarrollo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ocs, desarrollarBanda, desarrollarDesdeCentro, distancia, construirMorro, ajustarCirculo, contornoPerfil } from './medidas-geometria.mjs';

test('un arco en el plano vertical conserva su orientación OCS', () => {
  assert.ok(distancia(ocs([2, 3, 4], [1, 0, 0]), [4, 2, 3]) < 1e-12);
  assert.ok(distancia(ocs([2, 3, 4], [-1, 0, 0]), [-4, -2, 3]) < 1e-12);
});

test('el desarrollo conserva cada lado y diagonal de una banda alabeada', () => {
  const a = [[0, 0, 0], [0, 1, 0], [0, 2, 1]];
  const b = [[2, 0, 0], [2, 1, 1], [2, 2, 2]];
  const r = desarrollarBanda(a, b);
  for (const t of r.triangulos) {
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      assert.ok(Math.abs(distancia(t.espacio[i], t.espacio[j]) - distancia(t.plano[i], t.plano[j])) < 1e-10);
    }
  }
});

test('una banda rectangular sale rectangular, sin tomar el plano como entrada', () => {
  const r = desarrollarBanda([[0, 0, 0], [0, 1, 0]], [[2, 0, 0], [2, 1, 0]]);
  assert.ok(Math.abs(distancia(r.a[0], r.a[1]) - 1) < 1e-12);
  assert.ok(Math.abs(distancia(r.a[0], r.b[1]) - Math.sqrt(5)) < 1e-12);
});

test('construir el morro respeta planta y desnivel y rechaza medidas imposibles', () => {
  const r = construirMorro({ ancho: 1600, frente: 600, diagonal: 1000, altoA: 600, altoB: 500, aguasA: 100, aguasB: 80, radioA: 100, radioB: 80, pasos: 12 });
  assert.ok(Math.abs(r.proyeccion - Math.sqrt(750000)) < 1e-9);
  assert.equal(r.perfilA.length, r.perfilB.length);
  assert.ok(distancia(r.desarrollo.a[(r.perfilA.length-1)/2],[0,0])<1e-12);
  assert.throws(() => construirMorro({ ancho: 1600, frente: 600, diagonal: 400 }));
});

test('el ajuste de un círculo recupera el radio sin depender del origen',()=>{
  const puntos=Array.from({length:50},(_,i)=>{const a=i/49*Math.PI/2;return [700+80*Math.cos(a),-400+80*Math.sin(a)];});
  const r=ajustarCirculo(puntos);
  assert.ok(Math.abs(r.radio-80)<1e-8);
  assert.ok(distancia(r.centro,[700,-400])<1e-8);
});

test('el contorno exacto suma rectas y dos cuartos de círculo',()=>{
  assert.ok(Math.abs(contornoPerfil({ancho:1000,alto:500,aguas:0,radio:100})-(1600+100*Math.PI))<1e-9);
});

test('abrir desde la cumbrera conserva las aristas de ambas mitades',()=>{
 const a=[[0,0,0],[0,1,1],[0,2,0]],b=[[3,.3,0],[3,1,2],[3,1.7,0]],r=desarrollarDesdeCentro(a,b);
 for(const t of r.triangulos)for(let i=0;i<3;i++)assert.ok(Math.abs(distancia(t.plano[i],t.plano[(i+1)%3])-distancia(t.espacio[i],t.espacio[(i+1)%3]))<1e-10);
});
