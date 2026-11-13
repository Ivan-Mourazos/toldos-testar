import { number, value } from './dxf.ts';
import { contenidoMtext } from './textos.ts';
import type { Dxf, Duda } from './tipos.ts';

export function validar(d: Dxf): { dudas: Duda[]; avisos: Duda[]; tieneTexto: boolean } {
  const dudas: Duda[] = [], avisos: Duda[] = []; let tieneTexto = false;
  const cabecera = d.sections.HEADER?.[0]?.pairs ?? [];
  const min = cabecera.findIndex(([c, v]) => c === 9 && v === '$EXTMIN');
  if (min < 0 || cabecera[min + 1]?.[0] !== 10 || cabecera[min + 2]?.[0] !== 20 || !Number.isFinite(Number(cabecera[min + 1]?.[1])) || !Number.isFinite(Number(cabecera[min + 2]?.[1]))) dudas.push({motivo: 'Falta el origen del plano ($EXTMIN): guarda de nuevo el DXF en ZWCAD, en milímetros'});
  const unidades = cabecera.findIndex(([c, v]) => c === 9 && v === '$INSUNITS');
  if (unidades >= 0 && Number(cabecera[unidades + 1]?.[1]) !== 4) dudas.push({motivo: 'El DXF no declara milímetros: revisa las unidades en ZWCAD y vuelve a exportarlo'});
  const requeridos: Record<string, number[]> = {LINE: [10, 20, 11, 21], ARC: [10, 20, 40, 50, 51], CIRCLE: [10, 20, 40], TEXT: [1, 10, 20, 40], MTEXT: [1,10,20,40], LWPOLYLINE: [90, 10, 20]};
  for (const e of d.entities) {
    const capa = value(e, 8), handle = value(e, 5), base = {handle, tipo: e.type, capa};
    const duda=(motivo: string, fuenteDxf?: string)=>dudas.push({...base,...(fuenteDxf?{fuenteDxf}:{}),motivo});
    const sitio=`en la capa ${capa || '(sin nombre)'}`;
    if (number(e, 67)) { avisos.push({...base, motivo: 'Entidad de espacio papel excluida del corte'}); continue; }
    if (e.type === 'VIEWPORT') { avisos.push({...base, motivo: 'Ventana de presentación excluida del corte'}); continue; }
    if (!['DISCO1', 'DISCO2', 'CUTTER', 'ROTULADOR', 'TALADRO', 'TEXTO', 'CORTE', 'CURV', 'TALADADRO'].includes(capa.toUpperCase())) duda(`La capa ${capa || '(sin nombre)'} no tiene una herramienta comprobada: mueve sus entidades a DISCO1, DISCO2, CUTTER, ROTULADOR, taladro o texto en ZWCAD`);
    if(['CORTE','CURV','TALADADRO'].includes(capa.toUpperCase()) && !avisos.some(a=>a.capa===capa))avisos.push({...base,motivo:`La capa ${capa} queda sin herramienta, como en los ejemplos del robot: asígnala en CUTMatic antes de cortar`});
    if (!(e.type in requeridos)) {
      const indicaciones: Record<string,string> = {SPLINE:`Hay una curva spline ${sitio}: conviértela a polilínea en ZWCAD`,INSERT:`Hay un bloque ${sitio}: descompón el bloque en ZWCAD y revisa sus capas`,DIMENSION:`Hay una cota ${sitio}: descompón la cota en ZWCAD si debe salir en el corte`,HATCH:`Hay un sombreado ${sitio}: sustitúyelo por los contornos que deban salir en el corte`};
      duda(indicaciones[e.type]??`Hay una entidad ${e.type} ${sitio} sin conversión comprobada: conviértela a rectas, arcos o polilíneas en ZWCAD`); continue;
    }
    const fuenteDxf=d.styles[value(e,7,'Standard')]?.[3];
    const faltan = requeridos[e.type].filter(c => !e.pairs.some(([codigo]) => codigo === c));
    if (faltan.length) duda(`La entidad ${e.type}${fuenteDxf?` (${fuenteDxf})`:''} ${sitio} está incompleta (datos ${faltan.join(', ')}): dibújala de nuevo o vuelve a exportar el DXF`);
    if (e.type === 'LWPOLYLINE' && (number(e, 90) < 2 || e.pairs.filter(([c]) => c === 10).length !== number(e, 90) || e.pairs.filter(([c]) => c === 20).length !== number(e, 90))) duda(`La polilínea ${sitio} tiene vértices incompletos: repárala en ZWCAD y vuelve a exportar`);
    // LINE guarda sus extremos en coordenadas del dibujo, también con normal -Z (AR2605060).
    // Cuatro planos traen residuos Z de hasta 0,000000016 mm. No son un relieve de corte.
    if (number(e, 210) !== 0 || number(e, 220) !== 0 || (number(e,230,1)!==1 && !(e.type==='LINE' && number(e,230)===-1)) || e.pairs.some(([c,v])=>[30,31,38,39].includes(c)&&Math.abs(Number(v))>1e-7)) duda(`La entidad ${e.type} ${sitio} tiene relieve, elevación o un plano de extrusión no comprobado: aplánala al plano XY en ZWCAD`);
    if (['ARC', 'CIRCLE'].includes(e.type) && number(e, 40) <= 0) duda(`El arco o círculo ${sitio} no tiene un radio positivo: corrígelo en ZWCAD`);
    if (e.type === 'LWPOLYLINE' && (number(e, 43) || e.pairs.some(([c, v]) => (c === 40 || c === 41) && Number(v) !== 0))) duda(`La polilínea ${sitio} tiene anchura: pon su anchura a cero en ZWCAD o dibuja sus bordes como contornos`);
    if (['TEXT','MTEXT'].includes(e.type)) {
      tieneTexto = true;
      const estilo=value(e,7,'Standard');
      if(fuenteDxf?.toLowerCase()==='txt.shx')avisos.push({...base,fuenteDxf,motivo:`El texto txt.shx ${sitio} se dibuja con Arial, como en los contornos contrastados del robot`});
      else if(fuenteDxf && fuenteDxf.toLowerCase()!=='arial.ttf')duda(`El texto ${sitio} usa ${fuenteDxf}, sin contornos contrastados: cambia su fuente a Arial en ZWCAD o elige «sin textos»`,fuenteDxf);
      if (!fuenteDxf) duda(`El texto ${sitio} usa el estilo ${estilo} sin fuente declarada: asígnale Arial en ZWCAD o elige «sin textos»`);
      if (number(e,40)<=0 || e.type==='TEXT' && number(e,41,1)<=0) duda(`El texto ${sitio} tiene altura o anchura no positiva: corrígelo en ZWCAD o elige «sin textos»`);
      if(e.type==='TEXT') {
        if (number(e,51) || number(e,71) || number(e,72)>2) duda(`El texto ${sitio} está inclinado, reflejado o ajustado: pásalo a texto normal en ZWCAD o elige «sin textos»`);
        if (/%%|\\(?!U\+[a-f\d]{4})/i.test(value(e,1))) duda(`El texto ${sitio} tiene códigos de formato sin contrastar: simplifícalo en ZWCAD o elige «sin textos»`);
      } else {
        const resolver=`: descompón el texto a TEXT con Arial en ZWCAD o elige «sin textos»`;
        if(number(e,71,1)!==1)duda(`El texto multilínea ${sitio} usa un anclaje centrado o inferior cuya posición no está contrastada${resolver}`);
        if(number(e,50)!==0 || Math.abs(number(e,21))>1e-10 || number(e,11,1)<=0 || ![1,5].includes(number(e,72,1)))duda(`El texto multilínea ${sitio} está girado o tiene otra dirección de escritura sin posición contrastada${resolver}`);
        const inicioColumnas=e.pairs.findIndex(([c,v])=>c===1000&&v==='ACAD_MTEXT_COLUMN_INFO_BEGIN');
        const finColumnas=e.pairs.findIndex(([c,v],i)=>i>inicioColumnas&&c===1000&&v==='ACAD_MTEXT_COLUMN_INFO_END');
        const datosColumnas=inicioColumnas>=0?e.pairs.slice(inicioColumnas+1,finColumnas<0?undefined:finColumnas):[];
        const cuenta=datosColumnas.findIndex(([c,v])=>c===1070&&v==='76');
        if(number(e,75)!==0 || number(e,76)>1 || cuenta>=0&&Number(datosColumnas[cuenta+1]?.[1])!==1)duda(`El texto multilínea ${sitio} tiene columnas sin disposición contrastada${resolver}`);
        try { contenidoMtext(e); } catch(error) { duda(`El texto multilínea ${sitio} ${error instanceof Error?error.message:String(error)}${resolver}`); }
      }
    }
  }
  return {dudas, avisos, tieneTexto};
}
