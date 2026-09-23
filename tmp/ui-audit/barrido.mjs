// Barrido reproducible de la fase 1. Solo usa la instancia aislada de 4310.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { fullAwningModelNames, sampleAwnings } from '../../scripts/lib/model-samples.mjs';
import { fabricOnlyModelNames } from '../../src/domain/modelBehavior.js';
import AxeBuilder from '@axe-core/playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const shots = path.join(root, 'tmp/ui-audit/shots');
const out = path.join(root, 'tmp/ui-audit/barrido-data.json');
const models = [...fullAwningModelNames, ...fabricOnlyModelNames];
const repair = process.argv.includes('--completar');
const axeOnly = process.argv.includes('--axe');
const approvalOnly = process.argv.includes('--aprobacion');
const generationOnly = process.argv.includes('--generar');
const data = repair||axeOnly||approvalOnly||generationOnly ? JSON.parse(await fs.readFile(out,'utf8')) : { date: new Date().toISOString(), models, states: [], issues: [], flows: [], notes: [] };
if(axeOnly){data.issues=data.issues.filter(x=>!x.kind.startsWith('axe-'));data.states=data.states.filter(x=>!x.screen.startsWith('axe-'));}
await fs.mkdir(shots, { recursive: true });
async function openApp(viewport){
  const health=await fetch('http://127.0.0.1:4310/api/health').then(r=>r.json());
  if(!health.simulationMode||health.fileWritesEnabled)throw new Error('La instancia 4310 no está aislada');
  const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport});const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:4310');await page.getByRole('button',{name:'Pedido',exact:true}).waitFor();return {browser,page,errors};
}

