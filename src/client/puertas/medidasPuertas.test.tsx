import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NumeroPuerta } from './NumeroPuerta';
import { aMilimetros, desdeMilimetros, medidaPuerta, textoMedidasMm } from './medidasPuertas';
import { InputDecimal } from '../remolques/InputDecimal';
import { enrollable5470 } from '../../puertas/__fixtures__/enrollable5470.ts';
import { pedidoDe } from '../../puertas/__fixtures__/ejemplos.ts';
import { leerPedidoPuertas } from '../../puertas/pedido.ts';

describe('Medidas de puertas en pantalla, modelo guardado en cm', () => {
  it.each([[472,4720],[0.55,5.5],[7.55,75.5],[0,0]])('muestra %s cm como %s mm y permite volver sin alterar la medida', (cm,mm) => {
    expect(aMilimetros(cm)).toBe(mm);
    expect(desdeMilimetros(mm)).toBe(cm);
  });
  it('escribe coma decimal y no duplica la conversión de mm ni convierte cantidades', () => {
    expect(medidaPuerta(0.55)).toBe('5,5');
    for (const [unidad,valor,esperado] of [['cm',0.55,'5,5'],['mm',80,'80'],['cantidad',3,'3']] as const) {
      expect(renderToStaticMarkup(<NumeroPuerta titulo="Medida" valor={valor} unidad={unidad} cambiar={()=>undefined}/>)).toContain(`value="${esperado}"`);
      let guardado:number|null=null;
      const campo=NumeroPuerta({titulo:'Medida',valor,unidad,cambiar:v=>{guardado=v;}});
      const input=campo.props.children[1] as React.ReactElement<React.ComponentProps<typeof InputDecimal>>;
      input.props.onValor(Number(esperado.replace(',','.')));
      expect(guardado).toBe(valor);
      input.props.onValor(null);
      expect(guardado).toBeNull();
    }
  });
  it('cargar, mostrar y volver a guardar no escala ni muta un pedido existente', () => {
    const original=pedidoDe('AR2605470',enrollable5470()),json=JSON.stringify(original);
    const cargado=leerPedidoPuertas(JSON.parse(json));
    for(const e of cargado.elementos) {
      const html=renderToStaticMarkup(<NumeroPuerta titulo="Frente" valor={e.input.frente} cambiar={()=>undefined}/>);
      expect(html).toContain('value="4720"');
      e.input.frente=desdeMilimetros(aMilimetros(e.input.frente));
    }
    expect(JSON.stringify(cargado)).toBe(json);
    expect(JSON.stringify(original)).toBe(json);
  });
  it('convierte ayudas con medidas explícitas sin alterar mm, cantidades, OF ni RAL', () => {
    expect(textoMedidasMm('Cristal + 4 cm; corte 12 × 7,5 cm; varilla 5,5 mm; X6 · 0233871 · RAL 7016')).toBe('Cristal + 40 mm; corte 120 × 75 mm; varilla 5,5 mm; X6 · 0233871 · RAL 7016');
  });
});
