import type { AvisoPuerta, Entrada, Hueco, ModeloPuerta, PiezaPuerta, Puerta, ResultadoPuerta } from './tipos.ts';
import { ROLLOS_PORTANOVA } from './clientePortanova.ts';
import { repartirPanos, type RepartoPanos } from './empates.ts';
import { marcasBolsillo } from './bolsillo.ts';
import { numerarBorde } from './unionesCorte.ts';
import { calcularSystemDock } from './systemDock.ts';
import { calcularAbrigo } from './abrigo.ts';
import { calcularSacoArena, REGLAS_SACO_ARENA } from './sacoArena.ts';
import { calcularAraujo } from './araujo.ts';
import { calcularBelts } from './belts.ts';
import { calcularPuertasLuz } from './puertasluz.ts';
import { calcularSantaPau } from './santapau.ts';
import { abajoRejillaTgm, calcularTgm, envoltorioTgm } from './tgm.ts';
import { fichaDePuerta } from './clientes.ts';
import { anchoCristalVentanal, EXTRA_CACHO_VENTANAL, panoContinuoEnrollable, SOLAPE_VENTANAL, ventanalesEnrollable } from './ventanalesEnrollable.ts';
import { ventanalesApilable } from './ventanalesApilable.ts';
import { flechaEmpate } from './marcasEmpate.ts';
import { ensancharPieza, huecosSinEscuadrado, llevaEscuadrado } from './escuadrado.ts';
import { bajoDobleSaco, desnivelSuelo, envoltorioDobleSaco, espejarPieza, inclinarSaco, pestanaDerecha, sacoApilable, sacoPuerta, sacoUtil, utilSacoExterior } from './saco.ts';

export const MODELOS_PUERTAS: Record<ModeloPuerta, string> = { PUERTAENR: 'Enrollable', PUERTAPLE: 'Apilable', PUERTAUTO: 'Autorreparable', SYSTEMDOCK: 'System Dock', ABRIGO: 'Abrigo', SACOARENA: 'Saco confeccionado' };
export const REGLAS_ENROLLABLE = { solapeEntrada:7.5, corteEntrada:8, unionNormal:2 };
export function solapeEntradaEnrollable(p: Puerta): number {
  return p.tgm?.lona === 'pvc' ? p.tgm.anchoEt : REGLAS_ENROLLABLE.solapeEntrada;
}
const n = (x: number) => Math.round(x * 10000) / 10000;
const positivo = (x: number) => Number.isFinite(x) && x > 0 && x <= 3000;
const numero = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 });
// Los rollos de Portanova para todas las puertas, también las que se empiezan a mano (Iván, 25/10/2026).
export function nuevaPuerta(modelo: ModeloPuerta = 'PUERTAENR'): Puerta {
  return { modelo, articuloOrigen:'', frente: 0, alto: 0, of: '', cantidad: 1, margenMarcas:1.5, confirmada: false, ventanasConfirmadas: false, bolsillo:false, medidasBolsillo:{distancia:0,ancho:0,lado:'izquierdo',altoSuperior:null},
    material: 'LAC900', color: '', materialCristal: 'TRANSP. 1000MI', materialSaco: 'LAC900 NEGRO', sacoDiagonalesAmarillas: false,
    ...ROLLOS_PORTANOVA, ...(modelo==='ABRIGO'?{abrigo:{parte:'frente' as const,corto:0},material:'LONA 3 MM',color:'NEGRO',rollo:160,ventanasConfirmadas:true}:{}), ...(modelo==='SACOARENA'?{material:REGLAS_SACO_ARENA.material,color:REGLAS_SACO_ARENA.color,rollo:REGLAS_SACO_ARENA.rollo,ventanasConfirmadas:true}:{}), observaciones: '', entradas: [], ventanas: [],
    enrollable: { T: 0, D: 60, margen: 0, empates: [], saco: 120 },
    apilable: { pie: 0, pasos: [], cabecera: 0, bolsillo: 24, saco: null, doble: false, empates: null },
    autorreparable: { empates: [], saco: 120 } };
}
/** Lo que sobresale la E.T. por cada lado del frente (apilables de más de 6 m: 1 cm). Las cintas se miden desde
 * el borde de la puerta; en la E.T. van desplazadas esta cantidad. */
export function desfaseCintas(e: Pick<Entrada, 'largo'>, frente: number): number {
  const d = (e.largo - frente) / 2;
  return Number.isFinite(d) && d > 0 && d < 5 ? n(d) : 0;
}
export function alturasTubos(p: Puerta): number[] {
  let y = p.apilable.pie;
  return [y, ...p.apilable.pasos.map(paso => (y = n(y + paso)))];
}
/** Altura desde abajo de una ventana centrada en el tramo entre el tubo n y el n + 1, o null si ese tramo no existe. */
export function yEnTramo(p: Puerta, tramo: number, alto: number): number | null {
  const t = p.modelo === 'PUERTAENR' ? p.entradas.map(e => e.altura) : alturasTubos(p);
  if (!Number.isInteger(tramo) || tramo < 1 || tramo >= t.length) return null;
  return n((t[tramo - 1] + t[tramo]) / 2 - alto / 2);
}
export function huecosEntrada(largo: number, diametro: 30 | 42, cintas: number[] = [], altoEt?: number): Hueco[] {
  const alto = altoEt ?? (diametro === 42 ? 13.5 : 12), h = diametro === 42 ? 9.5 : 7.5;
  return [{ x: 1, y: (alto - h) / 2, ancho: 5, alto: h, radio: 0.5 },
    { x: largo - 6, y: (alto - h) / 2, ancho: 5, alto: h, radio: 0.5 },
    ...cintas.map(x => ({ x, y: (alto - h) / 2, ancho: 12, alto: h, radio: 0.5 }))];
}
const seCruzan = (a: Hueco, b: Hueco) => a.x < b.x + b.ancho - 0.001 && b.x < a.x + a.ancho - 0.001 && a.y < b.y + b.alto - 0.001 && b.y < a.y + a.alto - 0.001;

export function calcularPuerta(p: Puerta): ResultadoPuerta {
  if (p.modelo === 'ABRIGO') return calcularAbrigo(p);
  if (p.modelo === 'SACOARENA') return calcularSacoArena(p);
  if(p.clientePuertas&&!fichaDePuerta(p).habilitado)return {version:1,piezas:[],alternativasSaco:null,empates:[],uniones:[],bolsillo:null,avisos:[{codigo:'CLIENTE_SIN_REGLAS',nivel:'error',texto:fichaDePuerta(p).aviso??'Falta contrastar las reglas de este cliente.'}]};
  if (p.araujo) return calcularAraujo(p);
  if (p.santapau) return calcularSantaPau(p);
  if (p.belts) return calcularBelts(p);
  if (p.puertasluz) return calcularPuertasLuz(p);
  if (p.tgm) return calcularTgm(p, calcularPuertaDerivada);
  if (p.modelo === 'SYSTEMDOCK') return calcularSystemDock(p);
  return calcularPuertaDerivada(p);
}

