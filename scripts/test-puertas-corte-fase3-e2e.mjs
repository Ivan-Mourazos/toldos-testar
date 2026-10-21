// Comprobación de escritorio contra una instancia aislada: nunca usa el .env del taller.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { muestrasCorte } from './contrastar-corte-puertas.mjs';

const destino='tmp/ui-audit/puertas-fase3';
await fs.mkdir(destino,{recursive:true});
const capturas=[];
for(const viewport of [{width:1280,height:720},{width:1600,height:1000}]) {
  const {browser,page,errors}=await openApp(viewport);
  try {
    const llenar=async(t,v)=>{const c=page.getByLabel(t,{exact:true});await c.fill(String(v));await c.blur();};
    for(const m of muestrasCorte().filter(m=>m.codigo!=='AR2605038')) {
      await page.goto(process.env.TOLDOS_ISOLATED_URL||'http://127.0.0.1:4310');
      await page.getByRole('button',{name:'Puertas',exact:true}).click();
      const p=m.input;
      for(const [t,v] of [['Número de pedido de puertas',m.codigo],['OF de puerta',p.of],['Frente (cm)',p.frente],['Alto (cm)',p.alto],['Color de puerta',p.color],['Cantidad de puertas iguales',p.cantidad],['Rollo de lona (cm)',300],['Rollo transparente (cm)',140],['T · desde arriba al eje (cm)',p.enrollable.T],['D · entre ejes (cm)',p.enrollable.D],['Margen lateral m (cm)',p.enrollable.margen]]) await llenar(t,v);
      if(p.enrollable.sacoPartido)await page.getByLabel('Saco en dos piezas con unión de 2 cm',{exact:true}).check();
      for(const [i,v] of (p.enrollable.ventanales??[]).entries()) {
        await page.getByRole('button',{name:'Añadir ventanal debajo',exact:true}).click();
        await llenar(`D · entre ejes ventanal ${i+2} (cm)`,v.D);
        await llenar(`Margen lateral ventanal ${i+2} (cm)`,v.margen);
      }
      const abrir=async(t)=>page.locator('.puerta-detalles > details > summary').filter({hasText:t}).click();
      await abrir('Materiales del transparente');await llenar('Rollo de saco (cm)',300);await abrir('Materiales del transparente');
      await abrir('Entradas de tubo');
      for(const [i,t] of p.entradas.entries()) {
        await page.getByRole('button',{name:'Añadir entrada',exact:true}).click();
        await llenar(`Eje tubo ${i+1} (cm)`,t.altura);
      }
      await abrir('Entradas de tubo');
      await page.getByLabel('He confirmado el modelo y las medidas con el dibujo',{exact:true}).check();
      await page.getByLabel('Ventanal confirmado con el dibujo',{exact:true}).check();
      const respuesta=page.waitForResponse(r=>r.url().endsWith('/api/puertas/corte/vista-previa')&&r.request().method()==='POST');
      await page.getByRole('button',{name:'Ver vista previa del corte',exact:true}).click();
      const datos=await (await respuesta).json();
      assert.deepEqual(datos.avisos.filter(a=>a.nivel==='error'),[]);
      await page.locator('.corte-material').first().waitFor();
      assert.equal(await page.locator('.puerta-avisos .es-error').count(),0);
      if(p.enrollable.ventanales?.length) {
        assert.equal(datos.resultados[0].piezas.filter(p=>/entre ventanales/.test(p.nombre)).length,2);
        assert.equal(await page.locator('svg text').filter({hasText:/^a\d+ROTULADOR/}).count()>0,true);
      }
      for(const tema of ['claro','oscuro']) {
        const actual=await page.locator('html').getAttribute('data-theme');
        if((tema==='oscuro')!==(actual==='dark'))await page.getByRole('button',{name:tema==='oscuro'?'Pasar a modo oscuro':'Pasar a modo claro',exact:true}).click();
        await page.locator('.puertas-pantalla .corte-cabecera').evaluate(e=>e.scrollIntoView({block:'start'}));
        const archivo=`${destino}/${m.codigo}-${tema}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({path:archivo});capturas.push(archivo);
        if(p.enrollable.ventanales?.length&&viewport.width===1600) {
          const grupo=page.getByRole('group',{name:`Ampliación del corte ${p.material} ${p.color}`,exact:true});
          await grupo.getByRole('button',{name:'Ampliar',exact:true}).click();
          await grupo.getByRole('button',{name:'Ampliar',exact:true}).click();
          await grupo.getByRole('button',{name:'Ampliar',exact:true}).click();
          const svg=page.locator('.corte-material').first().locator('svg');
          assert.match(await svg.getAttribute('style'),/800%/);
          await svg.locator('text').filter({hasText:/^a1ROTULADOR/}).first().scrollIntoViewIfNeeded();
          await page.screenshot({path:`${destino}/${m.codigo}-${tema}-detalle.png`});
          await grupo.getByRole('button',{name:'Ver entero',exact:true}).click();
        }
      }
    }
    assert.deepEqual(errors,[]);
    if(viewport.width===1600) {
      for(const m of muestrasCorte().filter(m=>m.codigo!=='AR2605134')) {
        await page.setContent(await fs.readFile(`${destino}/${m.codigo}-comparacion.html`,'utf8'));
        await page.screenshot({path:`${destino}/${m.codigo}-comparacion.png`,fullPage:true});
      }
    }
  } finally {await browser.close();}
}
await fs.writeFile(`${destino}/capturas.json`,JSON.stringify(capturas,null,2));
console.log(JSON.stringify({capturas:capturas.length,destino}));
