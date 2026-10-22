// Solo escritorio y servidor aislado. Evidencias del formulario, alzado y corte con/sin central.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { openApp, BASE_URL } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { puertaPlanoReal } from '../src/puertas/__fixtures__/planosReales.ts';
import { pedidoDe } from '../src/puertas/__fixtures__/ejemplos.ts';
import { escribirPlanoPuertas } from '../src/puertas/plano.ts';
import { generarCortePuertas } from '../src/puertas/corte.ts';
import { leerDxf } from './lib/leer-dxf.mjs';
import { pintarEntidades } from './contrastar-corte-puertas.mjs';

const destino='tmp/ui-audit/puertas-espaciador';
await fs.mkdir(destino,{recursive:true});
const salud=await fetch(`${BASE_URL}/api/health`).then(r=>r.json());
assert.equal(salud.simulationMode,true); assert.equal(salud.fileWritesEnabled,false);
const capturas=[];
for(const viewport of [{width:1280,height:720},{width:1600,height:1000}]) {
  const {browser,page,errors}=await openApp(viewport);
  try {
    await page.getByRole('button',{name:'Puertas',exact:true}).click();
    const llenar=async(t,v)=>{const c=page.getByLabel(t,{exact:true});await c.fill(String(v));await c.blur();};
    await page.getByLabel('Modelo de puerta',{exact:true}).selectOption('PUERTAUTO');
    const casilla=page.getByLabel('Espaciador central (líneas verticales en medio del dibujo)',{exact:true});
    assert.equal(await casilla.isChecked(),false);
    for(const [t,v] of [['Número de pedido de puertas','ESPACIADOR'],['OF de puerta','0232817'],['Frente (cm)',426],['Alto (cm)',515],['Color de puerta','BLANCO 9016'],['Rollo de lona (cm)',300],['Rollo transparente (cm)',140],['Empates desde abajo del cuerpo (cm)',299]]) await llenar(t,v);
    await page.locator('.puerta-detalles > details > summary').filter({hasText:'Materiales del transparente'}).click();
    await llenar('Rollo de saco (cm)',300);
    await page.getByLabel('He confirmado el modelo y las medidas con el dibujo',{exact:true}).check();
    await page.getByLabel('Ventanas confirmadas o puerta ciega',{exact:true}).check();
    // Cambiar los empates no debe perder ninguna opción de la autorreparable.
    await casilla.check();
    await llenar('Rayas laterales a (cm del borde, según el pedido)',15);
    await llenar('Empates desde abajo del cuerpo (cm)',299);
    assert.equal(await casilla.isChecked(),true);
    assert.equal(await page.getByLabel('Rayas laterales a (cm del borde, según el pedido)',{exact:true}).inputValue(),'15');
    await llenar('Rayas laterales a (cm del borde, según el pedido)',10);
    for(const central of [false,true]) {
      await casilla.setChecked(central);
      const alzado=page.locator('.puertas-pantalla .puerta-alzado');
      assert.equal(await alzado.locator('.puerta-espaciador-central').count(),central?1:0);
      assert.equal(await alzado.locator('.puerta-espaciador-central-marca').count(),central?1:0);
      assert.equal(await alzado.locator('text').filter({hasText:'ESPACIADOR ESPECIAL PORTANOVA'}).count(),central?3:2);
      const respuesta=page.waitForResponse(r=>r.url().endsWith('/api/puertas/corte/vista-previa')&&r.request().method()==='POST');
      await page.getByRole('button',{name:'Ver vista previa del corte',exact:true}).click();
      const datos=await(await respuesta).json();
      assert.deepEqual(datos.avisos.filter(a=>a.nivel==='error'),[]);
      const panos=datos.resultados[0].piezas.filter(p=>p.clase==='pano');
      assert.deepEqual(panos.map(p=>p.ancho),[426,426]);
      assert.deepEqual(panos.map(p=>p.marcas.filter(s=>s[0]===s[2]&&Math.abs(s[3]-s[1])>5).length),[central?3:2,central?3:2]);
      assert.equal(datos.resultados[0].piezas.filter(p=>p.clase==='entrada').length,2);
      for(const tema of ['claro','oscuro']) {
        const oscuro=await page.locator('html').getAttribute('data-theme')==='dark';
        if(oscuro!==(tema==='oscuro')) await page.getByRole('button',{name:tema==='oscuro'?'Pasar a modo oscuro':'Pasar a modo claro',exact:true}).click();
        for(const vista of ['alzado','corte']) {
          const objetivo=vista==='alzado'?page.locator('.puerta-config-alzado'):page.locator('.puertas-pantalla .corte-cabecera');
          await objetivo.evaluate(e=>e.scrollIntoView({block:'start'}));
          const archivo=`${destino}/${central?'con':'sin'}-central-${vista}-${tema}-${viewport.width}x${viewport.height}.png`;
          await page.screenshot({path:archivo}); capturas.push(archivo);
        }
      }
    }
    assert.deepEqual(errors.filter(e=>!/favicon/.test(e)),[]);
  } finally { await browser.close(); }
}
const p=puertaPlanoReal('AR2604904');
for(const central of [false,true]) {
  p.autorreparable.espaciadorCentral=central;
  const pedido=pedidoDe('AR2604904',p),prefijo=`${destino}/${central?'con':'sin'}-central`;
  await fs.writeFile(`${prefijo}-plano.dxf`,escribirPlanoPuertas({pedido,cabecera:{cliente:'PRUEBA ESPACIADORES',tecnico:'IVÁN',revisor:'',fecha:'2026-10-22'}}),'latin1');
  const corte=generarCortePuertas(pedido); assert.ok(corte.archivo);
  await fs.writeFile(`${prefijo}-corte.dxf`,corte.archivo.dxf,'latin1');
}
// Compara en PNG las líneas del corte real y las de la web; no pretende copiar el aprovechamiento.
if(process.argv[2]) {
  const estudio=path.resolve(process.argv[2]);
  const real=leerDxf(path.join(estudio,'genericas/bot/AR2604904.dxf')).entidades
    .filter(e=>['DISCO1','CUTTER','ROTULADOR','texto'].includes(e.capa)&&!(e.x<500&&e.y<600));
  const web=leerDxf(`${destino}/con-central-corte.dxf`).entidades.filter(e=>!(e.x<500&&e.y<600));
  const {browser,page}=await openApp({width:1600,height:1000});
  try {
    await page.setContent(`<meta charset="utf-8"><style>body{font:16px Arial;margin:24px}main{display:grid;grid-template-columns:1fr 1fr;gap:24px}svg{width:100%}</style><h1>AR2604904 · corte real y web</h1><p>Laterales a 10 cm de DISCO1; central a F/2 − 1,9. El cuerpo mide 426 cm.</p><main><section><h2>Real</h2>${pintarEntidades(real)}</section><section><h2>Web</h2>${pintarEntidades(web)}</section></main>`);
    await page.screenshot({path:`${destino}/comparacion-corte-real-web.png`,fullPage:true});
  } finally { await browser.close(); }
}
await fs.writeFile(`${destino}/capturas.json`,JSON.stringify(capturas,null,2));
console.log(`Espaciadores: ${capturas.length} capturas, servidor y formulario comprobados, en ${destino}`);
