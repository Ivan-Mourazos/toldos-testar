import type { AvisoPuerta, PiezaPuerta, Puerta, ResultadoPuerta, TramoAraujo, ExtremoAraujo } from './tipos.ts';
import { fichaPorId, fichaDePuerta } from './clientes.ts';

export const ARTICULOS_TRAMOS_ARAUJO = ['PUERTAPLET', 'PUERTAPLETRA', 'PUERTAPLETRAM'] as const;
/** Perfiles confirmados por Iván (03/11/2026); el habitual es el de 7. */
export const PERFILES_ARAUJO = fichaPorId('araujo')!.perfiles;
export const nuevoTramoAraujo = (tipo: TramoAraujo['tipo'] = 'tramo'): TramoAraujo =>
  ({ tipo, frente: 0, alto: 0, cantidad: 1, ventanas: [] });
const n = (x: number) => Math.round(x * 10000) / 10000;

export function elegirPerfilAraujo(p:Puerta,perfil:string):Puerta {
  if(!p.araujo||!Object.hasOwn(fichaDePuerta(p).perfiles,perfil))throw new Error('Elige un perfil de canutillo de la ficha del cliente.');
  return {...p,confirmada:false,ventanasConfirmadas:false,araujo:{...p.araujo,perfil}};
}
const positivo = (x: number) => Number.isFinite(x) && x > 0 && x <= 3000;

