import { nuevaPuerta } from '../calcular.ts';
import type { Puerta, TramoAraujo, Ventana } from '../tipos.ts';

export const tramoAraujo = (frente: number, alto: number, cantidad = 1, tipo: TramoAraujo['tipo'] = 'tramo'): TramoAraujo =>
  ({ tipo, frente, alto, cantidad, ventanas: [] });
export const ventanaAraujo = (x: number, y = 30, ancho = 90, alto = 35): Ventana =>
  ({ x, y, ancho, alto, radio: 2, radioCristal: 4 });
export function araujo5365(): Puerta {
  return { ...nuevaPuerta(), articuloOrigen: 'PUERTAENR', frente: 307, alto: 290, of: '0233643', color: 'AZUL 5002',
    materialSaco: 'LAC900 AMARILLO', confirmada: true, ventanasConfirmadas: true,
    araujo: { forma: 'sueltos', perfil: '7', tramos: [tramoAraujo(307, 95),
      { ...tramoAraujo(307, 95), ventanas: [ventanaAraujo(44), ventanaAraujo(173)] },
      { ...tramoAraujo(307, 100), rotulacion: { texto: 'ANAGRAMA J. ARAUJO', ancho: 20, desdeDerecha: 15, desdeBajo: 8 } },
      tramoAraujo(440, 30, 1, 'bolsa')] } };
}

/** Hoja y presentación AR2505733: cuatro cuerpos con E.T. de 13 y dos pies con E.T. de 12. */
export function araujo5733(): Puerta {
  return {...araujo5365(),clientePuertas:'araujo',tipoPuerta:'tramos',articuloOrigen:'PUERTAPLET',modelo:'PUERTAPLE',frente:475,alto:425,of:'0222632',notaPlano:'EMPATE: 2 CM',
    araujo:{forma:'sueltos',perfil:'7',tramos:[
      {...tramoAraujo(475,92.5,4),entradas:[{altura:38,ancho:13,huecoLibre:9}]},
      {...tramoAraujo(475,34),of:'0222633',abajo:{tipo:'et',ancho:12}},
      {...tramoAraujo(475,21),material:'LAC900 AMARILLO',of:'0222634',abajo:{tipo:'et',ancho:12}},
    ]}};
}

/** Medidas contrastadas con las presentaciones de Iván; sin copiar errores históricos de milímetros. */
export function araujo4292(): Puerta {
  const p = araujo5365();
  p.of = '0231784';
  p.araujo!.tramos = [tramoAraujo(178,140),
    {...tramoAraujo(178,90), ventanas:[ventanaAraujo(44,35)]},
    {...tramoAraujo(178,80), rotulacion:p.araujo!.tramos[2].rotulacion}, tramoAraujo(170.5,28,1,'bolsa')];
  return p;
}
export function araujo4373(): Puerta {
  const p = araujo5365();
  p.of = '0231897'; p.color = 'GRIS 7038';
  p.araujo!.perfil = '6,5';
  p.araujo!.tramos = [{...tramoAraujo(540,69,2), ventanas:[79,225,371].map(x=>ventanaAraujo(x,19.5,90,30))},
    tramoAraujo(540,65),tramoAraujo(540,53)];
  return p;
}
export function araujo2391(): Puerta[] {
  return ([[301,[157,100,90],293.5],[412,[160,70,75,95],404.5]] as const).map(([frente,altos,bolsa],i)=>{
    const p = araujo5365();
    p.of = ['0228521','0228522'][i]; p.color = 'GRIS 7038';
    p.araujo!.tramos = [...altos.map(alto=>tramoAraujo(frente,alto)),tramoAraujo(bolsa,28,1,'bolsa')];
    if(frente===301)p.araujo!.tramos[1].ventanas = [ventanaAraujo(41.5),ventanaAraujo(169.5)];
    else p.araujo!.tramos[2].ventanas = [ventanaAraujo(15,15,382,45)];
    p.araujo!.tramos.at(-2)!.rotulacion = {texto:'ANAGRAMA J. ARAUJO',ancho:20,desdeDerecha:15,desdeBajo:8};
    return p;
  });
}

/** AR2506255: presentación de 12/12/2025, 147 × 300 y ejes a 75 y 165 del bajo. */
export function araujo6255(): Puerta {
  const p=araujo5365();
  p.modelo='PUERTAPLE';p.of='0223602';p.color='BLANCO';p.notaPlano='EMPATE: 2 CM';
  p.araujo!.forma='continua';p.araujo!.corteTrasImprimir=true;
  p.araujo!.tramos=[tramoAraujo(147,300),tramoAraujo(139.5,28,1,'bolsa')];
  p.entradas=[75,165].map(altura=>({altura,alto:12,largo:147,diametro:30,huecos:[]}));
  return p;
}
