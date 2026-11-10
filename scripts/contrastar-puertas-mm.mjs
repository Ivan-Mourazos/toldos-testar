// Solo instancia aislada: fixtures locales, sin consultar RPS ni guardar pedidos reales.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolve } from 'node:path';
import { openApp, pick } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { enrollable5470 } from '../src/puertas/__fixtures__/enrollable5470.ts';
import { puertaPlanoReal } from '../src/puertas/__fixtures__/planosReales.ts';
import { araujo5365 } from '../src/puertas/__fixtures__/araujo.ts';
import { pedidosSantaPau } from '../src/puertas/__fixtures__/santapau.ts';
import { nuevaPuerta } from '../src/puertas/calcular.ts';
import { REGLAS_SYSTEM_DOCK } from '../src/puertas/systemDock.ts';
const destino='tmp/ui-audit/puertas-mm';
await fs.mkdir(destino,{recursive:true});
const casos=[['enrollable',enrollable5470()],['apilable',puertaPlanoReal('AR2605036')],['araujo',araujo5365()],['santapau',pedidosSantaPau()[1].elementos[0].input],['systemdock',{...nuevaPuerta('SYSTEMDOCK'),material:REGLAS_SYSTEM_DOCK.material,color:REGLAS_SYSTEM_DOCK.color,rollo:REGLAS_SYSTEM_DOCK.rollo,frente:1040,alto:55,cantidad:3,of:'0233000',confirmada:true,ventanasConfirmadas:true}]].filter(([nombre])=>!process.env.PUERTAS_MM_CASOS||process.env.PUERTAS_MM_CASOS.split(',').includes(nombre));
for(const viewport of [{width:1280,height:720},{width:1600,height:1000}]) {
  for(const [nombre,p] of casos) {
    const {browser,page,errors}=await openApp(viewport,{launchArgs:[`--log-file=${resolve(destino,'chromium.log')}`]});
    try {
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.route('**/api/puertas/rps-pedido?*',r=>r.fulfill({json:{pedido:{cliente:{codigo:p.clientePuertas==='santapau'?'038661':'000001',nombre},fecha:'2026-11-10',puertas:[p],avisos:[]}}}));
      if(nombre==='systemdock') {
        await page.getByRole('button',{name:'Estándar',exact:true}).click();
        await page.getByRole('button',{name:/System Dock$/}).click();
      }
      else {
        await page.getByRole('button',{name:'Puertas',exact:true}).click();
        await page.getByRole('button',{name:'Portanova',exact:true}).click();
        await page.getByRole('button',{name:/Enrollable$/}).click();
      }
      await page.getByLabel(`Número de pedido de ${nombre==='systemdock'?'System Dock':'Puertas'}`,{exact:true}).fill('AR2605470');
      await page.getByRole('button',{name:'Traer de RPS',exact:true}).click();
      await page.locator('.puerta-config header').filter({hasText:'medidas en mm'}).waitFor();
      if(nombre==='enrollable') {
        await page.getByRole('tab',{name:'Ventanas',exact:true}).click();
        assert.equal(await page.getByLabel('Desde abajo ventana 1 (mm)',{exact:true}).inputValue(),'810');
        // Sustituir la fixture antigua por las dos filas centradas mediante el bloque compartido.
        for(let i=0;i<6;i++) await page.getByRole('button',{name:'Quitar',exact:true}).first().click();
        for(const tramo of [1,2]) {
          await pick(page,'Tramo de la ventana',new RegExp(`Entre tubo ${tramo} y ${tramo+1}`),page);
          for(const [campo,valor] of [['Desde la izquierda, la primera (mm)','320'],['Ancho de la ventana (mm)','1220'],['Alto de la ventana (mm)','400'],['Cuántas iguales seguidas','3'],['Separación entre ellas (mm)','210']]) {
            const c=page.getByLabel(campo,{exact:true});await c.fill(valor);await c.blur();
          }
          await page.getByRole('button',{name:'Añadir',exact:true}).click();
        }
        assert.equal(await page.locator('.puerta-alzado .puerta-cristal[y="414.5"]').count(),3);
        assert.equal(await page.locator('.puerta-alzado .puerta-cristal[y="349"]').count(),3);
        assert.equal(await page.getByLabel('Radio del hueco, todas (mm)',{exact:true}).inputValue(),'20');
      } else if(nombre==='apilable') await page.getByRole('tab',{name:'Ventanas',exact:true}).click();
      else if(nombre==='araujo') await page.getByRole('tab',{name:'Tramos y bolsas',exact:true}).click();
      else if(nombre==='santapau') await page.getByRole('tab',{name:'Mirilla y tubos',exact:true}).click();
      else {
        assert.equal(await page.getByLabel('Largo de la lona (mm)',{exact:true}).inputValue(),'10400');
        assert.match(await page.locator('.puerta-alzado').innerText(),/10400 mm/);
      }
      // Una edición en mm llega al cálculo con los cm originales, también con un decimal.
      if(nombre==='enrollable') {
        const radio=page.getByLabel('Radio del hueco, todas (mm)',{exact:true});
        const solicitud=page.waitForRequest(r=>r.url().endsWith('/api/puertas/corte/vista-previa')&&r.method()==='POST'&&r.postDataJSON().elementos[0].input.ventanas[0].radio===0.55);
        await radio.fill('5,5');await radio.blur();
        const cuerpo=(await solicitud).postDataJSON();assert.equal(cuerpo.elementos[0].input.frente,472);
        assert.equal(cuerpo.elementos[0].input.ventanas[0].tramo,1);
        assert.equal(cuerpo.elementos[0].input.ventanas[0].y,75.5);
        await radio.fill('20');await radio.blur();
      }
      assert.equal(await page.locator('.puerta-avisos .es-error').count(),0);
      for(const boton of await page.getByRole('button',{name:'Cerrar notificación',exact:true}).all()) await boton.click();
      for(const tema of ['claro','oscuro']) {
        if((tema==='oscuro')!==((await page.locator('html').getAttribute('data-theme'))==='dark')) await page.getByRole('button',{name:tema==='oscuro'?'Pasar a modo oscuro':'Pasar a modo claro',exact:true}).click();
        await page.evaluate(()=>scrollTo(0,0));
        await page.screenshot({path:`${destino}/${nombre}-${tema}-${viewport.width}x${viewport.height}.png`,fullPage:true});
        await page.locator('.puerta-alzado').screenshot({path:`${destino}/${nombre}-${tema}-${viewport.width}x${viewport.height}-alzado.png`});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${nombre}: sin desbordamiento horizontal`);
        const unidades=await page.locator('.puerta-config input[aria-label]').evaluateAll(xs=>xs.map(x=>x.getAttribute('aria-label')).filter(x=>/\bcm\b/.test(x)));
        assert.deepEqual(unidades,[]);
      }
      assert.deepEqual(errors,[]);
      console.log(`${nombre} ${viewport.width}x${viewport.height}: correcto`);
    } finally {await browser.close();}
  }
}
