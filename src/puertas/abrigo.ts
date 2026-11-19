import type { ParteAbrigo, PiezaPuerta, Puerta, Punto, ResultadoPuerta } from './tipos.ts';

export const materialesAbrigo = {
  frente: 'LONA 3 MM NEGRO', laterales: 'LONA 3 MM NEGRO',
  perimetral: 'PVC ALPHA 580 GR NEGRO', tiras: 'RESTO LONA 3 MM NEGRO',
} satisfies Record<ParteAbrigo,string>;

export function calcularAbrigo(p: Puerta): ResultadoPuerta {
  const r: ResultadoPuerta = {version:1,piezas:[],avisos:[],alternativasSaco:null,empates:[],uniones:[],bolsillo:null};
  const error = (codigo:string,texto:string) => r.avisos.push({codigo,texto,nivel:'error'});
  const parte = p.abrigo?.parte, corto = p.abrigo?.corto ?? 0;
  const { frente:largo, alto:ancho, cantidad } = p;
  const rollo = parte==='perimetral'?250:160;
  if (!parte || !Object.hasOwn(materialesAbrigo,parte)) error('PARTE','Elige la pieza del abrigo.');
  if (![largo,ancho].every(v=>Number.isFinite(v)&&v>0&&v<=3000) || Math.min(largo,ancho)>rollo)
    error('MEDIDAS','Comprueba el largo y el ancho de esta pieza en la hoja del pedido.');
  if (parte==='laterales' && !(corto>=100.25 && corto<largo && ancho>=10.5))
    error('LATERAL','Comprueba los dos bordes y el ancho del lateral. La franja debe caber entera.');
  if (parte==='tiras' && ancho!==3) error('TIRA','La tira debe medir 30 mm de ancho.');
  if (!Number.isInteger(cantidad)||cantidad<1||cantidad>50) error('CANTIDAD','Indica una cantidad entera de 1 a 50.');
  if (!parte || r.avisos.length) return r;
  if (!p.confirmada) error('MODELO','Confirma las medidas y cantidades con la hoja del pedido.');
  if (!p.of.trim()) r.avisos.push({codigo:'SIN_OF',nivel:'aviso',texto:'Falta la OF de esta línea.'});
  const lateral = parte==='laterales';
  const base: Punto[] = [[0,0],[largo,0],[lateral?corto:largo,ancho],[0,ancho]];
  const letras = lateral?['B','C']:[{frente:'A',perimetral:'D',tiras:'E',laterales:''}[parte]];
  for (const letra of letras) {
    const y = (v:number)=>letra==='C'?ancho-v:v;
    const pendiente=(largo-corto)/ancho;
    // Centro del ollao a 5 mm de ambos bordes, medidos en perpendicular (AR2600140).
    const ollaoX=corto + .5*(pendiente-Math.hypot(1,pendiente));
    const bajo=(ancho-10)/2;
    const marcas = lateral?[[.5,bajo],[100,bajo],[100,bajo+10],[.5,bajo+10],[ollaoX,ancho-.5]]:[];
    const pieza:PiezaPuerta={id:'abrigo-'+letra,nombre:letra,clase:'pano',ancho:largo,alto:ancho,
      cantidad,material:materialesAbrigo[parte],rollo,of:p.of,radio:0,
      contorno:base.map(([x,v])=>[x,y(v)]),marcas:[],textos:[],huecos:[],
      circulosMarca:marcas.map(([x,v])=>({x,y:y(v),r:.25})),
      abrigo:{capa:parte==='perimetral'?'DISCO1':'CUTTER',nota:lateral?'MARCA DERECHO · OLLAO GRANDE EN ESQUINA':parte==='perimetral'?'AL CORTE ALREDEDOR':''}};
    r.piezas.push(pieza);
  }
  return r;
}
