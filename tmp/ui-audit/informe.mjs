// Transforma los datos crudos del barrido en el informe y el inventario de fase 1.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const data=JSON.parse(await fs.readFile(path.join(root,'tmp/ui-audit/barrido-data.json'),'utf8'));
const docs=path.join(root,'docs/ui');await fs.mkdir(docs,{recursive:true});
const esc=s=>String(s??'').replaceAll('|','\\|').replaceAll('\n',' ').replaceAll('\r',' ').trim();
const csv=s=>'"'+String(s??'').replaceAll('"','""')+'"';
const shot=s=>s?`[captura](../../${s.replaceAll('\\','/')})`:'—';
function source(screen,c){
  const n=c.label;
  if(['Pedido','Parámetros','Revisión','Configuración'].includes(n))return 'src/client/App.tsx';
  if(screen.startsWith('parametros')){
    if(/Guardar para todos|Descartar|Quién hace el cambio|Motivo|Cancelar/.test(n))return 'src/client/components/ParametersSaveBar.tsx';
    if(/historial|versión/i.test(n))return 'src/client/components/ParametersHistory.tsx';
    if(/modelo del catálogo|RPS|Arzúa Pro|Diana vertical/i.test(n))return 'src/client/views/ParametersView.tsx + src/client/components/controlLabels.ts';
    return 'src/client/views/ParametersView.tsx';
  }
  if(screen.startsWith('configuracion')||screen.startsWith('axe-configuracion'))return 'src/client/views/SettingsView.tsx';
  if(screen.startsWith('revision')||screen.startsWith('axe-revision')){
    if(/Aprobar|Generar|Por revisar|Aprobados|Generados|Buscar pedidos|Año|Actualizar/.test(n))return 'src/client/views/ReviewsView.tsx';
    if(/Frente|Salida|Lacado|OF|Dispositivo|Ventana|Tubo de carga/.test(n))return 'src/client/components/ReviewOrderDetail.tsx → AwningColumn.tsx / modelBehavior.js';
    return 'src/client/components/ReviewOrderDetail.tsx';
  }
  if(screen.startsWith('pdf'))return 'src/client/App.tsx + src/client/components/PdfPreviewPages.tsx';
  if(screen.startsWith('parametro'))return 'src/client/views/ParametersView.tsx';
  if(screen.startsWith('selector-modelo'))return 'src/client/components/ModelPickerDialog.tsx + controlLabels.ts / modelBehavior.js';
  if(screen.includes('estructura')||screen.includes('despiece')||screen.includes('reserva')||screen.includes('resultados')){
    if(/Editar|Aplicar|Cancelar|Añadir pieza|Reserva fila|Descripción fila/.test(n))return 'src/client/components/StructureEditor.tsx';
    return 'src/client/components/LiveResults.tsx';
  }
  if(screen.includes('tarjeta')||screen.includes('pedido-')){
    if(/Añadir toldo|Añadir trabajo de tela|Limpiar|Vista previa|Guardar para revisión/.test(n))return 'src/client/App.tsx / OrderView.tsx';
    if(/Variante|Modelo|Dispositivo|Salida|Lacado|Tela|Bamba|Curva/.test(n))return 'src/client/components/AwningColumn.tsx + controlLabels.ts / modelBehavior.js';
    return 'src/client/components/AwningColumn.tsx / OrderView.tsx';
  }
  return c.source;
}
const rows=[['pantalla','resolución','tipo','etiqueta accesible','texto visible','placeholder','deshabilitado','origen del texto','captura']];
for(const s of data.states)for(const c of s.controls)rows.push([s.screen,s.viewport,c.type,c.label,c.text,c.placeholder,c.disabled?'sí':'no',source(s.screen,c),s.shot]);
await fs.writeFile(path.join(docs,'barrido-inventario-2026-09.csv'),'\uFEFF'+rows.map(r=>r.map(csv).join(',')).join('\r\n'),'utf8');
const counts={};for(const x of data.issues)counts[x.kind]=(counts[x.kind]||0)+1;
const lines=[];
lines.push('# Barrido UI · fase 1 · 23/09/2026','');
lines.push('Ejecución reproducible en la instancia aislada `http://127.0.0.1:4310` (`simulationMode=true`, `fileWritesEnabled=false`), solo escritorio. Rama `codex/ui-barrido-2026-09`. No se modificó código de la aplicación. Script: `tmp/ui-audit/barrido.mjs`; datos crudos y capturas: `tmp/ui-audit/` (ignorado por Git).','');
lines.push(`Se guardaron ${new Set(data.states.map(s=>s.shot)).size} capturas distintas en 1280×720 y 1600×1000. Se inspeccionaron visualmente todas mediante 15 hojas de contacto en \`tmp/ui-audit/contactos/\`. El inventario completo contiene ${rows.length-1} observaciones de controles en [CSV](barrido-inventario-2026-09.csv).`,'');
lines.push('## Cobertura de modelos','', '| Modelo | 1280 vacío | 1280 válido | 1600 vacío | 1600 válido |','| --- | --- | --- | --- | --- |');
for(const model of data.models){
  const slug=model.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const valid=['IRIS','CAMBIO CORTINA','CAMBIO ANTICA','BAMBALINA'].includes(model)?'valida':'rellena';
  const rel=(w,state)=>`tmp/ui-audit/shots/ui-${w}-tarjeta-${slug}-${state}.png`;
  lines.push(`| ${model} | ${shot(rel('1280x720','vacia'))} | ${shot(rel('1280x720',valid))} | ${shot(rel('1600x1000','vacia'))} | ${shot(rel('1600x1000',valid))} |`);
}
lines.push('','La pasada final dejó las 22 tarjetas en **VÁLIDO** en las dos resoluciones. Las cuatro primeras capturas “rellena” de IRIS, Cambio de cortina, Cambio antica y Bambalina muestran FALTA; la columna “válido” enlaza la captura posterior completada.','');
lines.push('## Estados adicionales','', '| Estado | 1280×720 | 1600×1000 |','| --- | --- | --- |');
const states=['pedido-vacio','selector-modelo','pedido-dos-toldos','tarjeta-falta','tarjeta-candado','tarjeta-reglas-desbloqueadas','resultados-estructuras','resultados-telas','reserva-rps','despiece-editor-estructura','editor-estructura-abierto','pdf-preview','pdf-pagina-1','pdf-pagina-2','pdf-pagina-3','pdf-zoom-125','revision-lista','revision-detalle','revision-aprobar-confirmacion','revision-aprobado-completo','revision-generar-confirmacion','revision-generar-respuesta','parametros-selector','parametros-historial','parametros-borrador','parametros-guardar-dialogo','parametros-guardado','parametros-conflicto','configuracion','notificacion-guardado'];
for(const state of states){const a=data.states.findLast(s=>s.screen===state&&s.viewport==='1280×720');const b=data.states.findLast(s=>s.screen===state&&s.viewport==='1600×1000');lines.push(`| ${state} | ${shot(a?.shot)} | ${shot(b?.shot)} |`);}
lines.push('','El visor de PDF mostró tres páginas. `pdf-zoom-125` usa zoom del navegador al 125 %; no apareció un control de zoom propio en el visor. La navegación principal solo muestra Pedido, Parámetros, Revisión y Configuración: `HistoryView.tsx` existe en el repositorio, pero no hay acceso visible a Historial de pedidos. El historial de Parámetros sí se capturó.','');
lines.push('## Detecciones automáticas','', '| Comprobación | Resultado bruto |','| --- | --- |');
for(const [label,key] of [['Texto cortado en etiquetas/opciones/celdas','clipped'],['Etiquetas multilínea','multiline'],['Scroll horizontal de documento','horizontal-scroll'],['Solapes entre cajas hermanas examinadas','overlap'],['Controles sin nombre accesible en el selector DOM','unnamed'],['Errores de consola/HTTP','console-error'],['Contraste AA (`@axe-core/playwright`)','axe-color-contrast']])lines.push(`| ${label} | ${counts[key]||0} |`);
lines.push('','El detector DOM solo cuenta elementos visibles y compara `scrollWidth > clientWidth + 2 px`, altura de etiqueta frente a línea, `documentElement.scrollWidth`, cajas hermanas de filas/cuadrículas y nombre obtenido de `aria-label`, `aria-labelledby`, `label`, texto o `title`. Axe se ejecutó con etiquetas WCAG 2/2.1 AA en Pedido, tarjeta válida, resultados, Revisión, Parámetros y Configuración a las dos resoluciones. Los recuentos de contraste son nodos reportados, con repeticiones entre pantallas/resoluciones.','');
lines.push('### Hallazgos en crudo','', '| Tipo | Pantalla | Resolución | Dónde / dato | Captura |','| --- | --- | --- | --- | --- |');
for(const issue of data.issues){
  const d=issue.detail;
  const detail=typeof d==='string'?d:issue.kind==='axe-color-contrast'?`${d.target?.join(' ')} · ${d.summary?.match(/contrast of [\d.]+/)?.[0]||''} · ${d.summary?.match(/foreground color: [^,]+, background color: [^,]+/)?.[0]||''}`:JSON.stringify(d);
  lines.push(`| ${esc(issue.kind)} | ${esc(issue.screen)} | ${esc(issue.viewport)} | ${esc(detail).slice(0,280)} | ${shot(issue.shot)} |`);
}
lines.push('','Los HTTP 409 corresponden a la sustitución de un pedido y al conflicto provocado entre dos puestos de Parámetros; los HTTP 400 aparecieron al intentar aprobar el pedido de prueba sin técnico/revisor. Con técnico y revisor asignados, la aprobación pasó. Tras confirmar “Generar archivos” en simulación, la aplicación mostró “Activa las salidas manuales en Configuración” y mantuvo el estado Aprobado: [1280](../../tmp/ui-audit/shots/ui-1280x720-revision-generar-respuesta.png), [1600](../../tmp/ui-audit/shots/ui-1600x1000-revision-generar-respuesta.png).','');
lines.push('## Recorridos cronometrados','', '| Recorrido | Resolución | Clics registrados | Segundos |','| --- | --- | ---: | ---: |');
for(const f of data.flows)lines.push(`| ${esc(f.name)} | ${esc(f.viewport)} | ${f.clicks} | ${f.seconds} |`);
lines.push('','Los tiempos son de Playwright en Chromium local, no tiempos humanos. Los clics se cuentan con un listener de `click` en el documento y abarcan las elecciones automáticas del recorrido. La primera fila “Aprobar y generar” de 1280 se hizo sobre un pedido sin asignación; la fila “(completo)” repite con técnico y revisor. La generación se midió por separado al confirmar el diálogo.','');
lines.push('## Inventario de controles','', 'El [CSV completo](barrido-inventario-2026-09.csv) registra una fila por control visible y captura: pantalla, resolución, tipo, etiqueta accesible, texto visible, placeholder, estado deshabilitado, archivo/componente o fuente de la etiqueta y ruta de captura. El origen se infiere de los componentes que renderizan cada pantalla y de `controlLabels.ts` / `modelBehavior.js` para nombres de modelos y opciones.','', '| Pantalla/estado | 1280 controles | 1600 controles | Captura |','| --- | ---: | ---: | --- |');
const grouped=new Map();for(const s of data.states){const row=grouped.get(s.screen)||{};row[s.viewport]=s.controls.length;row.shot=s.shot;grouped.set(s.screen,row);}
for(const [screen,r] of grouped)lines.push(`| ${esc(screen)} | ${r['1280×720']??'—'} | ${r['1600×1000']??'—'} | ${shot(r.shot)} |`);
lines.push('','Para repetir: iniciar `.claude/skills/running-toldos-testar/start-isolated.sh`, comprobar `/api/health` y ejecutar `node tmp/ui-audit/barrido.mjs`, `node tmp/ui-audit/barrido.mjs --completar`, `--axe`, `--aprobacion` y `--generar`. Los códigos de pedido de prueba y los cambios de Parámetros se escriben solo en la instancia aislada.');
lines.push('','## Validación de esta entrega','', '| Comando | Resultado |','| --- | --- |','| `pnpm lint` | Correcto |','| `pnpm build` | Correcto (aviso de tamaño de chunks de Vite) |','| `pnpm test` | 62 archivos, 1.168 tests correctos |','| `node scripts/test-hera-workflow.mjs` | Correcto |','| `node scripts/test-bambalina-workflow.mjs` | Correcto |','| `node scripts/test-rps-e2e.mjs` | Falló en caso AR2603332, OF 0230194: TURA80HG600C esperado 2, obtenido 1. El caso falla en `verifyApiCase` antes del recorrido de navegador; informe en `output/playwright/rps-e2e/report.json`. |','', 'La fase 1 no cambia reglas de cálculo ni corrige este caso RPS.');
await fs.writeFile(path.join(docs,'barrido-2026-09.md'),lines.join('\n')+'\n','utf8');
console.log('Informe',lines.length,'líneas;',rows.length-1,'filas de inventario');
