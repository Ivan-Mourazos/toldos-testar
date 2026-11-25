import { textoCota, type CotaAlzado } from '../../puertas/alzado.ts';
import { aMilimetros, medidaPuerta, textoMedidasMm } from './medidasPuertas';

/** Solo cambia el texto de pantalla: la geometría y el plano conservan sus cm. */
export function textoCotaMm(c: CotaAlzado): string {
  const rotulo = c.rotulo === undefined
    ? undefined
    : /^\d+(?:[.,]\d+)?$/.test(c.rotulo)
      ? medidaPuerta(Number(c.rotulo.replace(',', '.')))
      : textoMedidasMm(c.rotulo);
  return textoCota({ ...c, valor: aMilimetros(c.valor), rotulo, sufijo: c.sufijo?.replace(/cm/gi, 'mm') });
}

const aMmTexto = (n: string) => medidaPuerta(Number(n.replace(',', '.')));

/** Convierte textos de taller del plano (cm) a mm para la pantalla sin alterar OF, RAL, Ø ni medidas ya en mm. */
export function textoAlzadoMm(texto: string): string {
  return textoMedidasMm(texto)
    .replace(/DEJAR HUECOS (\d+(?:[.,]\d+)?)\)/g, (_, n: string) => `DEJAR HUECOS ${aMmTexto(n)} mm)`)
    .replace(/\bCORTADA DE (\d+(?:[.,]\d+)?)\b/gi, (_, n: string) => `CORTADA DE ${aMmTexto(n)} mm`)
    .replace(/\bDE ([35]) (BRAVO|SUAVE)\b/gi, (_, n: string, tipo: string) => `DE ${aMmTexto(n)} mm ${tipo}`)
    .replace(/\bVELCRO (BRAVO|SUAVE) REVÉS DE (\d+(?:[.,]\d+)?)\b/gi, (_, tipo: string, n: string) => `VELCRO ${tipo} REVÉS DE ${aMmTexto(n)} mm`)
    .replace(/\bVELCRO\s*\((\d+(?:[.,]\d+)?)\)/gi, (_, n: string) => `VELCRO (${aMmTexto(n)} mm)`)
    .replace(/\bCIERRE VELCRO\s*\((\d+(?:[.,]\d+)?)\)/gi, (_, n: string) => `CIERRE VELCRO (${aMmTexto(n)} mm)`)
    .replace(/\bB\.N\.\s*\((\d+(?:[.,]\d+)?)\)/gi, (_, n: string) => `B.N. (${aMmTexto(n)} mm)`);
}