/** Calcula las piezas de una puerta con sus cotas y entradas ya resueltas. */
export function calcularPuertaDerivada(p: Puerta): ResultadoPuerta {
  const piezas: PiezaPuerta[] = [], avisos: AvisoPuerta[] = [];
  const aviso = (codigo: string, texto: string, nivel: 'error' | 'aviso' = 'error') => { if (!avisos.some(a => a.codigo === codigo && a.texto === texto)) avisos.push({ codigo, texto, nivel }); };
  const r: ResultadoPuerta = { version: 1, piezas, alternativasSaco: null, empates: [], uniones:[], bolsillo:null, avisos };
  const sinSaco = p.modelo === 'PUERTAENR' && p.enrollable.sinSaco;
  const rejilla = p.modelo === 'PUERTAENR' && p.tgm?.lona === 'rejilla';
  if (!p.confirmada) aviso('MODELO', 'Falta marcar «Confirmado con el dibujo»: comprueba el modelo, las medidas y las ventanas con el dibujo del cliente.');
  if (!sinSaco && (p.modelo==='PUERTAENR'||p.modelo==='PUERTAUTO') && sacoUtil(p)===null) aviso('SACO', 'Falta el saco útil del pedido (en mm: 80, 110, 120…).');
  if(p.articuloOrigen && p.articuloOrigen!==p.modelo)aviso('ARTICULO_MODELO',`En RPS pone ${p.articuloOrigen} pero has elegido ${MODELOS_PUERTAS[p.modelo].toLowerCase()}: mira en el dibujo del cliente cuál es.`, 'aviso');
  if (!positivo(p.frente) || !positivo(p.alto)) aviso('MEDIDAS', 'Faltan el frente y el alto de la puerta (en cm).');
  if (!Number.isInteger(p.cantidad) || p.cantidad < 1 || p.cantidad > 50) aviso('CANTIDAD', 'La cantidad de puertas iguales tiene que ser un número entero entre 1 y 50.');
  if (!positivo(p.rollo)) aviso('ROLLO', 'Falta el ancho del rollo de lona (en «Materiales y rollos»).');
  if (!p.material.trim() || !p.color.trim()) aviso('MATERIAL', 'Faltan el material o el color de la lona.');
  // Con la casilla única las dos van juntas; solo un pedido guardado antes puede tener una sin la otra.
  if (p.confirmada && !p.ventanasConfirmadas) aviso('VENTANAS', 'Falta confirmar las ventanas con el dibujo (o que la puerta es ciega).');
  if (!p.of.trim() || p.of.trim().toUpperCase()==='SIN OF') aviso('SIN_OF', 'Sin OF: se puede ver y revisar, pero no se guardan archivos hasta poner la OF.', 'aviso');
  if (p.modelo === 'PUERTAPLE' && /enrollable|varilla\s+superior/i.test(p.observaciones)) aviso('TEXTO_MODELO', 'El texto del pedido habla de enrollable o de varilla superior: comprueba en el dibujo que es apilable.', 'aviso');
  const franjaApilable = p.modelo === 'PUERTAPLE' && Boolean(p.apilable.ventanales?.length);
  if ((!rejilla && /rejilla/i.test(p.observaciones)) || (!franjaApilable && /franja corrida/i.test(p.observaciones))
    || /mosquitera|antivand[aá]lica|recambio/i.test(p.observaciones)) aviso('FUERA_FASE', 'El texto del pedido pide algo que la web todavía no despieza (rejilla, mosquitera, antivandálica…): hazlo a mano.');
  if (avisos.some(a => ['MEDIDAS', 'CANTIDAD'].includes(a.codigo))) return r;
  const bastilla = p.tgm?.laterales === 'bastilla' ? p.tgm.bastilla ?? 0 : 0;
  const envoltorio = envoltorioTgm(p);
  if (p.tgm?.laterales === 'bastilla' && !positivo(bastilla)) aviso('TGM_BASTILLA', 'Introduce la bastilla por lado en el pedido.');
  if (p.tgm && p.tgm.abajo !== 'saco' && p.tgm.soldadura !== undefined && !positivo(p.tgm.soldadura ?? 0))
    aviso('TGM_SOLDADURA', 'Introduce una soldadura del último tubo mayor que cero.');
  if (envoltorio && (envoltorio.bajoLona < 0.5 || !positivo(envoltorio.terminado) ||
      envoltorio.bajoLona + p.tgm!.diametroTubo / 10 > envoltorio.terminado ||
      envoltorio.alto < 16 || p.frente <= 6 || envoltorio.terminado + envoltorio.soldadura >= p.alto))
    aviso('TGM_ENVOLTORIO', 'Revisa el saco terminado. El tubo debe caber bajo la raya del cierre con al menos 5 mm libres sobre el doblez. Comprueba también el espacio para la pestaña y la soldadura.');
  if (avisos.some(a => ['TGM_BASTILLA', 'TGM_ENVOLTORIO', 'TGM_SOLDADURA'].includes(a.codigo))) return r;
  const escuadrado = llevaEscuadrado(p);
  const ancho = p.frente + (!escuadrado && p.modelo === 'PUERTAPLE' && p.frente > 600 ? 2 : 0);
  const lateral = (ancho - p.frente) / 2;
  if (lateral || escuadrado) aviso('ESCUADRADO', 'Frente mayor de 6 m: se añade 1 cm por cada lado para escuadrar.', 'aviso');
  const lona = `${p.material.trim()} ${p.color.trim()}`.trim();
  const materialEntrada = rejilla ? `${p.tgm!.materialEt} ${p.color.trim()}`.trim() : lona;
  // Puerta negra (9005) con saco negro: es el mismo material, así que el saco se corta en la lona de la puerta, entero y
  // sin la alternativa en dos (Iván, 20/11/2026, AR2605669). Antes solo lo hacían las apilables.
  const esNegro = (texto: string) => /negro|9005|\bblack\b/i.test(texto);
  const sacoEnLona = esNegro(p.color) && esNegro(p.materialSaco);
  const materialSaco = sacoEnLona ? lona : p.materialSaco, rolloSaco = sacoEnLona ? p.rollo : p.rolloSaco;
  function pieza(nombre: string, clase: PiezaPuerta['clase'], w: number, h: number, material = lona, rollo = p.rollo, cantidad = 1): PiezaPuerta {
    return { id: `${clase}-${piezas.length}-${nombre}`, nombre, clase, ancho: n(w), alto: n(h), material, rollo, cantidad: cantidad * p.cantidad,
      of: p.of.trim() || 'SIN OF', radio: 0, contorno: [[0,0],[n(w),0],[n(w),n(h)],[0,n(h)]], marcas: [], textos: [], huecos: [] };
  }
  const agregar = (x: PiezaPuerta) => { piezas.push(x); return x; };
  // Las cintas (recortes centrales) se escriben desde el borde de la puerta, como en el dibujo del cliente, y
  // su lado derecho es simétrico respecto al frente. Si la E.T. es más larga que el frente (apilables de más
  // de 6 m: 1 cm por lado para escuadrar), se pasan a la E.T. sumando esa mitad. Sin esto, en el AR2605391
  // (864, E.T. 866) la cinta de la izquierda quedaba a 29 del borde de la E.T. y la de la derecha a 31.
  const huecosET = (e: Entrada): Hueco[] => escuadrado ? huecosSinEscuadrado(e, p.frente) : e.huecos.map(h => {
    const extremo = h.x <= 1.01 ? 'izquierda' as const : h.x + h.ancho >= e.largo - 1.01 ? 'derecha' as const : null;
    return extremo ? { ...h, abierto: extremo } : { ...h, x: n(h.x + desfaseCintas(e, p.frente)) };
  });
  function marca(x:PiezaPuerta,y:number,direccion?:1|-1) {
    y=n(y); const m=p.margenMarcas;
    if(y<0||y>x.alto) return;
    if(x.marcas.some(s=>Math.abs(s[1]-y)<.001&&Math.abs(s[3]-y)<.001&&Math.abs(s[2]-s[0])>x.ancho/2))return;
    x.marcas.push([m,y,x.ancho-m,y]);
    if(direccion){const cx=x.ancho/2,base=n(y+direccion),punta=n(base+direccion*1.53205);
      x.marcas.push([cx,y,cx,base],[cx-.8,base,cx+.8,base],[cx-.8,base,cx,punta],[cx,punta,cx+.8,base]);
    }
  }
  function comprobarHueco(v: Hueco, w: number, h: number, nombre: string) {
    if (![v.x,v.y,v.ancho,v.alto,v.radio].every(Number.isFinite) || !positivo(v.ancho) || !positivo(v.alto) || v.radio < 0 || 2 * v.radio > Math.min(v.ancho,v.alto) || v.x < 0 || v.y < 0 || v.x + v.ancho > w + 0.01 || v.y + v.alto > h + 0.01) aviso('HUECO', `${nombre}: hueco o radio fuera de la pieza.`);
  }
  const paneles: Array<{ pieza: PiezaPuerta; desde: number; hasta: number }> = [];
  let numeroUnion = 0;
  function panel(nombre: string, desde: number, hasta: number) {
    const x = agregar(pieza(nombre, 'pano', ancho, hasta - desde));
    x.origenAlzado = [-lateral, desde];
    if (p.modelo === 'PUERTAENR' && p.enrollable.ventanasPequenas) x.rotulosEnHueco = true;
    paneles.push({ pieza: x, desde, hasta }); return x;
  }
  // Apilables y enrollables: el empate en una E.T. va como en las apilables (Iván, 06/11/2026, AR2605429).
  const etUne=p.modelo==='PUERTAPLE'||p.modelo==='PUERTAENR';
  function reparto(plan:RepartoPanos,nombre:string) {
    if(plan.error) aviso('EMPATE',plan.error);
    const numeros = plan.uniones.map(() => ++numeroUnion);
    for(const [i,t] of plan.tramos.entries()) {
      const x=panel(`${nombre}${plan.tramos.length>1?` ${i+1}`:''}`,t.desde,t.hasta);
      if(t.unionInferior!==undefined) {
        const u=plan.uniones[t.unionInferior];
        if(u.tubo) marca(x,u.solape,-1);
        else { marca(x,u.solape); x.marcas.push(...flechaEmpate(x.ancho/2,u.solape,-1)); }
        // Apilable: en un tubo la E.T. ya une los dos paños y no lleva mininúmeros (Iván, 23/10/2026, AR2605035).
        if(!(u.tubo && etUne)) numerarBorde(x,numeros[t.unionInferior],'abajo');
      }
      if(t.unionSuperior!==undefined) {
        const u=plan.uniones[t.unionSuperior];
        // Iván, 27/10/2026: en los empates normales se marca solo el paño superior; abajo quedan los mininúmeros.
        if(!(u.tubo && etUne)) numerarBorde(x,numeros[t.unionSuperior],'arriba');
        if(u.tubo && p.entradas[u.tubo-1]) x.huecos.push(...huecosET(p.entradas[u.tubo-1]).map(h=>({...h,y:n(x.alto-u.solape+h.y)})));
        // Apilable: la E.T. que va dentro del paño se rotula en él, para que no parezca que falta (Iván, 23/10/2026).
        if(u.tubo && etUne) (x.entradasIncorporadas??=[]).push({tubo:u.tubo,y:n(x.alto-u.solape/2),alto:u.solape});
      }
    }
  }
  // La E.T. de TGM se corta al ancho del pedido y se suelda 2-3 cm arriba y abajo, con el tubo en el centro (Q-TGM03).
  const corteEt = p.modelo === 'PUERTAENR' ? p.enrollable.anchoEt ?? REGLAS_ENROLLABLE.corteEntrada : 0;
  function entrada(e: Entrada, i: number) {
    const alto=p.modelo==='PUERTAENR'?corteEt:e.alto;
    const x = agregar(pieza(`Entrada de tubo ${i + 1}`, 'entrada', e.largo - (escuadrado ? 2 : 0), alto, materialEntrada));
    x.huecos = huecosET(e);
    x.origenAlzado = [0, e.altura - alto / 2];
    return x;
  }
  function numerarCacho(cacho: PiezaPuerta, otra: PiezaPuerta, x: number) {
    const [ax, ay] = cacho.origenAlzado!, [bx, by] = otra.origenAlzado!;
    const y = n((Math.max(ay, by) + Math.min(ay + cacho.alto, by + otra.alto)) / 2);
    const numero = ++numeroUnion;
    for (const [destino, ox, oy] of [[cacho, ax, ay], [otra, bx, by]] as const)
      (destino.unionesCorte ??= []).push({ x: n(x - ox), y: n(y - oy), numero });
  }
  function sacoConPestana(w: number, h: number, pestana: number, altoPestana: number, desde: number, nombre = 'Saco') {
    const x = pieza(nombre, 'saco', w + pestana, h, materialSaco, rolloSaco);
    x.contorno = [[pestana,0],[w+pestana,0],[w+pestana,h],[pestana,h],[pestana,desde+altoPestana],[0,desde+altoPestana],[0,desde],[pestana,desde]];
    return x;
  }
  if (p.modelo === 'PUERTAENR') {
    const e = p.enrollable, ventanales=ventanalesEnrollable(p);
    const solapeEt = solapeEntradaEnrollable(p);
    const altoVentanales=ventanales.reduce((s,v)=>s+v.D,0), s = sacoPuerta(p);
    // Sin saco, se corta lona por debajo del bajo terminado para doblarla y soldarla alrededor del tubo (Q-TGM04).
    const bajoRejilla = abajoRejillaTgm(p);
    const origenInferior = bajoRejilla ? bajoRejilla.bajoLona
      : sinSaco ? (envoltorio?.bajoLona ?? 0) - (e.cierreBajo ?? 0) : s.rematado;
    // La E.T. que no lleva el ventanal, arriba o abajo (Iván, 27/10/2026, AR2605247): ni se corta ni se marca.
    const ciega=panoContinuoEnrollable(p);
    const etVentanal=(t:Entrada)=>!ciega&&(Boolean(e.sinEtArriba)&&Math.abs(t.altura-(p.alto-e.T))<.01
      ||Boolean(e.sinEtAbajo)&&Math.abs(t.altura-(p.alto-e.T-altoVentanales))<.01);
    // El paño inferior arranca en el rematado del saco, lo libre (13 con el de 120), y acaba donde siempre; el saco
    // sube 2 más para la soldadura (Iván, 24/10/2026).
    const bordeSuperior = p.alto - e.T - (e.sinEtArriba ? 0 : 3.75);
    const bordeInferior = p.alto - e.T - altoVentanales + (e.sinEtAbajo ? 0 : 3.75);
    const inferior = n(bordeInferior - origenInferior);
    if (!ciega && (!positivo(e.T) || ventanales.some(v=>!positivo(v.D)||v.altoVisible<=0||!positivo(v.margen)||2*v.margen>=p.frente) || e.T + altoVentanales >= p.alto)) aviso('VENTANAL', 'Revisa T, las cotas de los ventanales y los márgenes laterales.');
    // Las E.T. de los bordes del ventanal salen de «Entradas de tubo», no de T y D: si falta alguna, la web cortaba
    // menos E.T. de las que lleva la puerta sin avisar (AR2605639: solo la de 60, faltaban las de 131 y 191).
    if (!ciega && !rejilla && positivo(e.T)) {
      // Las de entre ventanales las pone la web (delantera y trasera); las de arriba y abajo, el pedido.
      // Iván, 19/11/2026: obligatorias, y el alzado y el plano solo dibujan las que están metidas.
      const bordes=[...e.sinEtArriba?[]:[n(p.alto-e.T)],...e.sinEtAbajo?[]:[n(p.alto-e.T-altoVentanales)]];
      const faltan=bordes.filter(y=>!p.entradas.some(t=>Math.abs(t.altura-y)<=1));
      if(faltan.length)aviso('ET_FALTA',`Falta la E.T. del ventanal con el eje a ${faltan.map(y=>numero(y)).join(' y ')} cm (alto − T y − D): añádela en «Entradas de tubo» o escribe los tramos del dibujo. Si no lleva, marca «Sin E.T.».`);
    }
    const incorporadas=new Set<number>();
    // Sin ventanal, un solo paño del rematado del saco a la cabecera (Iván, 06/11/2026, AR2605429).
    const panos=ciega
      ? [['inferior',n(p.alto+3.5-origenInferior),origenInferior]] as const
      : [['superior',p.alto+3.5-bordeSuperior,bordeSuperior],['inferior',inferior,origenInferior]] as const;
    for (const [nombre,h,origen] of panos) {
      // En rejilla los paños se reparten por el ancho del rollo, con la unión normal de 2 cm.
      const manual=rejilla?[]:e.empates.filter(u=>u.pano===nombre);
      const tubos=rejilla?[]:p.entradas.map((t,i)=>({eje:t.altura-origen,solape:solapeEt,tubo:i+1})).filter(t=>!etVentanal(p.entradas[t.tubo-1]));
      const indicados = manual.map(u => {
        // En PVC TGM, un empate en la E.T. sigue la posición y el ancho actuales del tubo.
        const tubo = p.tgm?.lona === 'pvc' && u.tubo ? tubos.find(t => t.tubo === u.tubo) : undefined;
        return tubo ?? { eje: u.altura, solape: u.solape, tubo: u.tubo };
      });
      const plan=repartirPanos({desde:0,hasta:h,frente:ancho + 2 * bastilla,rollo:p.rollo,tubos,normal:true,indicados:indicados.length?indicados:undefined});
      const antes=paneles.length;
      reparto(plan,ciega?'Paño':`Paño ${nombre}`);
      r.uniones.push(...plan.uniones.map(u=>({altura:u.eje+origen,solape:u.solape,tubo:u.tubo})));
      plan.uniones.forEach(u=>{if(u.tubo)incorporadas.add(u.tubo);});
      // El origen del tramo se conserva también para el alzado y las ventanas de la futura ficha.
      const grupo=paneles.slice(antes);
      // También en el dibujo: sin esto los mininúmeros de los paños salían contados desde el bajo de la puerta (27/10/2026).
      for(const panel of grupo) {panel.desde+=origen;panel.hasta+=origen;panel.pieza.origenAlzado=[-lateral,panel.desde];}
      const marcarEn=(y:number,dir?:1|-1)=>{const panel=grupo.find(t=>y>=t.desde&&y<=t.hasta);if(panel)marca(panel.pieza,y-panel.desde,dir);};
      if(nombre==='inferior') {
        if(!sinSaco) marcarEn(origen + 2);
        else if(e.marcaCierre!==undefined) marcarEn(origen + e.marcaCierre);
      }
      else if(!e.sinEtArriba) marcarEn(origen + 7.5, -1);
      // Sin ventanal, la raya de arriba es la de la cabecera, como en el paño superior.
      if(ciega) marcarEn(origen+h-7);
      else if(nombre==='superior'||!e.sinEtAbajo) marcarEn(origen+h-(nombre==='superior'?7:7.5),nombre==='inferior'?1:undefined);
      for(const [i,t] of p.entradas.entries()) {
        if(plan.uniones.some(u=>u.tubo===i+1)||etVentanal(t))continue;
        const y=t.altura-solapeEt/2;
        if(y>origen+7.5 && y<origen+h-(nombre==='superior'||ciega?7:7.5)-.001)marcarEn(y,1);
      }
    }
    if(ventanales.length===1) {
      agregar(pieza('Cristal del ventanal', 'cristal', anchoCristalVentanal(p.frente,e.margen), ventanales[0].altoCorte, p.materialCristal,p.rolloCristal));
      agregar(pieza('Cachos laterales', 'cacho', e.margen+EXTRA_CACHO_VENTANAL,ventanales[0].altoCorte,lona,p.rollo,2));
    } else if (ventanales.length > 1) {
      // AR2605065 (A) y AR2605038 (D): los cachos son piezas sueltas, no huecos de un paño entero.
      const separaciones:Array<{delantera:PiezaPuerta;trasera:PiezaPuerta}>=[];
      let eje=p.alto-e.T;
      for(let i=0;i<ventanales.length-1;i++) {
        eje=n(eje-ventanales[i].D);
        const crear=(cara:string)=>{
          const x=agregar(pieza(`Entrada entre ventanales ${i+1} · ${cara}`,'entrada',p.frente,corteEt));
          x.origenAlzado=[0,eje-corteEt/2]; return x;
        };
        const delantera=crear('delantera'),trasera=crear('trasera');
        separaciones.push({delantera,trasera});
        p.entradas.forEach((t,j)=>{if(Math.abs(t.altura-eje)<.001)incorporadas.add(j+1);});
      }
      const superior=paneles.find(t=>t.desde<=bordeSuperior+.001&&t.hasta>bordeSuperior)!;
      const inferior=paneles.find(t=>t.desde<bordeInferior&&t.hasta>=bordeInferior-.001)!;
      for(const [i,v] of ventanales.entries()) {
        agregar(pieza(`Cristal del ventanal ${i+1}`,'cristal',anchoCristalVentanal(p.frente,v.margen),v.altoCorte,p.materialCristal,p.rolloCristal));
        for(const [lado,nombre] of ['izquierdo','derecho'].entries()) {
          const cacho=agregar(pieza(`Cacho ${nombre} · ventanal ${i+1}`,'cacho',v.margen+EXTRA_CACHO_VENTANAL,v.altoCorte));
          cacho.origenAlzado=[lado===0?-1:p.frente-v.margen,n(p.alto-v.corteHasta)];
          // Cada pareja de mininúmeros en el mismo punto de la puerta (Iván, 27/10/2026: «no quedan exactos»): a 4 cm del
          // borde de la puerta, no del de cada pieza (el cacho es 1 cm más ancho para escuadrar), y en medio de lo que se
          // solapan las dos piezas. Antes el del cacho quedaba 1 cm hacia fuera y, en la E.T. del medio, 0,25 desplazado.
          const xPuerta=lado===0?4:p.frente-4;
          // En la E.T. del medio solo se numera la delantera; la de detrás no hace falta (Iván, 22/10/2026).
          const unirArriba=i===0?superior?.pieza:separaciones[i-1].delantera;
          const unirAbajo=i===ventanales.length-1?inferior?.pieza:separaciones[i].delantera;
          if(unirArriba) numerarCacho(cacho,unirArriba,xPuerta);
          else numeroUnion++;
          if(unirAbajo) numerarCacho(cacho,unirAbajo,xPuerta);
          else numeroUnion++;
        }
      }
    }
    if (envoltorio) {
      const w = p.frente - 6, h = envoltorio.alto;
      const entero = sacoConPestana(w, h, 12, 14, h - 16, 'Envoltorio del tubo');
      if (sacoEnLona) agregar(entero);
      else {
        const izquierda = sacoConPestana(w / 2 + 1, h, 12, 14, h - 16, 'Envoltorio partido · con pestaña');
        const derecha = pieza('Envoltorio partido · sin pestaña', 'saco', w / 2 + 1, h, materialSaco, rolloSaco);
        numerarBorde(izquierda, ++numeroUnion, 'derecha');
        numerarBorde(derecha, numeroUnion, 'izquierda');
        r.alternativasSaco = { entero: [entero], partido: [izquierda, derecha] };
      }
    }
    if(!sinSaco){
      const mitad=(p.frente+6.5+2)/2;
      if(e.sacoPartido){
        const izquierda=agregar(sacoConPestana(mitad-6.5,s.corte,6.5,s.altoPestana,s.corte/2,'Saco partido · con pestaña'));
        const derecha=agregar(pieza('Saco partido · sin pestaña','saco',mitad,s.corte,materialSaco,rolloSaco));
        numerarBorde(izquierda,++numeroUnion,'derecha');
        numerarBorde(derecha,numeroUnion,'izquierda');
      }else{
        // El saco entero y, de alternativa, en dos mitades, por si aprovecha mejor el rollo, como en las apilables
        // (Iván, 06/11/2026, AR2605429). Con «saco partido» marcado, solo las dos mitades.
        agregar(sacoConPestana(p.frente,s.corte,6.5,s.altoPestana,s.corte/2));
      }
      if(!e.sacoPartido&&!sacoEnLona){
        const izquierda=sacoConPestana(mitad-6.5,s.corte,6.5,s.altoPestana,s.corte/2,'Saco partido · con pestaña');
        const derecha=pieza('Saco partido · sin pestaña','saco',mitad,s.corte,p.materialSaco,p.rolloSaco);
        numerarBorde(izquierda,++numeroUnion,'derecha');
        numerarBorde(derecha,numeroUnion,'izquierda');
        r.alternativasSaco={entero:[],partido:[izquierda,derecha]};
      }
    }
    // Sin E.T. encima o debajo del ventanal, una entrada a esa altura no se corta: se avisa por si sobra en el pedido.
    if(p.entradas.some(etVentanal))aviso('ET_VENTANAL','Marcado sin E.T. en el ventanal, pero hay una entrada a esa altura: no se corta. Quítala del pedido si sobra.','aviso');
    p.entradas.forEach((t,i)=>{if(!incorporadas.has(i+1)&&!etVentanal(t))entrada(t,i);});
    if (bajoRejilla) {
      // El tubo de abajo va en la E.T. sándwich y el saco, si lo lleva, es de PVC aparte soldado en ella (AR2605499).
      agregar(pieza('E.T. sándwich', 'entrada', p.frente, bajoRejilla.corteSandwich, materialEntrada));
      if (bajoRejilla.corteSaco) agregar(pieza('Saco de PVC', 'entrada', p.frente, bajoRejilla.corteSaco, materialEntrada));
    }
  } else if (p.modelo === 'PUERTAPLE') {
    const a = p.apilable, alturas = alturasTubos(p);
    const suelo = a.sueloInclinado, desnivel = desnivelSuelo(p);
    if (suelo && (!positivo(suelo.altoIzquierdo) || !positivo(suelo.altoDerecho) || Math.abs(suelo.altoIzquierdo-p.alto)>.05))
      aviso('SUELO_ALTOS', 'Revisa los altos izquierdo y derecho; el alto de la cadena debe coincidir con el izquierdo.');
    if (suelo && Math.min(a.pie,a.pie-desnivel)<=0)
      aviso('SUELO_PANO', 'La diferencia de altos se come el paño de abajo: revisa las dos cadenas del pedido.');
    else if (suelo && Math.min(a.pie,a.pie-desnivel)-(p.entradas[0]?.alto??12)/2 <= sacoApilable(p).rematado+2)
      aviso('SUELO_SACO', 'No queda sitio para el saco y su soldadura bajo la primera entrada: revisa los altos.');
    if (!positivo(a.pie) || !positivo(a.cabecera) || a.pasos.some(x => !positivo(x)) || Math.abs(alturas.at(-1)!+a.cabecera-p.alto) > 0.05) aviso('CADENA', `La cadena del dibujo (pie + pasos + cabecera) suma ${numero(alturas.at(-1)!+a.cabecera)} cm y el alto es ${numero(p.alto)} cm: tienen que coincidir.`);
    if (!a.saco) aviso('SACO', 'Falta el saco útil del pedido (en mm: 80, 110, 120…).');
    if(a.doble && utilSacoExterior(p)<=(a.saco??80)) aviso('SACO_DOBLE','El saco exterior del doble saco tiene que ser mayor que el interior (el pedido suele pedir 50 mm más).');
    // Iván, 23/10/2026 (AR2605035): olvidar los recortes de las cintas es grave; si ninguna E.T. los lleva, se avisa.
    const cintas = (e: Entrada) => e.huecos.some(h => h.x > 1.01 && h.x + h.ancho < e.largo - 1.01);
    if(p.entradas.length && !p.entradas.some(cintas)) aviso('CINTAS','Ninguna entrada de tubo lleva recortes de cinta: mira el dibujo y ponlos en «Recortes de cintas».','aviso');
    if (p.entradas.length !== alturas.length) aviso('ENTRADAS', 'Falta una entrada de tubo por cada tubo de la cadena (en «Entradas de tubo y huecos»).');
    if (!positivo(a.bolsillo)) aviso('BOLSILLO', 'Falta el bolsillo superior del dibujo (en «Tubos y saco»).');
    const bajo = a.doble ? bajoDobleSaco(p) : sacoApilable(p).rematado;
    const arriba = p.alto + a.bolsillo / 2;
    const entradaEn = (i: number) => p.entradas[i-1]?.alto ?? 12;
    let empates = a.empates===null?null:[...a.empates];
    if (empates && (new Set(empates).size !== empates.length || empates.some((v,i) => !Number.isInteger(v) || v<1 || v>alturas.length || (i>0 && v<=(a.empates??[])[i-1])))) {
      aviso('EMPATE', 'Los tubos de empate deben existir, estar ordenados y no repetirse.');
      empates=[];
    }
    const { ventanales, avisos: avisosVentanales } = ventanalesApilable(p, alturas);
    avisos.push(...avisosVentanales);
    const tubosVentanal = new Set(ventanales.flatMap(v => [v.tramo, v.tramo + 1]));
    if (empates?.some(t => tubosVentanal.has(t))) {
      aviso('EMPATE_VENTANAL', 'Hay un empate en una E.T. del ventanal. Elige otro tubo en «Otros ajustes».');
      empates = empates.filter(t => !tubosVentanal.has(t));
    }
    const tubos=alturas.map((eje,i)=>({eje,solape:entradaEn(i+1),tubo:i+1})).filter(t=>!tubosVentanal.has(t.tubo));
    // La caja incluye el extremo más bajo; los tubos y empates conservan su cota horizontal.
    const pendiente = desnivel / p.frente;
    const minimoBajo = Math.min(-lateral*pendiente,(ancho-lateral)*pendiente);
    const base = bajo + minimoBajo;
    if (ventanales.length && (ventanales[0].corteDesde <= bajo + Math.max(-lateral*pendiente,(ancho-lateral)*pendiente)
      || ventanales.at(-1)!.corteHasta >= arriba)) {
      aviso('VENTANAL_REMATE', 'El ventanal invade el saco o la cabecera. Revisa las cotas de los tubos.');
    }
    const grupos: Array<{ desde: number; hasta: number; nombre: string }> = [];
    let desde = base;
    for (const [i, v] of ventanales.entries()) {
      // Dos tramos seguidos se encuentran en su E.T. común, sin un paño entre ellos.
      if (ventanales[i-1]?.tramo !== v.tramo - 1 && v.visibleDesde > desde)
        grupos.push({ desde, hasta: v.visibleDesde, nombre: `Paño bajo ventanal ${v.tramo}` });
      desde = v.visibleHasta;
    }
    grupos.push({ desde, hasta: arriba, nombre: ventanales.length ? 'Paño superior' : 'Paño' });
    for (const g of grupos) {
      const plan = repartirPanos({ ...g, frente:ancho, rollo:p.rollo, tubos,
        indicados: empates === null ? undefined : tubos.filter(t => empates?.includes(t.tubo)
          && (!ventanales.length || t.eje > g.desde && t.eje < g.hasta)) });
      reparto(plan, g.nombre);
      r.empates.push(...plan.uniones.flatMap(u => u.tubo ? [u.tubo] : []));
      r.uniones.push(...plan.uniones.map(u => ({ altura:u.eje, solape:u.solape, tubo:u.tubo })));
    }
    empates = r.empates;
    const entradasSueltas = new Map<number, PiezaPuerta>();
    for (const [i,e] of p.entradas.entries()) {
      if (!empates.includes(i+1)) entradasSueltas.set(i+1, entrada(e,i));
      const esperado = e.diametro === 42 ? 13.5 : 12;
      if (Math.abs(e.alto-esperado)>0.01) aviso('DIAMETRO', `Tubo ${i+1}: Ø${e.diametro} propone entrada de ${numero(esperado)} cm; revisa la excepción de ${numero(e.alto)} cm.`, 'aviso');
      for (const panel of paneles) {
        const abreArriba = ventanales.some(v => v.tramo === i && v.visibleHasta === panel.desde);
        const y = alturas[i] + (abreArriba ? e.alto/2 : -e.alto/2) - panel.desde;
        if (y>=0 && y<=panel.pieza.alto && !empates.includes(i+1)) marca(panel.pieza,y,abreArriba ? -1 : 1);
      }
    }
    for (const v of ventanales) {
      p.ventanas.forEach((ventana, i) => {
        if (ventana.y < v.visibleHasta && ventana.y + ventana.alto > v.visibleDesde)
          aviso('VENTANAL_VENTANA', `La ventana individual ${i+1} invade el ventanal del tramo ${v.tramo}. Cambia una de tramo o quítala.`);
      });
      const altoCorte = v.corteHasta - v.corteDesde;
      const cristal = agregar(pieza(`Cristal del ventanal ${v.tramo}`, 'cristal', anchoCristalVentanal(p.frente,v.margen), altoCorte, p.materialCristal, p.rolloCristal));
      cristal.origenAlzado = [v.margen - SOLAPE_VENTANAL, v.corteDesde];
      const arriba = paneles.find(t => t.desde === v.visibleHasta)?.pieza ?? entradasSueltas.get(v.tramo + 1);
      const abajo = paneles.find(t => t.hasta === v.visibleDesde)?.pieza ?? entradasSueltas.get(v.tramo);
      for (const [lado, nombre] of ['izquierdo', 'derecho'].entries()) {
        const cacho = agregar(pieza(`Cacho ${nombre} · ventanal ${v.tramo}`, 'cacho', v.margen + EXTRA_CACHO_VENTANAL, altoCorte));
        cacho.origenAlzado = [lado === 0 ? -EXTRA_CACHO_VENTANAL : p.frente - v.margen, v.corteDesde];
        const distancia = Math.min(4, v.margen / 2);
        const x = lado === 0 ? distancia : p.frente - distancia;
        if (arriba) numerarCacho(cacho, arriba, x);
        if (abajo) numerarCacho(cacho, abajo, x);
      }
    }
    const ultimo = paneles.at(-1)!.pieza;
    ultimo.marcas.push([1.5,ultimo.alto-a.bolsillo,ancho-1.5,ultimo.alto-a.bolsillo]);
    const s = sacoApilable(p);
    // Soldadura del saco en el paño de abajo: sin doble saco, a 2 cm de su borde inferior (Iván, 18/11/2026, AR2605391);
    // con doble saco, el faldón baja rematado + 2 y al doblarse sobre el bajo llega a +(rematado + 2), soldando 2 cm
    // hacia abajo para que quede el rematado exacto: 2 × (rematado + 2) desde el borde de corte (Iván, 23/11/2026, AR2605641).
    const ySoldadura = a.doble ? 2 * (s.rematado + 2) : 2;
    if (desnivel) {
      const primero = paneles[0], x = primero.pieza;
      const bajoEn = (posicion:number) => n(bajo+pendiente*(posicion-lateral)-primero.desde);
      x.contorno = [[0,bajoEn(0)],[ancho,bajoEn(ancho)],[ancho,x.alto],[0,x.alto]];
      const m = p.margenMarcas;
      x.marcas.push([m,bajoEn(m)+ySoldadura,ancho-m,bajoEn(ancho-m)+ySoldadura]);
    } else marca(paneles[0].pieza,ySoldadura);
    // Iván, 23/11/2026 (AR2605641 y plantilla Portanova): la pestaña lateral del cierre se corta aparte en la lona
    // (10 cm de pestaña + 2 cm para soldar en la lona × rematado) para no desperdiciar material en el paño grande.
    if (a.doble) agregar(pieza('Solapa de cierre del saco', 'refuerzo', 12, s.rematado, lona, p.rollo));
    const env = envoltorioDobleSaco(p), h = a.doble ? env.corte : s.corte;
    const w = a.doble ? env.ancho : ancho;
    const pestana = a.doble ? env.pestana : 10, altoPestana = a.doble ? env.altoPestana : s.altoPestana;
    // La pestaña a 2 cm del borde de arriba, como en el dibujo (Iván, 28/10/2026, AR2605035: en el corte salía a 2 del de
    // abajo, el saco volteado). El corte dibuja la pieza con la y hacia arriba.
    // En doble saco el envoltorio exterior es una tira lisa sin pestaña ni velcros (plantilla Portanova y AR2605641).
    const desdePestana = h - 2 - altoPestana;
    const entero = a.doble
      ? pieza('Envoltorio del doble saco', 'saco', w, h, materialSaco, rolloSaco)
      : sacoConPestana(w, h, pestana, altoPestana, desdePestana, 'Saco');
    if (sacoEnLona || esNegro(p.color) && p.sacoDiagonalesAmarillas) { entero.material=lona; entero.rollo=p.rollo; agregar(entero); }
    else {
      const izquierdo = a.doble
        ? pieza('Envoltorio partido · izquierda', 'saco', w / 2 + 1, h, p.materialSaco, p.rolloSaco)
        : sacoConPestana(w / 2 + 1, h, pestana, altoPestana, desdePestana, 'Saco partido · con pestaña');
      const derecho = pieza(a.doble ? 'Envoltorio partido · derecha' : 'Saco partido · sin pestaña', 'saco', w / 2 + 1, h, p.materialSaco, p.rolloSaco);
      numerarBorde(izquierdo,++numeroUnion,'derecha');
      numerarBorde(derecho,numeroUnion,'izquierda');
      r.alternativasSaco = { entero: [entero], partido: [izquierdo,derecho] };
    }
    if (pestanaDerecha(p) && !a.doble) {
      espejarPieza(entero);
      const mitades = r.alternativasSaco?.partido;
      // La mitad con pestaña pasa a la derecha; la lista sigue de izquierda a derecha.
      if (mitades) { mitades.forEach(espejarPieza); mitades.reverse(); }
    }
    if (desnivel) {
      inclinarSaco(entero,pendiente);
      const mitades = r.alternativasSaco?.partido;
      if (mitades) {
        inclinarSaco(mitades[0],pendiente);
        inclinarSaco(mitades[1],pendiente,w/2-1);
      }
    }
    if (a.doble) aviso('DOBLE_SACO', `Doble saco: saco interior de ${a.saco ?? 80} integrado en el paño (solapa aparte de 12 × ${numero(s.rematado)} con velcro de 5 bravo al revés y velcro de 5 suave al derecho en la lona) y envoltorio liso de ${env.util} aparte (F − 6) × ${numero(env.corte)}, centrado al ancho de la puerta. Cerrar E.T. 2 cm máximo.`, 'aviso');
  } else {
    const empates = p.autorreparable.empates;
    // El cuerpo arranca en el rematado del saco (12 con el de 120 antes del 23/10/2026); los empates, desde ahí.
    const s = sacoPuerta(p), r0 = s.rematado;
    const plan=repartirPanos({desde:r0,hasta:p.alto+3.5,frente:ancho,rollo:p.rollo,normal:true,indicados:empates.length?empates.map(eje=>({eje:eje+r0,solape:2})):undefined});
    reparto(plan,'Paño'); r.uniones.push(...plan.uniones.map(u=>({altura:u.eje,solape:u.solape})));
    for(const {pieza:x,desde,hasta} of paneles) {
      for(const distancia of [3.5,20,30]) {
        const y=p.alto-distancia;
        if(y>=desde && y<=hasta) marca(x,y-desde);
      }
      if(desde===r0) marca(x,2);
    }
    // AR2604904: desde DISCO1, no desde los extremos de la raya horizontal.
    const distancia=p.autorreparable.distanciaEspaciador??10;
    if(!Number.isFinite(distancia)||distancia<=0||distancia*2>=ancho) aviso('ESPACIADOR','Revisa la distancia de las rayas laterales al borde según el pedido.');
    else for(const {pieza:x,desde} of paneles) {
      // Las rayas paran 2 cm antes de cada borde y a 30 cm de la cabecera terminada.
      const fin=n(Math.min(x.alto-2,p.alto-30-desde));
      if(fin<=2) continue;
      const posiciones=[distancia,ancho-distancia,...(p.autorreparable.espaciadorCentral?[ancho/2-1.9]:[])];
      for(const posicion of posiciones) x.marcas.push([n(posicion),2,n(posicion),fin]);
    }
    agregar(pieza('Entrada de tubo','entrada',p.frente+11,21));
    agregar(pieza('Entrada de tubo','entrada',p.frente+11,21));
    agregar(pieza(`Saco de ${sacoUtil(p) ?? 120}`,'saco',p.frente,s.corte,materialSaco,rolloSaco));
    // Como en las demás puertas, de alternativa el saco en dos, con 1 cm más cada mitad para soldarlas (Iván, 06/11/2026:
    // «no puede ser que unas pongan el saco de una manera y otras no»).
    if(!sacoEnLona){
      const mitad=p.frente/2+1;
      const izquierda=pieza('Saco partido · izquierda','saco',mitad,s.corte,p.materialSaco,p.rolloSaco);
      const derecha=pieza('Saco partido · derecha','saco',mitad,s.corte,p.materialSaco,p.rolloSaco);
      numerarBorde(izquierda,++numeroUnion,'derecha');
      numerarBorde(derecha,numeroUnion,'izquierda');
      r.alternativasSaco={entero:[],partido:[izquierda,derecha]};
    }
  }
  for (const [i,v] of p.ventanas.entries()) {
    if (p.modelo === 'PUERTAENR' && !p.enrollable.ventanasPequenas) { aviso('VENTANA_MODELO','Elige ventanas pequeñas para introducir huecos individuales en la enrollable.'); break; }
    if (v.x < 0 || v.x+v.ancho>p.frente || v.y<0 || v.y+v.alto>p.alto) aviso('VENTANA_FRENTE',`Ventana ${i+1}: no cabe dentro del frente o del alto.`);
    comprobarHueco(v,p.frente,p.alto,`Ventana ${i+1}`);
    if (p.ventanas.slice(0,i).some(o => seCruzan(o,v))) aviso('VENTANAS_SOLAPADAS',`Ventana ${i+1}: se solapa con otra ventana.`);
    if (p.modelo === 'PUERTAENR') {
      // El cristal solapa 2 cm: tampoco debe invadir las E.T., los empates o los remates.
      const desde = v.y - 2, hasta = v.y + v.alto + 2;
      if (p.entradas.some(e => desde < e.altura + 3.75 && hasta > e.altura - 3.75)) aviso('VENTANA_TUBOS',`Ventana ${i+1}: el cristal invade una entrada de tubo.`);
      if (desde < sacoPuerta(p).rematado + 2 || hasta > p.alto - 3.5 || r.uniones.some(u => desde < u.altura + u.solape / 2 && hasta > u.altura - u.solape / 2)) aviso('VENTANA_EMPATE',`Ventana ${i+1}: el cristal invade un empate o un remate del paño.`);
    }
    if (p.modelo === 'PUERTAPLE') {
      const alturas = alturasTubos(p);
      let inferior = -1;
      alturas.forEach((y,i) => { if (y<=v.y) inferior=i; });
      const superior = inferior+1, e0=p.entradas[inferior]?.alto ?? 12, e1=p.entradas[superior]?.alto ?? 12;
      if (inferior<0 || superior>=alturas.length || v.y<alturas[inferior]+e0/2 || v.y+v.alto>alturas[superior]-e1/2) aviso('VENTANA_TUBOS',`Ventana ${i+1}: el alto o la posición no caben entre sus tubos.`);
    }
    const destino = paneles.find(x => v.y>=x.desde && v.y+v.alto<=x.hasta);
    if (!destino) aviso('VENTANA_EMPATE',`Ventana ${i+1}: cruza un empate o un remate del paño.`);
    else destino.pieza.huecos.push({ ...v,x:v.x+lateral,y:n(v.y-destino.desde) });
    const cristal = agregar(pieza(`Cristal ${i+1}`,'cristal',v.ancho+4,v.alto+4,p.materialCristal,p.rolloCristal));
    cristal.radio=v.radioCristal;
  }
  if (p.modelo === 'PUERTAENR' && p.enrollable.ventanasPequenas && !p.ventanas.length) aviso('VENTANAS', 'Añade las ventanas pequeñas del dibujo o elige puerta ciega.');
  for (const [i,e] of p.entradas.entries()) {
    if (!positivo(e.largo) || !positivo(e.alto) || !Number.isFinite(e.altura) || e.altura<0 || e.altura>p.alto) aviso('ENTRADA',`Entrada ${i+1}: revisa largo, alto y cota.`);
    for (const [j,h] of e.huecos.entries()) {
      comprobarHueco(h,e.largo,e.alto,`Entrada ${i+1}`);
      if (e.huecos.slice(0,j).some(o => seCruzan(o,h))) aviso('HUECOS_SOLAPADOS',`Entrada ${i+1}: hay huecos que se solapan.`);
    }
  }
  // Sin medida propuesta: la del pedido (Iván, 26/10/2026, AR2605035: se quedó el 20 propuesto y el pedido decía 21).
  if(p.bolsillo && (!positivo(p.medidasBolsillo.distancia) || !positivo(p.medidasBolsillo.ancho))) aviso('BOLSILLO_COTA','Faltan la distancia al borde y el ancho del bolsillo: escríbelos como vienen en el pedido.');
  else if(p.bolsillo) {
    const b=p.medidasBolsillo, x=b.lado==='izquierdo'?b.distancia:p.frente-b.distancia-b.ancho;
    // Con el suelo inclinado, la altura cuenta desde el bajo en el sitio del bolsillo, que sube con él (AR2605035).
    const arriba=(b.altoSuperior??18)+desnivelSuelo(p)*(x+b.ancho/2)/p.frente;
    if(!Number.isFinite(arriba)) aviso('BOLSILLO_COTA','Revisa la altura del bolsillo desde el bajo terminado.');
    else {
      const destino=paneles.find(t=>arriba>=t.desde && arriba<=t.hasta);
      if(!positivo(b.ancho)||!Number.isFinite(b.distancia)||b.distancia<0||x<0||x+b.ancho>p.frente || arriba<17 || arriba>p.alto || !destino || arriba-destino.desde<.5) aviso('BOLSILLO_COTA','El bolsillo no cabe en esa posición: revisa distancia, ancho y altura del dibujo.');
      else {
        destino.pieza.marcas.push(...marcasBolsillo({...b,altoSuperior:arriba},p.frente,destino.desde,lateral));
        r.bolsillo={x,y:arriba-17,ancho:b.ancho,alto:17};
      }
    }
  }
  const todas = [...piezas,...(r.alternativasSaco?.entero??[]),...(r.alternativasSaco?.partido??[])];
  if (escuadrado) todas.forEach(x => ensancharPieza(x));
  if (bastilla) for (const { pieza: pano } of paneles) {
    ensancharPieza(pano, bastilla);
    for (const x of [bastilla, pano.ancho - bastilla]) pano.marcas.push([x, 0, x, pano.alto]);
  }
  if(!Number.isFinite(p.margenMarcas)||p.margenMarcas<0||2*p.margenMarcas>=ancho)aviso('MARCAS','Revisa el margen de las marcas respecto al borde.');
  for (const x of todas) {
    if (!positivo(x.ancho) || !positivo(x.alto)) aviso('PIEZA',`${x.nombre}: las medidas de corte deben ser positivas.`);
    if (!positivo(x.rollo)) aviso('ROLLO_MATERIAL',`Introduce el ancho real del rollo de ${x.material}.`);
    else if (Math.min(x.ancho,x.alto)>x.rollo+0.01) aviso('NO_CABE',`${x.nombre}: no cabe en el rollo de ${numero(x.rollo)} cm.`);
    if (!x.material.trim()) aviso('MATERIAL',`${x.nombre}: falta el material.`);
    if (!Number.isFinite(x.radio) || x.radio<0 || 2*x.radio>Math.min(x.ancho,x.alto)) aviso('RADIO',`${x.nombre}: radio de esquina imposible.`);
    if (x.unionesCorte?.some(u=>![u.x,u.y].every(Number.isFinite)||u.x<0||u.x>x.ancho||u.y<0||u.y>x.alto)) aviso('UNION_MARCA',`${x.nombre}: no caben las marcas de unión a 4 cm de las puntas. Revisa el despiece.`);
    x.huecos.forEach(h => comprobarHueco(h,x.ancho,x.alto,x.nombre));
  }
  return r;
}
