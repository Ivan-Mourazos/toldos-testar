import fixture from './AR2605035.json' with { type: 'json' };
import { base, pedidoDe, puerta4638 } from './ejemplos.ts';
import { alturasTubos, huecosEntrada } from '../calcular.ts';

/** Casos existentes antes de las fichas de cliente; no añaden campos nuevos al documento. */
export function pedidosCompatibilidadClientes() {
  const ar5220 = { ...base('PUERTAENR',366,410),of:'0233291',enrollable:{T:229,D:60,margen:8,empates:[],saco:80},
    entradas:[50,121,181,231].map(altura=>({altura,diametro:30 as const,largo:366,alto:8,huecos:[]})) };
  const ar5035 = fixture.puertas.map(f=>{
    const p=base('PUERTAPLE',f.frente,f.altoIzquierdo);
    p.of=f.of;p.color='GRIS 7038';
    p.apilable={pie:f.pieIzquierdo,pasos:f.pasos,cabecera:f.cabecera,bolsillo:24,saco:fixture.sacoUtilPedidoMm,doble:false,empates:[1,4],
      sueloInclinado:{altoIzquierdo:f.altoIzquierdo,altoDerecho:f.altoDerecho}};
    p.entradas=alturasTubos(p).map(altura=>({altura,diametro:30,largo:p.frente,alto:12,huecos:huecosEntrada(p.frente,30)}));return p;
  });
  return [pedidoDe('AR2605246',puerta4638(),{...puerta4638(),of:'0239999',cantidad:2}),pedidoDe('AR2605220',ar5220),pedidoDe('AR2605035',...ar5035)]
    .map(p=>({...p,cabecera:{cliente:'PORTANOVA',fecha:'2026-10-23',clienteRps:{codigo:'001336',nombre:'PORTANOVA'}}}));
}
