import type { AvisoPuerta, Entrada, Hueco, ModeloPuerta, PiezaPuerta, Puerta, ResultadoPuerta } from './tipos.ts';
import { repartirPanos, type RepartoPanos } from './empates.ts';
import { marcasBolsillo } from './bolsillo.ts';
import { numerarBorde } from './unionesCorte.ts';

export const MODELOS_PUERTAS: Record<ModeloPuerta, string> = { PUERTAENR: 'Enrollable', PUERTAPLE: 'Apilable', PUERTAUTO: 'Autorreparable' };
export const REGLAS_ENROLLABLE = { solapeEntrada:7.5, corteEntrada:8, unionNormal:2 };
const n = (x: number) => Math.round(x * 10000) / 10000;
const positivo = (x: number) => Number.isFinite(x) && x > 0 && x <= 3000;
const numero = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 });
export function nuevaPuerta(modelo: ModeloPuerta = 'PUERTAENR'): Puerta {
  return { modelo, articuloOrigen:'', frente: 0, alto: 0, of: '', cantidad: 1, margenMarcas:1.5, confirmada: false, ventanasConfirmadas: false, bolsillo:false, medidasBolsillo:{distancia:20,ancho:30,lado:'izquierdo',altoSuperior:null},
    material: 'LAC900', color: '', materialCristal: 'TRANSP. 1000MI', materialSaco: 'LAC900 NEGRO', sacoDiagonalesAmarillas: false,
    rollo: 0, rolloCristal: 0, rolloSaco: 0, observaciones: '', entradas: [], ventanas: [],
    enrollable: { T: 0, D: 60, margen: 0, empates: [] },
    apilable: { pie: 0, pasos: [], cabecera: 0, bolsillo: 24, saco: null, doble: false, empates: null },
    autorreparable: { empates: [] } };
}
export function alturasTubos(p: Puerta): number[] {
  let y = p.apilable.pie;
  return [y, ...p.apilable.pasos.map(paso => (y = n(y + paso)))];
}
export function huecosEntrada(largo: number, diametro: 30 | 42, cintas: number[] = []): Hueco[] {
  const alto = diametro === 42 ? 13.5 : 12, h = diametro === 42 ? 9.5 : 7.5;
  return [{ x: 1, y: (alto - h) / 2, ancho: 5, alto: h, radio: 0.5 },
    { x: largo - 6, y: (alto - h) / 2, ancho: 5, alto: h, radio: 0.5 },
    ...cintas.map(x => ({ x, y: (alto - h) / 2, ancho: 12, alto: h, radio: 0.5 }))];
}
const seCruzan = (a: Hueco, b: Hueco) => a.x < b.x + b.ancho - 0.001 && b.x < a.x + a.ancho - 0.001 && a.y < b.y + b.alto - 0.001 && b.y < a.y + a.alto - 0.001;

