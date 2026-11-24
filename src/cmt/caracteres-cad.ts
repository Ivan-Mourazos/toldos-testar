/** Controles de TEXT, también válidos dentro de MTEXT. Las rayas no se cortan.
 * Va aparte de textos-cad.ts porque la vista previa del navegador también lo usa y aquel lee las fuentes del disco. */
export function caracteresCad(texto:string):string {
 return texto.replace(/\\U\+([a-f\d]{4})/gi,(_:string,n:string)=>String.fromCharCode(parseInt(n,16)))
  .replace(/%%([cdpuo])/gi,(_:string,c:string)=>({c:'∅',d:'°',p:'±',u:'',o:''})[c.toLowerCase()]!);
}
