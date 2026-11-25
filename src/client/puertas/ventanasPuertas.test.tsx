import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { enrollable5470 } from '../../puertas/__fixtures__/enrollable5470.ts';
import { apilable } from '../../puertas/__fixtures__/ejemplos.ts';
import { AcabadoSaco, VentanalesEntreTubos, VentanasEntreTubos } from './PuertasView';
import { apilableVentanal } from '../../puertas/__fixtures__/apilableVentanal.ts';
import { conEntradasDePuerta } from './ventanasPuertas';
import { textoCotaMm, textoAlzadoMm } from './alzadoEnMm';

it('configura el tramo y margen del ventanal y el acabado del saco', () => {
  const p = apilableVentanal();
  const html = renderToStaticMarkup(<VentanalesEntreTubos p={p} cambiar={()=>undefined}/>);
  expect(html).toContain('Entre tubo 3 y 4');
  expect(html).toContain('Margen lateral ventanal del tramo 3 (mm)');
  expect(html).toContain('value="150"');
  let editada = p;
  const selector = AcabadoSaco({ p, cambiar: nueva => { editada = nueva; } });
  expect(selector.props.options).toEqual(['Negro', 'Amarillo', 'Negro con diagonales amarillas']);
  expect(selector.props.value).toBe('Amarillo');
  selector.props.onChange('Negro con diagonales amarillas');
  expect(editada).toMatchObject({ materialSaco: 'LAC900 NEGRO', sacoDiagonalesAmarillas: true });
  AcabadoSaco({ p: editada, cambiar: nueva => { editada = nueva; } }).props.onChange('Amarillo');
  expect(editada).toMatchObject({ materialSaco: 'LAC900 AMARILLO', rolloSaco: 300, sacoDiagonalesAmarillas: false });
});

it('marca varios tramos con el margen común, conserva el margen propio y quita un tramo al desmarcarlo', () => {
  let p = apilableVentanal();
  const cambiar = (nueva: typeof p) => { p = nueva; };
  function campo(coincide: (props: Record<string, unknown>) => boolean) {
    const raiz = VentanalesEntreTubos({ p, cambiar });
    const buscar = (nodos: React.ReactNode): React.ReactElement<Record<string, unknown>>[] =>
      React.Children.toArray(nodos).flatMap(n => React.isValidElement<Record<string, unknown>>(n)
        ? [n, ...buscar(n.props.children as React.ReactNode)] : []);
    const e = buscar(raiz).find(n => coincide(n.props));
    if (!e) throw new Error('Falta el campo de ventanales');
    return e.props;
  }
  const marcar = (tramo: number, checked: boolean) => {
    const { onChange } = campo(c => c.type === 'checkbox' && c.value === tramo);
    (onChange as (e: { currentTarget: { checked: boolean } }) => void)({ currentTarget: { checked } });
  };
  const medir = (etiqueta: string, valor: number) =>
    (campo(c => c.titulo === etiqueta).cambiar as (margen: number) => void)(valor);
  marcar(5, true);
  marcar(7, true);
  expect(p.apilable.ventanales).toEqual([3, 5, 7].map(tramo => ({ tramo, margen: 15 })));
  medir('Margen lateral ventanal del tramo 5 (mm)', 12);
  medir('Margen común (mm)', 20);
  marcar(3, false);
  expect(p.apilable.ventanales).toEqual([{ tramo: 5, margen: 12 }, { tramo: 7, margen: 20 }]);
});

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