export function calcularPuerta(p: Puerta): ResultadoPuerta {
  const piezas: PiezaPuerta[] = [], avisos: AvisoPuerta[] = [];
  const aviso = (codigo: string, texto: string, nivel: 'error' | 'aviso' = 'error') => { if (!avisos.some(a => a.codigo === codigo && a.texto === texto)) avisos.push({ codigo, texto, nivel }); };
  const r: ResultadoPuerta = { version: 1, piezas, alternativasSaco: null, empates: [], uniones:[], bolsillo:null, avisos };
  if (!p.confirmada) aviso('MODELO', 'Confirma el modelo mirando el dibujo del cliente.');
  if(p.articuloOrigen && p.articuloOrigen!==p.modelo)aviso('ARTICULO_MODELO',`RPS indica ${p.articuloOrigen} y has elegido ${MODELOS_PUERTAS[p.modelo].toLowerCase()}. Manda el dibujo del cliente; confirma el modelo.`, 'aviso');
  if (!positivo(p.frente) || !positivo(p.alto)) aviso('MEDIDAS', 'Introduce frente y alto positivos, en centímetros.');
  if (!Number.isInteger(p.cantidad) || p.cantidad < 1 || p.cantidad > 50) aviso('CANTIDAD', 'La cantidad debe ser un entero entre 1 y 50.');
  if (!positivo(p.rollo)) aviso('ROLLO', 'Introduce el ancho real del rollo de lona.');
  if (!p.material.trim() || !p.color.trim()) aviso('MATERIAL', 'Confirma material y color de la lona.');
  if (!p.ventanasConfirmadas) aviso('VENTANAS', 'Confirma las ventanas del dibujo o marca puerta ciega.');
  if (!p.of.trim() || p.of.trim().toUpperCase()==='SIN OF') aviso('SIN_OF', 'SIN OF: solo vista previa; hace falta OF antes de escribir cualquier archivo.', 'aviso');
  if (p.modelo === 'PUERTAPLE' && /enrollable|varilla\s+superior/i.test(p.observaciones)) aviso('TEXTO_MODELO', 'El texto dice enrollable o varilla superior: revisa el modelo con el dibujo del cliente.', 'aviso');
  if (/rejilla|mosquitera|antivand[aá]lica|franja corrida|recambio/i.test(p.observaciones)) aviso('FUERA_FASE', 'El texto describe una variante pendiente de despiece específico.');
  if (avisos.some(a => ['MEDIDAS', 'CANTIDAD'].includes(a.codigo))) return r;
  const ancho = p.frente + (p.modelo === 'PUERTAPLE' && p.frente > 600 ? 2 : 0);
  const lateral = (ancho - p.frente) / 2;
  if (lateral) aviso('ESCUADRADO', 'Frente mayor de 6 m: se añade 1 cm por cada lado para escuadrar.', 'aviso');
  const lona = `${p.material.trim()} ${p.color.trim()}`.trim();
  function pieza(nombre: string, clase: PiezaPuerta['clase'], w: number, h: number, material = lona, rollo = p.rollo, cantidad = 1): PiezaPuerta {
    return { id: `${clase}-${piezas.length}-${nombre}`, nombre, clase, ancho: n(w), alto: n(h), material, rollo, cantidad: cantidad * p.cantidad,
      of: p.of.trim() || 'SIN OF', radio: 0, contorno: [[0,0],[n(w),0],[n(w),n(h)],[0,n(h)]], marcas: [], textos: [], huecos: [] };
  }
  const agregar = (x: PiezaPuerta) => { piezas.push(x); return x; };
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
    paneles.push({ pieza: x, desde, hasta }); return x;
  }
  function reparto(plan:RepartoPanos,nombre:string) {
    if(plan.error) aviso('EMPATE',plan.error);
    const numeros = plan.uniones.map(() => ++numeroUnion);
    for(const [i,t] of plan.tramos.entries()) {
      const x=panel(`${nombre}${plan.tramos.length>1?` ${i+1}`:''}`,t.desde,t.hasta);
      if(t.unionInferior!==undefined) {
        const u=plan.uniones[t.unionInferior];
        if(u.tubo) marca(x,u.solape,-1); else marca(x,u.solape);
        numerarBorde(x,numeros[t.unionInferior],'abajo');
      }
      if(t.unionSuperior!==undefined) {
        const u=plan.uniones[t.unionSuperior];
        if(!u.tubo) marca(x,x.alto-u.solape);
        numerarBorde(x,numeros[t.unionSuperior],'arriba');
        if(u.tubo) x.huecos.push(...(p.entradas[u.tubo-1]?.huecos??[]).map(h=>({...h,y:n(x.alto-u.solape+h.y)})));
      }
    }
  }
  function entrada(e: Entrada, i: number) {
    const alto=p.modelo==='PUERTAENR'?REGLAS_ENROLLABLE.corteEntrada:e.alto;
    const x = agregar(pieza(`Entrada de tubo ${i + 1}`, 'entrada', e.largo, alto));
    x.huecos = e.huecos.map(h => ({ ...h }));
    x.origenAlzado = [0, e.altura - alto / 2];
  }
  function sacoConPestana(w: number, h: number, pestana: number, altoPestana: number, desde: number, nombre = 'Saco') {
    const x = pieza(nombre, 'saco', w + pestana, h, p.materialSaco, p.rolloSaco);
    x.contorno = [[pestana,0],[w+pestana,0],[w+pestana,h],[pestana,h],[pestana,desde+altoPestana],[0,desde+altoPestana],[0,desde],[pestana,desde]];
    return x;
  }
  if (p.modelo === 'PUERTAENR') {
    const e = p.enrollable, ventanales=[{D:e.D,margen:e.margen},...e.ventanales??[]];
    const altoVentanales=ventanales.reduce((s,v)=>s+v.D,0), inferior = n(p.alto - e.T - altoVentanales - 7.25);
    if (!positivo(e.T) || ventanales.some(v=>!positivo(v.D)||v.D<=7.5||!positivo(v.margen)||2*v.margen>=p.frente) || e.T + altoVentanales >= p.alto) aviso('VENTANAL', 'Revisa T, las distancias entre ejes y los márgenes de cada ventanal.');
    const incorporadas=new Set<number>();
    for (const [nombre,h,origen] of [['superior',e.T+7.25,p.alto-e.T-3.75],['inferior',inferior,11]] as const) {
      const manual=e.empates.filter(u=>u.pano===nombre);
      const tubos=p.entradas.map((t,i)=>({eje:t.altura-origen,solape:REGLAS_ENROLLABLE.solapeEntrada,tubo:i+1}));
      const plan=repartirPanos({desde:0,hasta:h,frente:ancho,rollo:p.rollo,tubos,normal:true,indicados:manual.length?manual.map(u=>({eje:u.altura,solape:u.solape,tubo:u.tubo})):undefined});
      const antes=paneles.length;
      reparto(plan,`Paño ${nombre}`);
      r.uniones.push(...plan.uniones.map(u=>({altura:u.eje+origen,solape:u.solape,tubo:u.tubo})));
      plan.uniones.forEach(u=>{if(u.tubo)incorporadas.add(u.tubo);});
      // El origen del tramo se conserva también para el alzado y las ventanas de la futura ficha.
      const grupo=paneles.slice(antes);
      for(const panel of grupo) {panel.desde+=origen;panel.hasta+=origen;}
      const marcarEn=(y:number,dir?:1|-1)=>{const panel=grupo.find(t=>y>=t.desde&&y<=t.hasta);if(panel)marca(panel.pieza,y-panel.desde,dir);};
      marcarEn(origen+(nombre==='superior'?7.5:2),nombre==='superior'?-1:undefined);
      marcarEn(origen+h-(nombre==='superior'?7:7.5),nombre==='inferior'?1:undefined);
      for(const [i,t] of p.entradas.entries()) {
        if(plan.uniones.some(u=>u.tubo===i+1))continue;
        const y=t.altura-REGLAS_ENROLLABLE.solapeEntrada/2;
        if(y>origen+7.5 && y<origen+h-(nombre==='superior'?7:7.5)-.001)marcarEn(y,1);
      }
    }
    if(ventanales.length===1) {
      agregar(pieza('Cristal del ventanal', 'cristal', p.frente-2*e.margen+4, e.D-3.5, p.materialCristal,p.rolloCristal));
      agregar(pieza('Cachos laterales', 'cacho', e.margen+1,e.D-3.5,lona,p.rollo,2));
    } else {
      // AR2605065 (A) y AR2605038 (D): los cachos son piezas sueltas, no huecos de un paño entero.
      const separaciones:Array<{delantera:PiezaPuerta;trasera:PiezaPuerta}>=[];
      let eje=p.alto-e.T;
      for(let i=0;i<ventanales.length-1;i++) {
        eje=n(eje-ventanales[i].D);
        const crear=(cara:string)=>{
          const x=agregar(pieza(`Entrada entre ventanales ${i+1} · ${cara}`,'entrada',p.frente,REGLAS_ENROLLABLE.corteEntrada));
          x.origenAlzado=[0,eje-REGLAS_ENROLLABLE.corteEntrada/2]; return x;
        };
        const delantera=crear('delantera'),trasera=crear('trasera');
        separaciones.push({delantera,trasera});
        p.entradas.forEach((t,j)=>{if(Math.abs(t.altura-eje)<.001)incorporadas.add(j+1);});
      }
      const superior=paneles.find(t=>t.desde<=p.alto-e.T-3.75+.001&&t.hasta>p.alto-e.T)!;
      const abajo=p.alto-e.T-altoVentanales;
      const inferior=paneles.find(t=>t.desde<abajo&&t.hasta>=abajo+3.75-.001)!;
      for(const [i,v] of ventanales.entries()) {
        agregar(pieza(`Cristal del ventanal ${i+1}`,'cristal',p.frente-2*v.margen+4,v.D-3.5,p.materialCristal,p.rolloCristal));
        for(const [lado,nombre] of ['izquierdo','derecho'].entries()) {
          const cacho=agregar(pieza(`Cacho ${nombre} · ventanal ${i+1}`,'cacho',v.margen+1,v.D-3.5));
          cacho.origenAlzado=[lado===0?-1:p.frente-v.margen,p.alto-e.T-ventanales.slice(0,i+1).reduce((s,v)=>s+v.D,0)+1.75];
          const x=lado===0?4:cacho.ancho-4;
          const punto=(destino:PiezaPuerta,numero:number,y:number,xc=lado===0?4:destino.ancho-4)=>{
            destino.unionesCorte=[...destino.unionesCorte??[],{x:xc,y,numero}];
          };
          const arriba=++numeroUnion,abajo=++numeroUnion;
          punto(cacho,arriba,cacho.alto-1,x);punto(cacho,abajo,1,x);
          if(i===0&&superior)punto(superior.pieza,arriba,1);
          // En la E.T. del medio solo se numera la delantera; la de detrás no hace falta (Iván, 22/10/2026).
          else if(i>0)punto(separaciones[i-1].delantera,arriba,1);
          if(i===ventanales.length-1&&inferior)punto(inferior.pieza,abajo,inferior.pieza.alto-1);
          else if(i<separaciones.length)punto(separaciones[i].delantera,abajo,REGLAS_ENROLLABLE.corteEntrada-1);
        }
      }
    }
    if(e.sacoPartido){
      const mitad=(p.frente+6.5+2)/2;
      const izquierda=agregar(sacoConPestana(mitad-6.5,26,6.5,11,13,'Saco partido · con pestaña'));
      const derecha=agregar(pieza('Saco partido · sin pestaña','saco',mitad,26,p.materialSaco,p.rolloSaco));
      numerarBorde(izquierda,++numeroUnion,'derecha');
      numerarBorde(derecha,numeroUnion,'izquierda');
    }else agregar(sacoConPestana(p.frente,26,6.5,11,13));
    p.entradas.forEach((e,i)=>{if(!incorporadas.has(i+1))entrada(e,i);});
  } else if (p.modelo === 'PUERTAPLE') {
    const a = p.apilable, alturas = alturasTubos(p);
    if (!positivo(a.pie) || !positivo(a.cabecera) || a.pasos.some(x => !positivo(x)) || Math.abs(alturas.at(-1)!+a.cabecera-p.alto) > 0.05) aviso('CADENA', `Pie, pasos y cabecera suman ${numero(alturas.at(-1)!+a.cabecera)} cm; deben sumar ${numero(p.alto)} cm.`);
    if (!a.saco) aviso('SACO', 'Elige saco útil de 80 o 120 según el dibujo.');
    if(a.doble && a.saco!==80) aviso('SACO_DOBLE','El doble saco lleva el saco normal de 80 integrado y un envoltorio aparte.');
    if (p.entradas.length !== alturas.length) aviso('ENTRADAS', 'Introduce una entrada por cada tubo de la cadena.');
    if (!positivo(a.bolsillo)) aviso('BOLSILLO', 'Confirma el bolsillo superior del dibujo.');
    const bajo = a.doble ? -13.5 : a.saco === 120 ? 12 : 11;
    const arriba = p.alto + a.bolsillo / 2;
    const entradaEn = (i: number) => p.entradas[i-1]?.alto ?? 12;
    let empates = a.empates===null?null:[...a.empates];
    if (empates && (new Set(empates).size !== empates.length || empates.some((v,i) => !Number.isInteger(v) || v<1 || v>alturas.length || (i>0 && v<=(a.empates??[])[i-1])))) {
      aviso('EMPATE', 'Los tubos de empate deben existir, estar ordenados y no repetirse.');
      empates=[];
    }
    const tubos=alturas.map((eje,i)=>({eje,solape:entradaEn(i+1),tubo:i+1}));
    const plan=repartirPanos({desde:bajo,hasta:arriba,frente:ancho,rollo:p.rollo,tubos,indicados:empates?.map(t=>tubos[t-1])});
    reparto(plan,'Paño'); empates=plan.uniones.flatMap(u=>u.tubo?[u.tubo]:[]); r.empates=empates;
    r.uniones.push(...plan.uniones.map(u=>({altura:u.eje,solape:u.solape,tubo:u.tubo})));
    for (const [i,e] of p.entradas.entries()) {
      if (!empates.includes(i+1)) entrada(e,i);
      const esperado = e.diametro === 42 ? 13.5 : 12;
      if (Math.abs(e.alto-esperado)>0.01) aviso('DIAMETRO', `Tubo ${i+1}: Ø${e.diametro} propone entrada de ${numero(esperado)} cm; revisa la excepción de ${numero(e.alto)} cm.`, 'aviso');
      for (const panel of paneles) {
        const y = alturas[i]-e.alto/2-panel.desde;
        if (y>=0 && y<=panel.pieza.alto && !empates.includes(i+1)) marca(panel.pieza,y,1);
      }
    }
    const ultimo = paneles.at(-1)!.pieza;
    ultimo.marcas.push([1.5,ultimo.alto-a.bolsillo,ancho-1.5,ultimo.alto-a.bolsillo]);
    const h = a.doble ? 37 : a.saco === 120 ? 32 : 30;
    const w = a.doble ? p.frente-6 : ancho;
    const pestana = a.doble ? 12 : 10, altoPestana = a.doble ? 14 : a.saco === 120 ? 14 : 13;
    const entero = sacoConPestana(w,h,pestana,altoPestana,2,a.doble?'Envoltorio del doble saco':'Saco');
    if(a.doble) {
      entero.textos.push({x:pestana+2,y:5,valor:'CENTRAR EL SACO · DOBLAR A LA MITAD · SOLDAR 2 CM'});
      paneles[0].pieza.textos.push({x:ancho/2,y:15,valor:'SACO NORMAL INTEGRADO · VELCRO REVÉS 5 BRAVO / DERECHO 5 SUAVE'});
    }
    if (/negro|9005|\bblack\b/i.test(p.color)) { entero.material=lona; entero.rollo=p.rollo; agregar(entero); }
    else {
      const izquierdo = sacoConPestana(w/2+1,h,pestana,altoPestana,2,a.doble?'Envoltorio partido · con pestaña':'Saco partido · con pestaña');
      const derecho = pieza(a.doble?'Envoltorio partido · sin pestaña':'Saco partido · sin pestaña','saco',w/2+1,h,p.materialSaco,p.rolloSaco);
      numerarBorde(izquierdo,++numeroUnion,'derecha');
      numerarBorde(derecho,numeroUnion,'izquierda');
      r.alternativasSaco = { entero: [entero], partido: [izquierdo,derecho] };
    }
    if (a.doble) aviso('DOBLE_SACO', 'Doble saco: saco normal de 80 integrado en el paño y envoltorio aparte (F − 6) × 37, centrado al ancho, doblado a la mitad y soldado 2 cm. Pestaña 12 × 14; velcro de 5 bravo al revés y suave al derecho. Cerrar E.T. 2 cm máximo.', 'aviso');
  } else {
    const empates = p.autorreparable.empates;
    const plan=repartirPanos({desde:12,hasta:p.alto+3.5,frente:ancho,rollo:p.rollo,normal:true,indicados:empates.length?empates.map(eje=>({eje:eje+12,solape:2})):undefined});
    reparto(plan,'Paño'); r.uniones.push(...plan.uniones.map(u=>({altura:u.eje,solape:u.solape})));
    for(const {pieza:x,desde,hasta} of paneles) {
      for(const distancia of [3.5,20,30]) {
        const y=p.alto-distancia;
        if(y>=desde && y<=hasta) marca(x,y-desde);
      }
      if(desde===12) marca(x,2);
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
    agregar(pieza('Saco de 120','saco',p.frente,32,p.materialSaco,p.rolloSaco));
  }
  for (const [i,v] of p.ventanas.entries()) {
    if (p.modelo === 'PUERTAENR') { aviso('VENTANA_MODELO','El ventanal sencillo ya define el cristal: las ventanas individuales requieren otro perfil.'); break; }
    if (v.x < 0 || v.x+v.ancho>p.frente || v.y<0 || v.y+v.alto>p.alto) aviso('VENTANA_FRENTE',`Ventana ${i+1}: no cabe dentro del frente o del alto.`);
    comprobarHueco(v,p.frente,p.alto,`Ventana ${i+1}`);
    if (p.ventanas.slice(0,i).some(o => seCruzan(o,v))) aviso('VENTANAS_SOLAPADAS',`Ventana ${i+1}: se solapa con otra ventana.`);
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
  for (const [i,e] of p.entradas.entries()) {
    if (!positivo(e.largo) || !positivo(e.alto) || !Number.isFinite(e.altura) || e.altura<0 || e.altura>p.alto) aviso('ENTRADA',`Entrada ${i+1}: revisa largo, alto y cota.`);
    for (const [j,h] of e.huecos.entries()) {
      comprobarHueco(h,e.largo,e.alto,`Entrada ${i+1}`);
      if (e.huecos.slice(0,j).some(o => seCruzan(o,h))) aviso('HUECOS_SOLAPADOS',`Entrada ${i+1}: hay huecos que se solapan.`);
    }
  }
  if(p.bolsillo) {
    const b=p.medidasBolsillo,arriba=b.altoSuperior??18;
    if(!Number.isFinite(arriba)) aviso('BOLSILLO_COTA','Revisa la altura del bolsillo desde el bajo terminado.');
    else {
      const destino=paneles.find(t=>arriba>=t.desde && arriba<=t.hasta);
      const x=b.lado==='izquierdo'?b.distancia:p.frente-b.distancia-b.ancho;
      if(!positivo(b.ancho)||!Number.isFinite(b.distancia)||b.distancia<0||x<0||x+b.ancho>p.frente || arriba<17 || arriba>p.alto || !destino || arriba-destino.desde<.5) aviso('BOLSILLO_COTA','El bolsillo no cabe en esa posición: revisa distancia, ancho y altura del dibujo.');
      else {
        destino.pieza.marcas.push(...marcasBolsillo(b,p.frente,destino.desde,lateral));
        r.bolsillo={x,y:arriba-17,ancho:b.ancho,alto:17};
      }
    }
  }
  const todas = [...piezas,...(r.alternativasSaco?.entero??[]),...(r.alternativasSaco?.partido??[])];
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
