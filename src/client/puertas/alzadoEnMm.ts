import { textoCota, type CotaAlzado } from '../../puertas/alzado.ts';
import { aMilimetros, medidaPuerta, textoMedidasMm } from './medidasPuertas';

/** Solo cambia el texto de pantalla: la geometría y el plano conservan sus cm. */
export function textoCotaMm(c:CotaAlzado):string {
  const rotulo=c.rotulo===undefined?undefined:/^\d+(?:[.,]\d+)?$/.test(c.rotulo)?medidaPuerta(Number(c.rotulo.replace(',','.'))):textoMedidasMm(c.rotulo);
  return textoCota({...c,valor:aMilimetros(c.valor),rotulo,sufijo:c.sufijo?.replace(/cm/gi,'mm')});
}

export function textoAlzadoMm(texto:string):string {
  return textoMedidasMm(texto).replace(/DEJAR HUECOS (\d+(?:[.,]\d+)?)\)/g,(_,n:string)=>`DEJAR HUECOS ${medidaPuerta(Number(n.replace(',','.')))} mm)`);
}
