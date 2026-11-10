/** El documento y los cálculos conservan cm; solo la pantalla de puertas usa mm. */
export type UnidadPuerta = 'cm' | 'mm' | 'cantidad';
export const aMilimetros = (cm:number):number => Math.round(cm*1e8)/1e7;
export const desdeMilimetros = (mm:number):number => Math.round(mm*1e7)/1e8;
export const numeroPuerta = (n:number):string => n.toLocaleString('es-ES',{maximumFractionDigits:2,useGrouping:false});
export const medidaPuerta = (cm:number):string => numeroPuerta(aMilimetros(cm));
const numeroEnTexto = (n:string):number => Number((n.includes(',')||/^\d{1,3}(?:\.\d{3})+$/.test(n)?n.replaceAll('.',''):n).replace(',','.'));

/** Ayudas compartidas con el plano: convierte solo las medidas con unidad explícita. */
export function textoMedidasMm(texto:string):string {
  return texto.replace(/(\d+(?:[.,]\d+)*(?:\s*[×x]\s*\d+(?:[.,]\d+)*)*)\s*cms?\b/gi, (_,medidas:string)=>
    medidas.replace(/\d+(?:[.,]\d+)*/g,n=>medidaPuerta(numeroEnTexto(n)))+' mm')
    .replace(/(\d+(?:[.,]\d+)*)\s*m\b/g,(_,n:string)=>numeroPuerta(numeroEnTexto(n)*1000)+' mm')
    .replace(/\bcms?\b/gi,'mm');
}
