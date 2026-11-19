import { materialesAbrigo } from './abrigo.ts';
import { nuevaPuerta } from './calcular.ts';
import { REGLAS_SYSTEM_DOCK } from './systemDock.ts';
import { araujoDesdeRps } from './araujoRps.ts';
import { fichaPorCodigo } from './clientes.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import type { ModeloPuerta, ParteAbrigo, Puerta } from './tipos.ts';

/** SYSTEM DOCK, S.L. en RPS: sus líneas «LONA PERIMETRAL …» son lonas de abrigo de muelle (docs/modelos/system-dock.md). */
export const CODIGO_SYSTEM_DOCK = '032286';

// «Buscar pedido» con un pedido de puertas (22/10/2026): de cada línea de RPS con artículo de puerta sale una
// puerta con lo que dice el texto del pedido (medidas, color, cantidad) y su OF. Es una propuesta: el modelo
// no se da por confirmado, porque manda el dibujo del cliente (en RPS, AR2604725 es PUERTAPLE y es enrollable).

export interface LineaPuertaRps {
  articulo: string;
  cantidad: number;
  descripcion: string;
  comentario: string;
  of: string;
}

const numero = (texto: string) => Number(texto.replace(',', '.'));

export function puertasDesdeRps(lineas: LineaPuertaRps[], { clienteCodigo = '' }: { clienteCodigo?: string } = {}): { puertas: Puerta[]; avisos: string[] } {
  const puertas: Puerta[] = [];
  const avisos: string[] = [];
  const ficha=fichaPorCodigo(clienteCodigo);
  const pedidoAbrigo = ficha.id==='portanova' && (lineas.some(l=>/\bABRIGOS?\b/i.test(l.comentario))
    || lineas.some(l=>l.articulo.trim()==='LONAPLNORECTANG' && /3\s*MM/i.test(l.comentario) && /\d\s*\/\s*\d/.test(l.comentario)));
  for (const l of lineas) {
    const articulo = l.articulo.trim().toUpperCase();
    if (pedidoAbrigo) {
      const parte:ParteAbrigo|undefined = articulo==='LONARECTANGULARO'?'frente':articulo==='LONAPLNORECTANG'?'laterales':
        articulo==='LONASCPVC'?(/580/i.test(l.comentario)?'perimetral':/3\s*MM/i.test(l.comentario)?'tiras':undefined):undefined;
      if (parte) {
        const pares=[...l.comentario.matchAll(/(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+(?:[.,]\d+)?))?\s*(?:CM)?\s*[X×]\s*(\d+(?:[.,]\d+)?)\s*CM\b/gi)];
        const m=pares.length===1?pares[0]:undefined;
        const primero=m?numero(m[1]):0, segundo=m?.[2]?numero(m[2]):0, ancho=m?numero(m[3]):0;
        const frente=parte==='laterales'?Math.max(primero,segundo):parte==='tiras'&&primero===3?ancho:primero;
        const alto=parte==='tiras'?(!m||primero===3?3:ancho):ancho;
        const corto=parte==='laterales'?Math.min(primero,segundo):0;
        const uds=parte==='frente'?l.cantidad*10000/(frente*alto):parte==='laterales'?l.cantidad/2:l.cantidad;
        const cantidad=Number.isFinite(uds)&&Math.abs(uds-Math.round(uds))<0.00001&&uds>=1&&uds<=50?Math.round(uds):0;
        const repartir=(parte==='tiras'||parte==='perimetral')&&!m&&cantidad>0;
        for(let i=0;i<(repartir?cantidad:1);i++) puertas.push({...nuevaPuertaDeCliente('portanova','abrigo'),
          abrigo:{parte,corto},articuloOrigen:'ABRIGO',of:l.of.trim(),frente,alto,
          material:materialesAbrigo[parte],color:'',rollo:parte==='perimetral'?250:160,
          cantidad:repartir?1:cantidad,observaciones:l.comentario});
        if (!m || !cantidad) avisos.push(`Abrigo · OF ${l.of}: comprueba las medidas y las unidades de ${parte} en la hoja.`);
        continue;
      }
      if(articulo==='LONASCPVC') avisos.push(`OF ${l.of}: falta identificar el material de esta línea de abrigo.`);
    }
    if (ficha.id==='portanova' && ['SACOTGM','FUNDA'].includes(articulo)) {
      const texto = `${l.comentario} ${l.descripcion}`.replace(/\s+/g,' ').trim();
      const par = /(\d+(?:[.,]\d+)?)\s*(?:CM)?\s*(?:DE LARGO\s*)?X\s*(\d+(?:[.,]\d+)?)/i.exec(texto)
        ?? /(?:MEDIDAS|MEDIAS)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*CM/i.exec(texto);
      const largo = par?.[1] ?? /(?:MEDIDAS|MEDIAS)\s+(\d+(?:[.,]\d+)?)\s*CM/i.exec(texto)?.[1];
      puertas.push({...nuevaPuertaDeCliente('portanova','saco-confeccionado'),articuloOrigen:'SACOARENA',
        frente:largo?numero(largo):0,alto:par?numero(par[2]):0,cantidad:l.cantidad,of:l.of.trim(),observaciones:[l.articulo,l.descripcion,l.comentario].filter(Boolean).join(' · ')});
      if (!par) avisos.push(`Saco confeccionado · OF ${l.of}: falta el aplastado; compruébalo con el pedido.`);
      if (/DI[AÁ]METRO/i.test(texto)) avisos.push(`Saco confeccionado · OF ${l.of}: RPS dice diámetro. Confirma que ${par?.[2]??'la medida'} cm es el aplastado antes de generar.`);
      continue;
    }
    if(ficha.calculo==='araujo') {
      const p=araujoDesdeRps(l,ficha);
      if(p) { puertas.push(p);avisos.push(`${ficha.nombre}: comprueba en la hoja si son tramos sueltos o lona continua, cantidades, bolsas, perfil de canutillo, ventanas y rollos. RPS solo propone lo escrito.`);continue; }
      if(articulo.startsWith('PUERTA')){avisos.push(`La ficha de ${ficha.nombre} no permite el artículo ${articulo}.`);continue;}
    }
    const sd = lonaSystemDock(l, clienteCodigo);
    if (sd) { puertas.push(sd); continue; }
    if (!articulo.startsWith('PUERTA')) continue;
    const tipo=ficha.tipos.find(t=>t.id===ficha.articulos[articulo]);
    if (!tipo) {
      avisos.push(`Línea ${articulo} (tramo o pieza suelta): no es una puerta completa, se hace aparte.`);
      continue;
    }
    const texto = `${l.descripcion} ${l.comentario}`.replace(/\s+/g, ' ').trim();
    const medidas = /MEDIDAS?\s+(\d+(?:[.,]\d+)?)\s*(?:CM)?\s*X\s*(\d+(?:[.,]\d+)?)/i.exec(texto);
    const color = /COLOR\s+([A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ]+)*\s+\d{4})/i.exec(texto);
    const cantidad = Number.isInteger(l.cantidad) && l.cantidad >= 1 && l.cantidad <= 50 ? l.cantidad : 1;
    const base = ficha.calculo==='santapau'||ficha.calculo==='tgm' ? nuevaPuertaDeCliente(ficha.id,tipo.id) : nuevaPuerta(tipo.modelo);
    puertas.push({
      ...base,
      clientePuertas:ficha.id,tipoPuerta:tipo.id,...ficha.rollos,
      articuloOrigen: articulo as ModeloPuerta,
      frente: medidas ? numero(medidas[1]) : 0,
      alto: medidas ? numero(medidas[2]) : 0,
      color: color ? color[1].toUpperCase() : ficha.calculo==='santapau'?(/COLOR\s+(BLANC[OA]|ROJ[OA]|VERDE|AZUL|GRIS|NEGRO|AMARILL[OA])\b/i.exec(texto)?.[1].toUpperCase()??''):'',
      cantidad,
      of: l.of.trim(),
      observaciones: l.comentario.trim(),
      ...(base.tgm&&/\blona\s+(?:de\s+)?rejilla\b/i.test(texto)?{material:'REJILLA',tgm:{...base.tgm,lona:'rejilla' as const}}:{}),
      ...(ficha.calculo==='santapau'&&/IGN[IÍ]FUGA?\s+M2/i.test(texto)?{material:'LAC900 IGNÍFUGA M2'}:{}),
    });
  }
  return { puertas, avisos };
}

