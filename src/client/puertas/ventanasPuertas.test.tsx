import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { enrollable5470 } from '../../puertas/__fixtures__/enrollable5470.ts';
import { apilable } from '../../puertas/__fixtures__/ejemplos.ts';
import { VentanasEntreTubos } from './PuertasView';
import { conEntradasDePuerta } from './ventanasPuertas';
import { textoCotaMm, textoAlzadoMm } from './alzadoEnMm';

describe('Ventanas entre tubos, bloque común de apilable y enrollable',()=>{
  it.each([enrollable5470,apilable])('presenta los mismos campos en mm y permite editar alturas antiguas',crear=>{
    const html=renderToStaticMarkup(<VentanasEntreTubos p={crear()} cambiar={()=>undefined}/>);
    for(const etiqueta of ['Tramo de la ventana','Desde la izquierda, la primera (mm)','Ancho de la ventana (mm)','Alto de la ventana (mm)','Cuántas iguales seguidas','Separación entre ellas (mm)','Desde abajo ventana 1 (mm)']) expect(html).toContain(etiqueta);
    expect(html).not.toContain('Fila ·');
    expect(html).not.toContain('(cm)');
  });
  it('recoloca solo las ventanas con tramo cuando se editan sus entradas',()=>{
    const p=enrollable5470();
    p.ventanas[0]={...p.ventanas[0],tramo:1,y:75.5};
    const nuevo=conEntradasDePuerta(p,p.entradas.map((e,i)=>i===1?{...e,altura:135}:e));
    expect(nuevo.ventanas[0].y).toBe(77.5);
    expect(nuevo.ventanas.slice(1)).toEqual(p.ventanas.slice(1));
    expect(p.ventanas[0].y).toBe(75.5);
  });
  it('muestra las cotas y las notas del alzado en mm, incluidos rótulos esquemáticos',()=>{
    expect(textoCotaMm({tipo:'cota',x1:0,y1:0,x2:25,y2:0,linea:5,valor:25,rotulo:'5',marcas:2,texto:{x:0,y:0,ancla:'middle'}})).toBe('50');
    expect(textoAlzadoMm('E.T. (DEJAR HUECOS 9)')).toBe('E.T. (DEJAR HUECOS 90 mm)');
    expect(textoAlzadoMm('1040 CM X 55 CM · X3 · 0233000')).toBe('10400 mm X 550 mm · X3 · 0233000');
  });
});
