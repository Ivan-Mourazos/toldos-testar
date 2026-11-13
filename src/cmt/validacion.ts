import { number, value } from './dxf.ts';
import { splineCubica } from './entidades.ts';

import type { Dxf, Duda } from './tipos.ts';

export function validar(d: Dxf): { dudas: Duda[]; avisos: Duda[]; tieneTexto: boolean } {
  const dudas: Duda[] = [], avisos: Duda[] = []; let tieneTexto = false;
  const cabecera = d.sections.HEADER?.[0]?.pairs ?? [];
  const min = cabecera.findIndex(([c, v]) => c === 9 && v === '$EXTMIN');
  if (min < 0 || cabecera[min + 1]?.[0] !== 10 || cabecera[min + 2]?.[0] !== 20 || !Number.isFinite(Number(cabecera[min + 1]?.[1])) || !Number.isFinite(Number(cabecera[min + 2]?.[1]))) dudas.push({motivo: 'Falta el origen del plano ($EXTMIN): guarda de nuevo el DXF en ZWCAD, en milímetros'});
  const unidades = cabecera.findIndex(([c, v]) => c === 9 && v === '$INSUNITS');
  if (unidades >= 0 && Number(cabecera[unidades + 1]?.[1]) !== 4) dudas.push({motivo: 'El DXF no declara milímetros: revisa las unidades en ZWCAD y vuelve a exportarlo'});
  const requeridos: Record<string, number[]> = {LINE: [10, 20, 11, 21], ARC: [10, 20, 40, 50, 51], CIRCLE: [10, 20, 40], TEXT: [1, 10, 20, 40], MTEXT: [1,10,20,40], SPLINE:[10,20,40,71,72,73], LWPOLYLINE: [90, 10, 20]};
  for (const e of d.entities) {
    const capa = value(e, 8), handle = value(e, 5), base = {handle, tipo: e.type, capa};
    const duda=(motivo: string, fuenteDxf?: string)=>dudas.push({...base,...(fuenteDxf?{fuenteDxf}:{}),motivo});
    const sitio=`en la capa ${capa || '(sin nombre)'}`;
    if (number(e, 67)) { avisos.push({...base, motivo: 'Entidad de espacio papel excluida del corte'}); continue; }
    if (e.type === 'VIEWPORT') { avisos.push({...base, motivo: 'Ventana de presentación excluida del corte'}); continue; }
    if (!['DISCO1', 'DISCO2', 'CUTTER', 'ROTULADOR', 'TALADRO', 'TEXTO', 'CORTE', 'CURV', 'TALADADRO','0','MARCA','REFERENCIAS','CORTE (VENT)','DEFPOINTS','CORTES - LONA','MARCAS-TAPAJ','VENT-PRE-NOIMPR','TEXTO2'].includes(capa.toUpperCase())) duda(`La capa ${capa || '(sin nombre)'} no tiene una herramienta comprobada: mueve sus entidades a DISCO1, DISCO2, CUTTER, ROTULADOR, taladro o texto en ZWCAD`);
    if(!['DISCO1','DISCO2','CUTTER','ROTULADOR','TALADRO','TEXTO'].includes(capa.toUpperCase())&&!avisos.some(a=>a.capa===capa))avisos.push({...base,motivo:`La capa ${capa} queda sin herramienta, como las capas sin referencia de CUTMatic del corpus; asígnala en CUTMatic`});
    if (!(e.type in requeridos)) {
      const indicaciones: Record<string,string> = {SPLINE:`Hay una curva spline ${sitio}: conviértela a polilínea en ZWCAD`,INSERT:`Hay un bloque ${sitio}: descompón el bloque en ZWCAD y revisa sus capas`,DIMENSION:`Hay una cota ${sitio}: descompón la cota en ZWCAD si debe salir en el corte`,HATCH:`Hay un sombreado ${sitio}: sustitúyelo por los contornos que deban salir en el corte`};
      duda(indicaciones[e.type]??`Hay una entidad ${e.type} ${sitio} sin conversión comprobada: conviértela a rectas, arcos o polilíneas en ZWCAD`); continue;
    }
    const fuenteDxf=d.styles[value(e,7,'Standard')]?.[3];
    const faltan = requeridos[e.type].filter(c => !e.pairs.some(([codigo]) => codigo === c));
    if (faltan.length) duda(`La entidad ${e.type}${fuenteDxf?` (${fuenteDxf})`:''} ${sitio} está incompleta (datos ${faltan.join(', ')}): dibújala de nuevo o vuelve a exportar el DXF`);
    if (e.type === 'LWPOLYLINE' && (number(e, 90) < 1 || e.pairs.filter(([c]) => c === 10).length !== number(e, 90) || e.pairs.filter(([c]) => c === 20).length !== number(e, 90))) duda(`La polilínea ${sitio} tiene vértices incompletos: repárala en ZWCAD y vuelve a exportar`);
    if(e.type==='LWPOLYLINE'&&number(e,90)===1)avisos.push({...base,motivo:'La polilínea tiene un solo vértice y no dibuja ningún segmento; se omite como en el robot'});
    // LINE guarda sus extremos en coordenadas del dibujo, también con normal -Z (AR2605060).
    // Cuatro planos traen residuos Z de hasta 0,000000016 mm. No son un relieve de corte.
    if(e.pairs.some(([c,v])=>[30,31,38,39,210,220,230].includes(c)&&Math.abs(Number(v))>1e-7&&(c!==230||Number(v)!==1)))avisos.push({...base,motivo:`La entidad ${e.type} se proyecta al plano XY como en los ejemplos del robot`});
    if(e.type==='SPLINE')try{splineCubica(e);}catch(error){duda(error instanceof Error?error.message:String(error));}
    if (['ARC', 'CIRCLE'].includes(e.type) && number(e, 40) <= 0) duda(`El arco o círculo ${sitio} no tiene un radio positivo: corrígelo en ZWCAD`);
    if (e.type === 'LWPOLYLINE' && (number(e, 43) || e.pairs.some(([c, v]) => (c === 40 || c === 41) && Number(v) !== 0))) duda(`La polilínea ${sitio} tiene anchura: pon su anchura a cero en ZWCAD o dibuja sus bordes como contornos`);
    if (['TEXT','MTEXT'].includes(e.type)) {
      tieneTexto = true;

      if(number(e,40)<=0)duda(`El texto ${sitio} tiene altura no positiva: corrígelo en ZWCAD`);
      if(e.type==='MTEXT'&&(number(e,75)||number(e,76)>1||e.pairs.some(([c,v],i)=>c===1070&&v==='76'&&Number(e.pairs[i+1]?.[1])>1)))avisos.push({...base,motivo:'Las columnas CAD se leen en orden de párrafos; su reparto no tiene contraste en el corpus'});
    }
  }
  return {dudas, avisos, tieneTexto};
}