/** Distancias medidas en el 5733: E.T. de extremo, referencia a su ancho y rotulador al doble. */
export function medidasTramoAraujo(t:TramoAraujo,perfil:{aumento:number;marca:number}) {
  const extremo=(e?:ExtremoAraujo)=>e?.tipo==='et'?{referencia:e.ancho,marca:2*e.ancho}:{referencia:perfil.aumento/2,marca:perfil.marca};
  const arriba=extremo(t.arriba),abajo=extremo(t.abajo);
  return {arriba,abajo,alto:Math.round((t.alto+arriba.referencia+abajo.referencia)*10000)/10000};
}
export function calcularAraujo(p: Puerta): ResultadoPuerta {
  const piezas: PiezaPuerta[] = [], avisos: AvisoPuerta[] = [];
  const r: ResultadoPuerta = { version: 1, piezas, avisos, alternativasSaco: null, empates: [], uniones: [], bolsillo: null };
  const aviso = (codigo: string, texto: string, nivel: AvisoPuerta['nivel'] = 'error') => avisos.push({ codigo, texto, nivel });
  const a = p.araujo!, perfil = fichaDePuerta(p).perfiles[a.perfil];
  if (!p.confirmada || !p.ventanasConfirmadas) aviso('CONFIRMACION', 'Comprueba en la hoja los tramos, las bolsas, las ventanas y el perfil de canutillo; después marca «Confirmado con el dibujo».');
  if (!['PUERTAENR', 'PUERTAPLE'].includes(p.modelo)) aviso('MODELO', 'El planteamiento de Araujo sirve para enrollables, plegables y sus tramos o bolsas.');
  if (!p.of.trim() || p.of.trim().toUpperCase() === 'SIN OF') aviso('SIN_OF', 'Falta la OF para guardar archivos.', 'aviso');
  if (!Number.isInteger(p.cantidad) || p.cantidad < 1 || p.cantidad > 50) aviso('CANTIDAD', 'La cantidad de conjuntos debe estar entre 1 y 50.');
  if (!p.material.trim() || !p.color.trim()) aviso('MATERIAL', 'Faltan el material o el color de la lona.');
  if (![p.rollo, p.rolloCristal, p.rolloSaco].every(positivo)) aviso('ROLLO', 'Completa los anchos reales de los rollos de lona, transparente y bolsa.');
  if (!perfil || !a.tramos.length) { aviso('TRAMOS', 'Añade los tramos o bolsas y elige un perfil de canutillo comprobado.'); return r; }
  if(perfil.aviso)aviso('PERFIL_COMB',perfil.aviso,'aviso');
  if (a.forma === 'continua' && a.tramos.filter(t => t.tipo === 'tramo').length !== 1) aviso('CONTINUA', 'La lona continua lleva un único cuerpo con su alto total, más las bolsas separadas.');
  if (a.forma === 'sueltos' && p.entradas.length) aviso('ENTRADAS', 'Los tramos sueltos ya llevan sus dos canutillos. Quita las entradas intermedias de la lona continua.');
  if (/REJILLA|MOSQUITERA|MALLA/i.test(p.observaciones)) aviso('MATERIAL_ESPECIAL', 'El material especial necesita su propio planteamiento: este corte está contrastado para lona de PVC.');
  function pieza(nombre: string, clase: PiezaPuerta['clase'], ancho: number, alto: number, cantidad: number, bolsa = false): PiezaPuerta {
    return { id: `araujo-${piezas.length}-${nombre}`, nombre, clase, ancho: n(ancho), alto: n(alto), cantidad: cantidad * p.cantidad,
      material: bolsa ? p.materialSaco.trim() : `${p.material.trim()} ${p.color.trim()}`.trim(), rollo: bolsa ? p.rolloSaco : p.rollo,
      of: p.of.trim() || 'SIN OF', contorno: [[0,0],[n(ancho),0],[n(ancho),n(alto)],[0,n(alto)]], radio: 0, marcas: [], textos: [], huecos: [] };
  }
  let unidades = 0;
  for (const [i, t] of a.tramos.entries()) {
    const nombre = `${t.tipo === 'bolsa' ? 'Bolsa' : a.forma === 'continua' ? 'Cuerpo continuo' : 'Tramo'} ${i + 1}`;
    if (!positivo(t.frente) || !positivo(t.alto) || !Number.isInteger(t.cantidad) || t.cantidad < 1 || t.cantidad > 50) { aviso('TRAMO', `${nombre}: faltan medidas válidas o cantidad entre 1 y 50.`); continue; }
    unidades += t.cantidad * p.cantidad;
    const bolsa = t.tipo === 'bolsa';
    if (bolsa && !p.materialSaco.trim()) aviso('BOLSA', 'Indica el material y el color de la bolsa.');
    if([t.arriba,t.abajo].some(e=>e&&(!['canutillo','et'].includes(e.tipo)||e.tipo==='et'&&!positivo(e.ancho)))){aviso('EXTREMO',nombre+': indica el ancho de cada E.T. del pedido.');continue;}
    const medidas=medidasTramoAraujo(t,perfil),inferior=medidas.abajo.referencia;
    const x = pieza(nombre, bolsa ? 'saco' : 'pano', t.frente, medidas.alto, t.cantidad, bolsa);
    if(t.of?.trim())x.of=t.of.trim();
    if(t.material?.trim())x.material=t.material.trim();
    if(a.corteTrasImprimir&&!bolsa){
      x.sinGiro=true;x.material+=' · Impresa';
      if(x.alto>x.rollo)aviso('IMPRESA_EMPATE',nombre+': el alto no cabe atravesado en el rollo después de imprimir. Oficina Técnica debe comprobar el reparto y el empate de esta presentación.');
    }
    if(medidas.arriba.marca+medidas.abajo.marca>=x.alto)aviso('EXTREMO',nombre+': las marcas de los extremos se cruzan; revisa alto y ancho de E.T.');
    if (Math.min(x.ancho, x.alto) > x.rollo) aviso('NO_CABE', `${nombre}: no cabe en el rollo; hace falta estudiar su reparto antes de cortar.`);
    const margen = p.margenMarcas;
    if (!Number.isFinite(margen) || margen < 0 || margen * 2 >= t.frente) aviso('MARGEN', `${nombre}: revisa el margen de las marcas.`);
    x.marcas = [[margen, medidas.abajo.marca, n(t.frente - margen), medidas.abajo.marca], [margen, n(x.alto - medidas.arriba.marca), n(t.frente - margen), n(x.alto - medidas.arriba.marca)]];
    piezas.push(x);
    for(const [j,e] of (t.entradas??[]).entries()){
      const y=n(inferior+e.altura-e.ancho/2);
      if(!positivo(e.ancho)||!Number.isFinite(e.altura)||e.altura<=0||e.altura>=t.alto||y<medidas.abajo.marca||y+e.ancho>x.alto-medidas.arriba.marca
        ||e.huecoLibre!==undefined&&!positivo(e.huecoLibre)
        ||t.entradas!.slice(0,j).some(q=>Math.abs(q.altura-e.altura)<(q.ancho+e.ancho)/2)
        ||t.ventanas.some(v=>v.y-2<e.altura+e.ancho/2&&v.y+v.alto+2>e.altura-e.ancho/2)){
        aviso('ENTRADA',nombre+', E.T. '+(j+1)+': revisa eje, ancho y separación de extremos, ventanas y otras E.T.');continue;
      }
      const et=pieza(nombre+' · E.T. '+(j+1),'entrada',t.frente,e.ancho,t.cantidad,bolsa);et.of=x.of;if(t.material?.trim())et.material=t.material.trim();
      if(Math.min(et.ancho,et.alto)>et.rollo)aviso('NO_CABE',nombre+': la E.T. no cabe en el rollo.');
      piezas.push(et);x.marcas.push([margen,y,n(t.frente-margen),y]);
    }
    for (const [j, v] of t.ventanas.entries()) {
      const campos = [v.x,v.y,v.ancho,v.alto,v.radio,v.radioCristal];
      const libreAbajo=medidas.abajo.marca-inferior,libreArriba=medidas.arriba.marca-medidas.arriba.referencia;
      if (!campos.every(Number.isFinite) || !positivo(v.ancho) || !positivo(v.alto) || v.radio < 0 || v.radioCristal < 0 || v.radio * 2 > Math.min(v.ancho,v.alto) || v.radioCristal * 2 > Math.min(v.ancho+4,v.alto+4)
        || v.x < 2 || v.x + v.ancho + 2 > t.frente || v.y-2 < libreAbajo || v.y + v.alto + 2 > t.alto-libreArriba) {
        aviso('VENTANA', `${nombre}, ventana ${j + 1}: revisa posición, radio y los 2 cm de solape del cristal.`); continue;
      }
      if (t.ventanas.slice(0,j).some(w=>v.x < w.x+w.ancho+4 && w.x < v.x+v.ancho+4 && v.y < w.y+w.alto+4 && w.y < v.y+v.alto+4)) aviso('VENTANAS', `${nombre}: los cristales de las ventanas se solapan.`);
      x.huecos.push({ ...v, y: n(v.y + inferior) });
      const c = pieza(`Cristal ${i + 1}.${j + 1}`, 'cristal', v.ancho+4, v.alto+4, t.cantidad);
      c.of=x.of;
      c.material = p.materialCristal.trim(); c.rollo = p.rolloCristal; c.radio = v.radioCristal;
      if (!c.material || Math.min(c.ancho,c.alto) > c.rollo) aviso('CRISTAL', `${nombre}: comprueba el material y el ancho del rollo del cristal.`);
      piezas.push(c);
    }
    if (t.rotulacion) {
      if (!positivo(t.rotulacion.ancho) || t.rotulacion.desdeDerecha < 0 || !Number.isFinite(t.rotulacion.desdeDerecha) || t.rotulacion.ancho+t.rotulacion.desdeDerecha > t.frente || !t.rotulacion.texto.trim()) aviso('ROTULACION', `${nombre}: revisa el ancho y la distancia de la rotulación por el derecho.`);
      if(!t.rotulacion.centrada&&t.rotulacion.desdeBajo!==undefined&&(!Number.isFinite(t.rotulacion.desdeBajo)||t.rotulacion.desdeBajo<0||t.rotulacion.desdeBajo>=t.alto))aviso('ROTULACION',`${nombre}: la distancia de rotulación al bajo debe quedar dentro de la pieza.`);
    }
  }
  if (unidades > 100) aviso('CANTIDAD', 'Como máximo se calculan 100 tramos y bolsas por conjunto de corte.');
  if (a.forma === 'continua') {
    const cuerpo = a.tramos.find(t=>t.tipo==='tramo');
    for (const [i,e] of p.entradas.entries()) {
      if (!cuerpo || !positivo(e.alto) || !positivo(e.largo) || !Number.isFinite(e.altura) || e.altura <= 0 || e.altura >= cuerpo.alto || e.huecos.length) { aviso('ENTRADA', `Entrada ${i+1}: indica eje, largo y alto de corte comprobados; los recortes especiales necesitan estudio.`); continue; }
      if(Math.min(e.alto,e.largo)>p.rollo)aviso('NO_CABE',`Entrada ${i+1}: no cabe en el rollo de lona.`);
      if(p.entradas.slice(0,i).some(t=>Math.abs(t.altura-e.altura)<(t.alto+e.alto)/2))aviso('ENTRADA',`Entrada ${i+1}: se solapa con otra entrada.`);
      if((cuerpo.entradas??[]).some(q=>Math.abs(q.altura-e.altura)<(q.ancho+e.alto)/2))aviso('ENTRADA',`Entrada ${i+1}: se solapa con otra E.T. del cuerpo.`);
      if(cuerpo.ventanas.some(v=>v.y-2<e.altura+e.alto/2&&v.y+v.alto+2>e.altura-e.alto/2))aviso('ENTRADA',`Entrada ${i+1}: invade un cristal del cuerpo.`);
      const entrada=pieza(`Entrada ${i+1}`, 'entrada', e.largo, e.alto, cuerpo.cantidad);
      if(cuerpo.of?.trim())entrada.of=cuerpo.of.trim();
      if(cuerpo.material?.trim())entrada.material=cuerpo.material.trim();
      piezas.push(entrada);
      const cuerpoCorte = piezas.find(x=>x.clase==='pano');
      const m=medidasTramoAraujo(cuerpo,perfil);
      const y = n(e.altura + m.abajo.referencia - e.alto/2);
      if (y < m.abajo.marca || y + e.alto > m.alto-m.arriba.marca) aviso('ENTRADA', `Entrada ${i+1}: invade un canutillo de los extremos.`);
      cuerpoCorte?.marcas.push([p.margenMarcas,y,cuerpo.frente-p.margenMarcas,y]);
    }
  }
  return r;
}
