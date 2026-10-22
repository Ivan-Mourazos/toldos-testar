// Solo contra la instancia aislada; la propia ayuda comprueba /api/health antes de abrirla.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { openApp, pick } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { MODELOS_PUERTAS } from '../src/puertas/calcular.ts';

const destino='tmp/ui-audit/puertas-fase1';
await fs.mkdir(destino,{recursive:true});
const resultados=[];
for(const viewport of [{width:1280,height:720},{width:1600,height:1000}]) {
  const {browser,page,errors}=await openApp(viewport);
  try {
    await page.getByRole('button',{name:'Puertas',exact:true}).click();
    const llenar=async(nombre,valor)=>{const campo=page.getByLabel(nombre,{exact:true});await campo.fill(String(valor));await campo.blur();};
    const detalle=async(texto)=>{await page.locator('.puerta-detalles > details > summary').filter({hasText:texto}).click();};
    const cerrarDetalles=async()=>{for(const s of await page.locator('.puerta-detalles > details[open] > summary').all()) await s.click();};
    async function comun(codigo,of,frente,alto,modelo) {
      await pick(page,'Modelo de puerta',MODELOS_PUERTAS[modelo],page.locator('.puertas-pantalla'));
      for(const [k,v] of [['Número de pedido de puertas',codigo],['OF de puerta',of],['Frente (cm)',frente],['Alto (cm)',alto],['Color de puerta','AZUL 5002'],['Rollo de lona (cm)',300],['Rollo transparente (cm)',140]]) await llenar(k,v);
      await detalle('Materiales del transparente');await llenar('Rollo de saco (cm)',300);await cerrarDetalles();
      await page.getByLabel('He confirmado el modelo y las medidas con el dibujo',{exact:true}).check();
      await page.getByLabel(modelo==='PUERTAENR'?'Ventanal confirmado con el dibujo':'Ventanas confirmadas o puerta ciega',{exact:true}).check();
    }
    async function capturar(modelo,pedido) {
      await cerrarDetalles();
      await page.getByRole('button',{name:'Ver vista previa del corte',exact:true}).click();
      await page.locator('.puertas-pantalla .corte-material').first().waitFor();
      assert.equal(await page.locator('.puerta-avisos .es-error').count(),0,'La puerta debe quedar coherente.');
      for(const tema of ['claro','oscuro']) {
        const temaActual=await page.locator('html').getAttribute('data-theme');
        if((tema==='oscuro')!==(temaActual==='dark')) await page.getByRole('button',{name:tema==='oscuro'?'Pasar a modo oscuro':'Pasar a modo claro',exact:true}).click();
        const base=`${destino}/${modelo}-${tema}-${viewport.width}x${viewport.height}`;
        await page.locator('.puerta-config-alzado').evaluate(el=>el.scrollIntoView({block:'start'}));
        await page.screenshot({path:`${base}-alzado.png`});
        await page.locator('.puertas-pantalla .corte-cabecera').evaluate(el=>el.scrollIntoView({block:'start'}));
        await page.screenshot({path:`${base}-corte.png`});
        resultados.push({modelo,pedido,tema,...viewport,capturas:[`${base}-alzado.png`,`${base}-corte.png`]});
      }
    }
    // Caso prioritario de Iván: todavía sin DWG ni corte manual, se configura desde el PDF.
    await comun('AR2605134','0233175',212,360,'PUERTAENR');
    await llenar('Cantidad de puertas iguales',3);
    for(const [k,v] of [['T · desde arriba al eje (cm)',169],['D · entre ejes (cm)',60],['Margen lateral m (cm)',6]]) await llenar(k,v);
    await detalle('Entradas de tubo');
    for(const [i,altura] of [60,131,191].entries()) {await page.getByRole('button',{name:'Añadir entrada',exact:true}).click();await llenar(`Eje tubo ${i+1} (cm)`,altura);}
    await cerrarDetalles();await detalle('Texto del pedido');
    await llenar('Texto del pedido','Serigrafía de logo de CAIRENA en color blanco centrado en el paño inferior (20 × 6 cm).');
    await capturar('principal-AR2605134','AR2605134');
    await page.getByRole('button',{name:'Añadir puerta',exact:true}).click();
    await page.getByRole('group',{name:'Puertas del pedido',exact:true}).getByRole('button').first().click();
    await page.getByRole('button',{name:'Quitar puerta',exact:true}).click();
    // AR2604638: cotas 60, 71, 60, 123 desde abajo; ventanal T=123, D=60.
    await comun('AR2604638','0232309',172,314,'PUERTAENR');
    await llenar('Color de puerta','BLANCO 9016');
    for(const [k,v] of [['T · desde arriba al eje (cm)',123],['D · entre ejes (cm)',60],['Margen lateral m (cm)',6]]) await llenar(k,v);
    await detalle('Entradas de tubo');
    for(const [i,altura] of [60,131,191].entries()) {await page.getByRole('button',{name:'Añadir entrada',exact:true}).click();await llenar(`Eje tubo ${i+1} (cm)`,altura);}
    await cerrarDetalles();await detalle('Texto del pedido');
    await llenar('Texto del pedido','Serigrafía de logo de XPUERTAS en color negro (21 × 6 cm en paño inferior).');
    await capturar('enrollable','AR2604638');
    await page.getByLabel('Bolsillo · solo marcas, si lo pide el dibujo',{exact:true}).check();
    await llenar('Altura superior del bolsillo desde el bajo terminado (cm)',66.25);
    await capturar('bolsillo-opcional','AR2604638 · variante con bolsillo solicitado');
    await page.getByLabel('Bolsillo · solo marcas, si lo pide el dibujo',{exact:true}).uncheck();
    // AR2604725: RPS lo llama apilable; mandan el PDF y el plano de enrollable, con entrada extra.
    await page.getByRole('button',{name:'Añadir puerta',exact:true}).click();
    await page.getByRole('group',{name:'Puertas del pedido',exact:true}).getByRole('button').first().click();
    await page.getByRole('button',{name:'Quitar puerta',exact:true}).click();
    await comun('AR2604725','0232504',474,430,'PUERTAENR');
    await llenar('Color de puerta','GRIS 7038');
    for(const [k,v] of [['T · desde arriba al eje (cm)',239],['D · entre ejes (cm)',60],['Margen lateral m (cm)',11]]) await llenar(k,v);
    await page.getByLabel('Saco en dos piezas con unión de 2 cm',{exact:true}).check();
    await detalle('Entradas de tubo');
    for(const [i,altura] of [60,131,191,241].entries()) {await page.getByRole('button',{name:'Añadir entrada',exact:true}).click();await llenar(`Eje tubo ${i+1} (cm)`,altura);}
    await cerrarDetalles();await detalle('Texto del pedido');
    await pick(page,'Artículo indicado en RPS','PUERTAPLE · Apilable',page.locator('.puertas-pantalla'));
    await llenar('Texto del pedido','Puerta enrollable, con varilla superior.');
    await capturar('referencia-AR2604725','AR2604725');
    assert.match(await page.getByRole('region',{name:'Comprobaciones de puerta'}).innerText(),/RPS indica PUERTAPLE/);
    // AR2604724: tres ventanas, tubo pequeño, cadena de diez tubos y empate en el sexto.
    await page.getByRole('button',{name:'Añadir puerta',exact:true}).click();
    await page.getByRole('group',{name:'Puertas del pedido',exact:true}).getByRole('button').first().click();
    await page.getByRole('button',{name:'Quitar puerta',exact:true}).click();
    await comun('AR2604724','0232505',500,575,'PUERTAPLE');
    await llenar('Pie hasta primer eje (cm)',37);await llenar('Cabecera hasta último eje (cm)',70);
    await llenar('Pasos entre tubos (cm)',Array(9).fill('52').join('; '));
    await pick(page,'Saco útil','80 mm · corte 30 cm',page.locator('.puertas-pantalla'));
    await detalle('Ventanas individuales');
    for(const [k,v] of [['Fila · margen izquierdo',53],['Fila · desde abajo',151],['Fila · ancho',106],['Fila · alto',32],['Fila · columnas',3],['Fila · pilar',38]]) await llenar(k,v);
    await page.getByRole('button',{name:'Añadir fila',exact:true}).click();await cerrarDetalles();
    await detalle('Entradas de tubo');
    await llenar('Cintas · posiciones X (cm)','29; 172; 316; 459');
    await page.getByRole('button',{name:'Proponer tubos impares desde abajo',exact:true}).click();
    await page.getByRole('button',{name:'Aplicar huecos de la propuesta',exact:true}).click();
    await capturar('apilable','AR2604724');
    // El corte previo cambia al editar: no debe presentarse como vigente.
    await llenar('Color de puerta','AZUL 5005');
    assert.match(await page.getByRole('region',{name:'Vista previa del corte de puertas',exact:true}).innerText(),/Han cambiado los datos/);
    await llenar('Color de puerta','AZUL 5002');
    // AR2604764: huecos de 35 × 40, cristal 39 × 44; origen de corte a 12 del bajo terminado.
    await page.getByRole('button',{name:'Añadir puerta',exact:true}).click();
    await page.getByRole('group',{name:'Puertas del pedido',exact:true}).getByRole('button').first().click();
    await page.getByRole('button',{name:'Quitar puerta',exact:true}).click();
    await comun('AR2604764','0232528',110,263,'PUERTAUTO');
    await detalle('Ventanas individuales');
    for(const [k,v] of [['Fila · margen izquierdo',15],['Fila · desde abajo',140],['Fila · ancho',35],['Fila · alto',40],['Fila · columnas',2],['Fila · pilar',10]]) await llenar(k,v);
    await page.getByRole('button',{name:'Añadir fila',exact:true}).click();
    await capturar('autorreparable','AR2604764');
    // Cambiar de producto y volver conserva el configurador en memoria.
    await page.getByRole('button',{name:'Toldos',exact:true}).click();
    await page.getByRole('button',{name:'Puertas',exact:true}).click();
    assert.equal(await page.getByLabel('OF de puerta',{exact:true}).inputValue(),'0232528');
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
}
await fs.writeFile(`${destino}/verificacion.json`,JSON.stringify({resultados,errores:[]},null,2));
console.log(`${resultados.length} combinaciones verificadas; ${resultados.length*2} capturas en ${destino}.`);