// «LONA PERIMETRAL 10400X550 (ESTANDAR)»: largo × ancho en milímetros (o en cm si el texto lo dice). El código del
// artículo no da el largo (A110212700550-10 se ha usado para 1142 y para 1180): manda el texto de la línea.
function lonaSystemDock(l: LineaPuertaRps, clienteCodigo: string): Puerta | null {
  const texto = `${l.descripcion} ${l.comentario}`.replace(/\s+/g, ' ').trim();
  if (!/LONA PERIMETRAL/i.test(texto) || (clienteCodigo.trim() && clienteCodigo.trim() !== CODIGO_SYSTEM_DOCK)) return null;
  const medida = /(\d+(?:[.,]\d+)?)\s*(CM)?\s*X\s*(\d+(?:[.,]\d+)?)\s*(CM)?/i;
  const m = medida.exec(l.descripcion) ?? medida.exec(texto);
  // La unidad es la del par: sin «CM» y con un largo de más de 2000 (las lonas miden de 8 a 15 m), milímetros.
  const enMm = Boolean(m) && !(m![2] || m![4]) && numero(m![1]) >= 2000;
  const cm = (v: string) => (enMm ? numero(v) / 10 : numero(v));
  const cantidad = Number.isInteger(l.cantidad) && l.cantidad >= 1 && l.cantidad <= REGLAS_SYSTEM_DOCK.maxUnidades ? l.cantidad : 1;
  return {
    ...nuevaPuerta('SYSTEMDOCK'),
    articuloOrigen: 'SYSTEMDOCK',
    frente: m ? cm(m[1]) : 0,
    alto: m ? cm(m[3]) : 0,
    material: REGLAS_SYSTEM_DOCK.material, color: REGLAS_SYSTEM_DOCK.color, rollo: REGLAS_SYSTEM_DOCK.rollo,
    ventanasConfirmadas: true,
    cantidad,
    of: l.of.trim(),
    observaciones: [l.articulo.trim(), l.descripcion.trim(), l.comentario.trim()].filter(Boolean).join(' · '),
  };
}
