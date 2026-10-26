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

/** Cotas de las cintas tal como vienen en el dibujo (Iván, 25/10/2026; AR2605035: «60 380 120 1540»), en mm y de
 * la izquierda hacia el centro: distancias hasta cada recorte y el recorte (120). Cada cota igual al recorte es un
 * recorte; las demás se suman como distancia (el 60 y el 380 son dos cotas antes del primero). La última llega al
 * inicio del recorte del centro o, si no lo hay, al centro de la puerta; la web lo distingue con el frente.
 * La derecha es simétrica. Devuelve las X (borde izquierdo de cada recorte) de toda la entrada, en cm. */
export function cintasDesdeCotas(mm: number[], frente: number, ancho = 12): { xs: number[] } | { error: string } {
  if (!mm.length || mm.some((v) => !Number.isFinite(v) || v <= 0)) return { error: 'Escribe las cotas en mm separadas por espacios.' };
  if (!(frente > 0)) return { error: 'Pon antes el frente: hace falta para la parte derecha.' };
  const esRecorte = (v: number) => Math.abs(v / 10 - ancho) < 0.05;
  if (esRecorte(mm[mm.length - 1])) return { error: 'La fila acaba en un recorte: falta la cota hasta el centro o hasta el recorte del centro.' };
  const izquierda: number[] = [];
  let x = 0;
  for (const v of mm) { if (esRecorte(v)) izquierda.push(x); x += v / 10; }
  const tolerancia = 1;
  if (Math.abs(x - (frente - ancho) / 2) <= tolerancia) izquierda.push((frente - ancho) / 2);
  else if (Math.abs(x - frente / 2) > tolerancia) {
    // AR2605035: «60 380 120 154» con la última en cm; en mm es 1540. Se dice cuál falla, en mm, como en el dibujo.
    const ultimo = mm[mm.length - 1], conCero = x + (ultimo * 9) / 10;
    const cuadra = [frente / 2, (frente - ancho) / 2].some((c) => Math.abs(conCero - c) <= tolerancia);
    const hastaCentro = Math.round(((frente - ancho) / 2) * 10);
    return { error: cuadra
      ? `La última cota no cuadra: ¿es ${ultimo * 10} mm en vez de ${ultimo}? Todas van en mm.`
      : `Las cotas suman ${Math.round(x * 10)} mm y hasta el recorte del centro hay ${hastaCentro} mm (${Math.round(frente * 5)} hasta el centro): revisa la fila; todas van en mm.` };
  }
  return { xs: cintasSimetricas(izquierda, frente, ancho) };
}

/** Tramos de las E.T. de una enrollable tal como vienen en el dibujo, de abajo arriba (Iván, 26/10/2026: «no quiero
 * tener que andar calculando las sumas para las posiciones»): del bajo al primer eje y de eje a eje. Si el último
 * tramo llega arriba (la suma da el alto), es la cabecera y no es un eje. En mm o en cm: si en cm la suma se pasa
 * del alto, son mm. Devuelve el eje de cada E.T. desde abajo, en cm. */
export function ejesDesdeTramos(texto: string, alto: number): { ejes: number[]; enMm: boolean } | { error: string } {
  const valores = texto.trim().split(/[\s;]+/).filter(Boolean).map((x) => Number(x.replace(',', '.')));
  if (!valores.length || valores.some((v) => !Number.isFinite(v) || v <= 0)) return { error: 'Escribe los tramos separados por espacios, de abajo arriba.' };
  if (!(alto > 0)) return { error: 'Pon antes el alto de la puerta.' };
  const suma = valores.reduce((s, v) => s + v, 0);
  const enMm = suma > alto + 1;
  const cm = valores.map((v) => Math.round((enMm ? v / 10 : v) * 100) / 100);
  let eje = 0;
  const ejes = cm.map((v) => (eje = Math.round((eje + v) * 100) / 100));
  if (Math.abs(ejes[ejes.length - 1] - alto) <= 1) ejes.pop();
  if (!ejes.length) return { error: 'Solo hay un tramo hasta arriba: falta el del primer eje.' };
  if (ejes[ejes.length - 1] >= alto) return { error: `Los tramos suman ${ejes[ejes.length - 1]} cm y la puerta mide ${alto}: revisa las cotas.` };
  return { ejes, enMm };
}

/**
 * Cintas desde la fila del dibujo, empezando por la izquierda (Iván, 26/10/2026): hasta el primer recorte, el recorte,
 * hasta el siguiente… La derecha es simétrica y la pone la web. No hace falta llegar al centro: si la última cota llega
 * al inicio del recorte del centro, ese recorte se añade; si llega al centro o se queda antes, solo se reflejan los
 * escritos. En mm, como el dibujo; si los recortes vienen como 12 (en cm), se toma todo en cm. Devuelve las X en cm.
 */
export function cintasDesdeFila(valores: number[], frente: number, ancho = 12): { xs: number[]; enMm: boolean } | { error: string } {
  if (!valores.length || valores.some((v) => !Number.isFinite(v) || v <= 0)) return { error: 'Escribe las cotas separadas por espacios, empezando por la izquierda.' };
  if (!(frente > 0)) return { error: 'Pon antes el frente: hace falta para la parte derecha.' };
  const enMm = !valores.some((v) => Math.abs(v - ancho) < 0.05) || valores.some((v) => Math.abs(v - ancho * 10) < 0.5);
  const cm = valores.map((v) => (enMm ? v / 10 : v));
  const esRecorte = (v: number) => Math.abs(v - ancho) < 0.05;
  if (!cm.some(esRecorte)) return { error: `No hay ningún recorte de ${enMm ? ancho * 10 : ancho} en la fila: entre cota y cota va el recorte.` };
  const izquierda: number[] = [];
  let x = 0;
  for (const v of cm) { if (esRecorte(v)) izquierda.push(x); x += v; }
  const tolerancia = 1, mitad = frente / 2, centro = (frente - ancho) / 2;
  if (x > mitad + tolerancia) return { error: `Las cotas suman ${Math.round(x * 10)} mm y pasan del centro (${Math.round(mitad * 10)} mm): escribe solo hasta el centro.` };
  if (!esRecorte(cm[cm.length - 1]) && Math.abs(x - centro) <= tolerancia) izquierda.push(centro);
  return { xs: cintasSimetricas(izquierda, frente, ancho), enMm };
}