function slug(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function source(screen, type, label) {
  if (screen.startsWith('parametros')) return 'src/client/views/ParametersView.tsx';
  if (screen.startsWith('revision') || screen.startsWith('historial')) return 'src/client/views/ReviewsView.tsx';
  if (screen.startsWith('configuracion')) return 'src/client/views/ConfigurationView.tsx';
  if (screen.startsWith('pdf')) return 'src/client/components/PdfPreviewPages.tsx';
  if (screen.startsWith('modelo') || screen.startsWith('tarjeta')) return /Variante|Salida|Frente|Lacado|Dispositivo|Bamba|Color/.test(label) ? 'src/client/components/AwningColumn.tsx + controlLabels.ts / modelBehavior.js' : 'src/client/components/AwningColumn.tsx';
  if (/Estructuras|Telas|Reserva RPS|Editar/.test(label)) return 'src/client/components/LiveResults.tsx';
  return 'src/client/views/OrderView.tsx / src/client/App.tsx';
}
async function inspect(page, screen, viewport, shot) {
  const raw = await page.evaluate(() => {
    const visible = e => { const r=e.getBoundingClientRect(), s=getComputedStyle(e); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
    const name = e => {
      const id=e.getAttribute('aria-labelledby');
      return (e.getAttribute('aria-label') || (id && document.getElementById(id)?.textContent) || e.labels?.[0]?.textContent || e.closest('label')?.textContent || e.textContent || e.getAttribute('title') || '').trim().replace(/\s+/g,' ').slice(0,100);
    };
    const target = e => `${e.tagName.toLowerCase()}${e.className && typeof e.className==='string' ? '.'+e.className.trim().split(/\s+/).slice(0,2).join('.') : ''}`;
    const textEls=[...document.querySelectorAll('label,th,td,[role="option"],.field-label,.select-field-label')].filter(visible);
    const clipped=textEls.filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>({where:target(e),text:e.textContent.trim().slice(0,100),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}));
    const multiline=textEls.filter(e=>{ const st=getComputedStyle(e); return (e.getBoundingClientRect().height > parseFloat(st.lineHeight||0)*1.45) && e.textContent.trim(); }).map(e=>({where:target(e),text:e.textContent.trim().slice(0,100)}));
    const controls=[...document.querySelectorAll('button,input,select,textarea,[role="button"],[role="combobox"],[role="tab"],[role="option"],[role="checkbox"]')].filter(visible).map(e=>({type:e.getAttribute('role')||e.tagName.toLowerCase(),label:name(e),text:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,100),placeholder:e.getAttribute('placeholder')||'',disabled:e.disabled||e.getAttribute('aria-disabled')==='true'}));
    const overlaps=[];
    for (const parent of document.querySelectorAll('.field-row,.awning-grid,.results-tabs,.top-nav,.parameter-grid')) {
      if (!visible(parent)) continue;
      const children=[...parent.children].filter(visible);
      for(let i=0;i<children.length;i++) for(let j=i+1;j<children.length;j++) {
        const a=children[i].getBoundingClientRect(),b=children[j].getBoundingClientRect();
        const x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
        if(x>3&&y>3) overlaps.push({parent:target(parent),first:target(children[i]),second:target(children[j]),pixels:[Math.round(x),Math.round(y)]});
      }
    }
    return {clipped,multiline,controls,overlaps,horizontalScroll:document.documentElement.scrollWidth>innerWidth+2 ? {scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}:null,body:(document.body.innerText||'').slice(0,1000)};
  });
  const state={screen,viewport:`${viewport.width}×${viewport.height}`,shot:path.relative(root,shot).replaceAll('\\','/'),...raw};
  state.controls=raw.controls.map(c=>({...c,source:source(screen,c.type,c.label)}));
  const previous=data.states.findIndex(s=>s.screen===screen&&s.viewport===state.viewport);
  if(previous<0)data.states.push(state);else data.states[previous]=state;
  for(const [kind,items] of Object.entries({clipped:raw.clipped,multiline:raw.multiline,overlap:raw.overlaps,unnamed:raw.controls.filter(c=>!c.label)})) for(const item of items) data.issues.push({kind,screen,viewport:state.viewport,shot:state.shot,detail:item});
  if(raw.horizontalScroll) data.issues.push({kind:'horizontal-scroll',screen,viewport:state.viewport,shot:state.shot,detail:raw.horizontalScroll});
  return state;
}
async function capture(page, screen, viewport) {
  await page.waitForTimeout(550);
  const shot=path.join(shots,`ui-${viewport.width}x${viewport.height}-${slug(screen)}.png`);
  await page.screenshot({path:shot,fullPage:true,animations:'disabled'});
  await inspect(page,screen,viewport,shot);
  console.log('CAPTURE',viewport.width,screen);
}
async function attempt(label, fn) { try{return await fn();}catch(e){data.notes.push(`${label}: ${String(e.message||e).slice(0,300)}`);console.log('SKIP',label,String(e.message||e).slice(0,120));return null;} }
async function clickIf(page,name) { const l=page.getByRole('button',{name,exact:true});if(await l.count()) {await l.first().click();return true;}return false; }
async function fillIf(scope,label,value) { if(value===undefined||value===null||value==='')return;const l=scope.getByLabel(label,{exact:true});if(await l.count() && await l.first().evaluate(e=>e.matches('input,textarea'))) await l.first().fill(String(value)); }
async function selectIf(page,scope,label,value) { if(value===undefined||value===null||value==='')return;const c=scope.getByRole('combobox',{name:label,exact:true});if(!await c.count())return;await c.first().click();const options=page.getByRole('option');const exact=options.filter({hasText:new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});if(await exact.count())await exact.first().click();else if(await options.count())await options.first().click();else await page.keyboard.press('Escape'); }
async function segmentIf(scope,label,value) { if(value===undefined||value===null||value==='')return;const g=scope.getByRole('group',{name:label,exact:true});if(!await g.count())return;const normalized=String(value).replace('TUBO DE CARGA ','').replace('M.F.DER','M.F. derecha');const b=g.getByRole('button',{name:new RegExp(`^${normalized}$`,'i')});if(await b.count())await b.first().click();else if(await g.getByRole('button').count())await g.getByRole('button').first().click(); }
async function fabric(page) {const f=page.getByRole('combobox',{name:'Referencia',exact:true});if(!await f.count())return;await f.fill('ACRILI2170');await page.getByRole('option').first().waitFor({timeout:5000});await page.getByRole('option').first().click();}
async function addModel(page,model){
  await page.getByRole('button',{name:fullAwningModelNames.includes(model)?/Añadir toldo/:/Añadir trabajo de tela/}).click();
  const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const options=page.locator('.model-picker-option');const labels=await options.locator('strong').allTextContents();
  const overrides={MAXISCREEM:'Diana vertical','CAMBIO CORTINA':'Cambio de cortina','CAMBIO TELA':'Cambio de tela','CAMBIO ANTICA':'Cambio antica'};
  const target=normalize(overrides[model]||model);const i=labels.findIndex(s=>normalize(s)===target);
  if(i<0)throw new Error(`Modelo ${model} ausente: ${labels.join(', ')}`);
  await options.nth(i).click();
}
async function populate(page,model){
  const sample=sampleAwnings(model)[0]?.awning||{};const card=page.locator('.awning-column').last();
  await fillIf(page,'Pedido','AR2603332');await fillIf(card,'OF','0230194');
  await fillIf(card,'Frente',sample.width||110);await fillIf(card,'Frente tela terminada',sample.width||110);
  await fillIf(card,'Caída',sample.projection||250);await fillIf(card,'Salida',sample.projection||250);await fillIf(card,'Salida brazo',sample.projection||250);await fillIf(card,'Salida base',sample.projection||250);
  await selectIf(page,card,'Salida',sample.projection||250);
  await selectIf(page,card,'Variante',sample.submodel||sample.anticaVariant||'');
  await selectIf(page,card,'Lacado',sample.structureColor||'BLANCO');
  await selectIf(page,card,'Dispositivo',sample.device||'');
  await selectIf(page,card,'Colocación',sample.placement||'FRONTAL');
  await selectIf(page,card,'Posición motor',sample.machineSide);
  await selectIf(page,card,'Lado máquina',sample.machineSide);
  await selectIf(page,card,'Altura manivela',sample.crankHeight);
  await selectIf(page,card,'Tipo de soporte',sample.electraSupport);
  await selectIf(page,card,'Tipo de guía',sample.irisGuideType);
  await selectIf(page,card,'Fijación de la guía',sample.irisGuideFixing);
  await selectIf(page,card,'Color cadena',sample.heraChainColor);
  await selectIf(page,card,'Color mecanismos',sample.heraChainColor);
  await selectIf(page,card,'Abajo',sample.heraBottomFinish);
  await fillIf(card,'Altura instalación',sample.height);
  await fillIf(card,'Altura soporte-brazo (cm)',sample.anticaSupportHeight);
  await fillIf(card,'Bamba (cm)',sample.valanceHeight);
  await fillIf(card,'Alto terminado (cm)',sample.valanceHeight||100);
  await fillIf(card,'Frente superior',sample.irisFrontTop);
  await fillIf(card,'Salida izquierda',sample.irisExitLeft);
  for(const [label,key] of [['Salida ventana','curtainWindowExit'],['Esquina','curtainWindowCorner'],['Suelo-ventana','curtainWindowFloorHeight'],['Altura ventana','curtainWindowHeight']])await fillIf(card,label,sample[key]);
  await segmentIf(card,'Nº de brazos',sample.armCount);
  await segmentIf(card,'Tubo de carga',sample.tubeLoad);
  await segmentIf(card,'Empate indicado por cliente',sample.heraJoin);
  await segmentIf(card,'Cara hacia el interior (ventana)',sample.heraInteriorFace);
  await segmentIf(card,model==='IRIS'?'Ventana de cristal':'Ventana',sample.curtainHasWindow===true?'CON VENTANA':'SIN VENTANA');
  await segmentIf(card,'Confección',sample.curtainFinish||'NORMAL');
  await segmentIf(card,'Rotulación tela',sample.rotFabric||'NO');
  await segmentIf(card,'Rotulación bamba',sample.rotValance||'NO');
  await selectIf(page,card,'Curva bamba',sample.valanceCurve||'RECTA');
  await selectIf(page,card,'Configuración Antica',sample.anticaVariant||'primera');
  await attempt('tela '+model,()=>fabric(page));
  await page.waitForTimeout(800);
  return (await card.innerText()).match(/(FALTA[^\n]*|VÁLIDO|REVISAR|SIN CALCULAR)/)?.[0]||'';
}
async function flow(page,name,viewport,fn){
  const before=await page.evaluate(()=>window.__auditClicks||0),started=Date.now();
  try{await fn();}catch(e){data.notes.push(`Flujo ${name}: ${e.message}`);}
  const clicks=(await page.evaluate(()=>window.__auditClicks||0))-before;
  data.flows.push({name,viewport,clicks,seconds:+((Date.now()-started)/1000).toFixed(2)});
}
async function trackClicks(page){await page.evaluate(()=>{window.__auditClicks=0;document.addEventListener('click',()=>window.__auditClicks++,true);});}
async function axe(page,screen,viewport){
  try{
    const results=await new AxeBuilder({page}).withTags(['wcag2aa','wcag21aa']).analyze();
    const shot=data.states.findLast(s=>s.screen===screen&&s.viewport===`${viewport.width}×${viewport.height}`)?.shot||'';
    for(const violation of results.violations.filter(v=>v.id==='color-contrast'||v.id==='label'||v.id==='button-name'||v.id==='aria-command-name'))
      for(const node of violation.nodes)data.issues.push({kind:`axe-${violation.id}`,screen,viewport:`${viewport.width}×${viewport.height}`,shot,detail:{impact:violation.impact,target:node.target,summary:node.failureSummary}});
  }catch(e){data.notes.push(`axe ${screen} ${viewport.width}: ${e.message}`);}
}

