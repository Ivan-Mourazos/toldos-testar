/** Lee la fila de cotas del dibujo tal como viene en la hoja de Portanova, de abajo arriba: pie, pasos y cabecera
 * (AR2605035: «310 580 550 580 550 580 700», en mm). Si la suma cuadra con el alto en cm, se toman como cm. */
export function leerCadena(texto:string, alto:number): {pie:number;pasos:number[];cabecera:number;enMm:boolean}|null {
  const valores=texto.trim().split(/[\s;]+/).filter(Boolean).map(x=>Number(x.replace(',','.')));
  if(valores.length<2||valores.some(v=>!Number.isFinite(v)||v<=0)) return null;
  const suma=valores.reduce((s,v)=>s+v,0);
  const enMm=!(alto>0&&Math.abs(suma-alto)<Math.abs(suma/10-alto));
  const cm=valores.map(v=>Math.round((enMm?v/10:v)*100)/100);
  return {pie:cm[0],pasos:cm.slice(1,-1),cabecera:cm[cm.length-1],enMm};
}

/** Cintas del dibujo (Iván, 25/10/2026): vienen acotadas de la izquierda hasta el centro, porque la derecha es
 * simétrica. Con X al borde izquierdo de cada recorte, el simétrico de X es frente − X − ancho; el del centro
 * no se repite. Devuelve las X de toda la entrada, de izquierda a derecha, en cm. */
export function cintasSimetricas(izquierda: number[], frente: number, ancho = 12): number[] {
  const redondear = (v: number) => Math.round(v * 10) / 10;
  const todas = izquierda.map(redondear);
  for (const x of izquierda) {
    const espejo = redondear(frente - x - ancho);
    if (!todas.some((y) => Math.abs(y - espejo) < 0.5)) todas.push(espejo);
  }
  return todas.sort((a, b) => a - b);
}