for(const viewport of [{width:1280,height:720},{width:1600,height:1000}]){
  const {browser,page,errors}=await openApp(viewport);const vp=`${viewport.width}×${viewport.height}`;
  try{
    if(generationOnly){
      await addModel(page,'ARZUA PRO');await populate(page,'ARZUA PRO');
      const editor=page.getByRole('button',{name:'Editar despiece',exact:true});
      if(await editor.count()){await editor.click();await capture(page,'editor-estructura-abierto',viewport);}
      await page.getByRole('button',{name:'Revisión',exact:true}).click();
      await page.getByRole('button',{name:/Aprobados/}).first().click();
      const code=viewport.width===1280?'AR2603334':'AR2603335';
      const item=page.getByText(code,{exact:true}).first();if(await item.count())await item.click();
      await capture(page,'revision-aprobados-detalle',viewport);
      const gen=page.getByRole('button',{name:'Generar archivos',exact:true});
      await trackClicks(page);
      await flow(page,'Confirmar generación en simulación',vp,async()=>{
        await gen.first().click();await capture(page,'revision-generar-confirmacion',viewport);
        await gen.last().click();await page.waitForTimeout(650);await capture(page,'revision-generar-respuesta',viewport);
      });
      await fs.writeFile(out,JSON.stringify(data,null,2));continue;
    }
    if(axeOnly){
      await capture(page,'axe-pedido',viewport);await axe(page,'axe-pedido',viewport);
      await addModel(page,'ARZUA PRO');await populate(page,'ARZUA PRO');await capture(page,'axe-tarjeta',viewport);await axe(page,'axe-tarjeta',viewport);
      await capture(page,'axe-resultados',viewport);await axe(page,'axe-resultados',viewport);
      await page.getByRole('button',{name:'Revisión',exact:true}).click();await capture(page,'axe-revision',viewport);await axe(page,'axe-revision',viewport);
      await page.getByRole('button',{name:'Parámetros',exact:true}).click();await capture(page,'axe-parametros',viewport);await axe(page,'axe-parametros',viewport);
      await page.getByRole('button',{name:'Configuración',exact:true}).click();await capture(page,'axe-configuracion',viewport);await axe(page,'axe-configuracion',viewport);
      await fs.writeFile(out,JSON.stringify(data,null,2));continue;
    }
    if(approvalOnly){
      await addModel(page,'ARZUA PRO');await populate(page,'ARZUA PRO');
      await fillIf(page,'Pedido',viewport.width===1280?'AR2603334':'AR2603335');
      for(const label of ['Técnico','Revisión']){
        const combo=page.getByRole('combobox',{name:label,exact:true});
        if(await combo.count()){await combo.click();await page.getByRole('option').first().click();}
      }
      await capture(page,'pedido-listo-aprobacion',viewport);
      await trackClicks(page);
      await flow(page,'Guardar para revisión (completo)',vp,async()=>{await clickIf(page,'Guardar para revisión');await page.waitForTimeout(600);});
      await capture(page,'revision-guardado-completo',viewport);
      await page.getByRole('button',{name:'Revisión',exact:true}).click();await capture(page,'revision-pendiente-completo',viewport);
      await trackClicks(page);
      await flow(page,'Aprobar y generar (completo)',vp,async()=>{
        await page.getByRole('button',{name:'Aprobar',exact:true}).click();await capture(page,'revision-aprobar-confirmacion',viewport);
        await page.getByRole('button',{name:'Aprobar pedido',exact:true}).click();await page.waitForTimeout(600);
        await capture(page,'revision-aprobado-completo',viewport);
        const gen=page.getByRole('button',{name:'Generar archivos',exact:true});
        if(await gen.count() && await gen.isEnabled()){
          await gen.click();await capture(page,'revision-generar-confirmacion',viewport);
          const conf=page.getByRole('dialog').getByRole('button',{name:'Generar archivos',exact:true});if(await conf.count())await conf.click();await capture(page,'revision-generar-resultado',viewport);
        }else{data.notes.push(`${vp}: Generar archivos no está habilitado en la instancia de simulación`);await capture(page,'revision-generar-no-disponible',viewport);}
      });
      await fs.writeFile(out,JSON.stringify(data,null,2));continue;
    }
    if(repair){
      for(const model of ['IRIS','CAMBIO CORTINA','CAMBIO ANTICA','BAMBALINA']){
        await page.reload();await addModel(page,model);
        const status=await populate(page,model);
        await capture(page,`tarjeta-${model}-valida`,viewport);
        await axe(page,`tarjeta-${model}-valida`,viewport);
        data.notes.push(`${vp} ${model} (completado): ${status}`);
      }
      await page.reload();await addModel(page,'ARZUA PRO');await populate(page,'ARZUA PRO');
      await capture(page,'tarjeta-candado',viewport);
      await page.getByRole('button',{name:'Modificar reglas del modelo'}).click();await capture(page,'tarjeta-reglas-desbloqueadas',viewport);
      await page.getByRole('button',{name:'Reglas modificadas: volver a reglas estándar'}).click();
      await capture(page,'despiece-editor-estructura',viewport);await axe(page,'despiece-editor-estructura',viewport);
      await page.getByRole('button',{name:'Revisión',exact:true}).click();await capture(page,'revision-detalle-completado',viewport);
      await axe(page,'revision-detalle-completado',viewport);
      await attempt('aprobar '+vp,async()=>{
        await trackClicks(page);
        await flow(page,'Aprobar y generar',vp,async()=>{
          await page.getByRole('button',{name:'Aprobar',exact:true}).click();await capture(page,'revision-aprobar-dialogo',viewport);
          await page.getByRole('button',{name:'Aprobar pedido',exact:true}).click();await capture(page,'revision-aprobado',viewport);
          const generate=page.getByRole('button',{name:'Generar archivos',exact:true});
          if(await generate.count()){await generate.click();await capture(page,'revision-generar-dialogo',viewport);const confirm=page.getByRole('dialog').getByRole('button',{name:'Generar archivos',exact:true});if(await confirm.count())await confirm.click();await capture(page,'revision-generar-resultado',viewport);}
        });
      });
      await page.getByRole('button',{name:'Parámetros',exact:true}).click();await capture(page,'parametros-base-completado',viewport);await axe(page,'parametros-base-completado',viewport);
      if(viewport.width===1600){
        await page.locator('.parameter-model-trigger').click();await capture(page,'parametros-selector',viewport);
        const options=await page.getByRole('listbox',{name:'Modelos configurables'}).getByRole('option').count();
        for(let i=0;i<options;i++){
          if(i>0)await page.locator('.parameter-model-trigger').click();
          const name=(await page.getByRole('listbox',{name:'Modelos configurables'}).getByRole('option').nth(i).locator('strong').innerText()).trim();
          await page.getByRole('listbox',{name:'Modelos configurables'}).getByRole('option').nth(i).click();
          await capture(page,`parametros-${name}`,viewport);
        }
        await page.locator('.parameters-history summary').click();await capture(page,'parametros-historial',viewport);
      }
      await page.getByRole('button',{name:'Configuración',exact:true}).click();await capture(page,'configuracion',viewport);await axe(page,'configuracion',viewport);
      if(viewport.width===1280)await attempt('conflicto parametros',async()=>{
        await page.getByRole('button',{name:'Parámetros',exact:true}).click();
        const other=await openApp(viewport);
        try{
          await other.page.getByRole('button',{name:'Parámetros',exact:true}).click();
          const field='Frente máximo normal (cm)';
          const a=page.getByLabel(field,{exact:true}),b=other.page.getByLabel(field,{exact:true});
          const initial=Number(await a.inputValue());
          await a.fill(String(initial+1));await b.fill(String(initial+2));
          async function saveParameter(p,reason){
            await p.getByRole('button',{name:'Guardar para todos',exact:true}).first().click();
            await p.getByRole('combobox',{name:'Quién hace el cambio'}).click();await p.getByRole('option').first().click();
            await p.getByLabel('Motivo',{exact:true}).fill(reason);
            await p.getByRole('dialog').getByRole('button',{name:'Guardar para todos'}).click();await p.waitForTimeout(400);
          }
          await saveParameter(other.page,'Barrido UI concurrente en instancia aislada');
          await saveParameter(page,'Barrido UI: comprobar conflicto en instancia aislada');
          await capture(page,'parametros-conflicto',viewport);
        }finally{await other.browser.close();}
      });
      data.issues.push(...errors.map(detail=>({kind:'console-error',screen:'sesion-completado',viewport:vp,shot:'',detail})));
      await fs.writeFile(out,JSON.stringify(data,null,2));
      continue;
    }
    await capture(page,'pedido-vacio',viewport);
    await page.getByRole('button',{name:/Añadir toldo/}).click();await capture(page,'selector-modelo',viewport);await page.keyboard.press('Escape');
    for(const model of models){
      await page.reload();await page.getByRole('button',{name:'Pedido',exact:true}).waitFor();
      await attempt('añadir '+model,async()=>{await addModel(page,model);await capture(page,`tarjeta-${model}-vacia`,viewport);const status=await populate(page,model);await capture(page,`tarjeta-${model}-rellena`,viewport);data.notes.push(`${vp} ${model}: ${status}`);});
      await fs.writeFile(out,JSON.stringify(data,null,2));
    }
    await page.reload();await addModel(page,'ARZUA PRO');await capture(page,'tarjeta-falta',viewport);
    await attempt('dos toldos '+vp,async()=>{
      await trackClicks(page);
      await flow(page,'Pedido nuevo con dos toldos',vp,async()=>{await populate(page,'ARZUA PRO');await addModel(page,'HERA');await populate(page,'HERA');});
      await capture(page,'pedido-dos-toldos',viewport);
      await capture(page,'resultados-estructuras',viewport);
      await clickIf(page,/Telas/);await capture(page,'resultados-telas',viewport);
      await clickIf(page,/Reserva RPS/);await capture(page,'reserva-rps',viewport);
      await attempt('preview',async()=>{
        await flow(page,'Vista previa',vp,async()=>{await clickIf(page,'Vista previa');await page.locator('.pdf-preview-page').first().waitFor({timeout:15000});});
        await capture(page,'pdf-preview',viewport);
        const pages=await page.locator('.pdf-preview-page').count();
        for(let i=0;i<pages;i++){await page.locator('.pdf-preview-page').nth(i).scrollIntoViewIfNeeded();await capture(page,`pdf-pagina-${i+1}`,viewport);}
        await page.evaluate(()=>{document.body.style.zoom='125%'});await capture(page,'pdf-zoom-125',viewport);
        await page.evaluate(()=>{document.body.style.zoom=''});
        await page.getByRole('button',{name:'Cerrar vista previa'}).click();
      });
      await attempt('save review',async()=>{
        await flow(page,'Guardar para revisión',vp,async()=>{
          await clickIf(page,'Guardar para revisión');
          const confirm=page.getByRole('button',{name:'Guardar igualmente'});if(await confirm.count())await confirm.click();
          await page.waitForTimeout(250);
          const overwrite=page.getByRole('button',{name:'Actualizar pedido',exact:true});if(await overwrite.count())await overwrite.click();
          await page.waitForTimeout(500);
        });
        await capture(page,'notificacion-guardado',viewport);
      });
    });
    await attempt('revision '+vp,async()=>{
      await page.getByRole('button',{name:'Revisión',exact:true}).click();await capture(page,'revision-lista',viewport);
      if(await page.locator('.review-list-item').count())await page.locator('.review-list-item').first().click();
      await capture(page,'revision-detalle',viewport);
      await attempt('aprobar y generar',async()=>{
        await trackClicks(page);
        await flow(page,'Aprobar y generar',vp,async()=>{
          const approve=page.getByRole('button',{name:/Aprobar pedido|Marcar como aprobado/i});
          if(await approve.count()){await approve.first().click();await capture(page,'revision-aprobar-dialogo',viewport);const confirm=page.getByRole('button',{name:'Aprobar pedido',exact:true});if(await confirm.count())await confirm.last().click();}
          const generate=page.getByRole('button',{name:/Generar archivos/i});if(await generate.count()){await generate.first().click();await capture(page,'revision-generar-dialogo',viewport);}
        });
      });
      for(const mode of [/Aprobados/,/Generados/]){const b=page.getByRole('button',{name:mode});if(await b.count()){await b.first().click();await capture(page,`revision-${slug(String(mode))}`,viewport);}}
    });
    await attempt('parametros '+vp,async()=>{
      await page.getByRole('button',{name:'Parámetros',exact:true}).click();await capture(page,'parametros-arzua-pro',viewport);
      await page.locator('.parameter-model-trigger').click();await capture(page,'parametros-selector',viewport);
      const options=await page.getByRole('listbox',{name:'Modelos configurables'}).getByRole('option').count();
      for(let i=0;i<options;i++){
        if(i>0)await page.locator('.parameter-model-trigger').click();
        const name=(await page.getByRole('listbox',{name:'Modelos configurables'}).getByRole('option').nth(i).locator('strong').innerText()).trim();
        await page.getByRole('listbox',{name:'Modelos configurables'}).getByRole('option').nth(i).click();
        if(i>0)await capture(page,`parametros-${name}`,viewport);
      }
      await page.locator('.parameters-history summary').click();await capture(page,'parametros-historial',viewport);
      await page.locator('.parameter-model-trigger').click();await page.getByRole('listbox',{name:'Modelos configurables'}).getByRole('option').first().click();
      const input=page.getByLabel('Frente máximo normal (cm)',{exact:true});if(await input.count()){
        await trackClicks(page);
        const old=await input.inputValue();await input.fill(String(Number(old)+1));await capture(page,'parametros-borrador',viewport);
        await flow(page,'Cambiar parámetro y guardar para todos',vp,async()=>{
          await page.getByRole('button',{name:'Guardar para todos',exact:true}).first().click();await capture(page,'parametros-guardar-dialogo',viewport);
          await page.getByRole('combobox',{name:'Quién hace el cambio'}).click();await page.getByRole('option').first().click();
          await page.getByLabel('Motivo',{exact:true}).fill('Barrido UI en instancia aislada');
          await page.getByRole('dialog').getByRole('button',{name:'Guardar para todos'}).click();
          await page.waitForTimeout(350);
        });
        await capture(page,'parametros-guardado',viewport);
      }
    });
    await attempt('configuracion '+vp,async()=>{await page.getByRole('button',{name:'Configuración',exact:true}).click();await capture(page,'configuracion',viewport);});
    data.notes.push(`${vp}: Historial de pedidos no figura en las cuatro pestañas de navegación; HistoryView.tsx existe, pero App.tsx no lo monta.`);
    data.issues.push(...errors.map(detail=>({kind:'console-error',screen:'sesion',viewport:vp,shot:'',detail})));
  }finally{await browser.close();}
}
await fs.writeFile(out,JSON.stringify(data,null,2));
console.log(`DONE ${data.states.length} captures, ${data.issues.length} findings; ${out}`);
