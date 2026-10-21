import {describe,expect,it} from 'vitest';
import datos from './__fixtures__/marcas-bolsillo.json';
import {marcasBolsillo} from './bolsillo.ts';

describe('Esquinas del bolsillo contra siete cortes reales del bot',()=>{
  for(const f of datos.casos) it(`${f.pedido}: dos L de 0,5 hacia dentro, Y de corte ${f.yCorteSuperior}`,()=>{
    // La altura terminada es una entrada manual: se suma un origen de prueba conocido, no una regla del pedido histórico.
    const origen=11;
    const r=marcasBolsillo({distancia:f.x[0],ancho:f.x[1]-f.x[0],lado:'izquierdo',altoSuperior:f.yCorteSuperior+origen},f.pano[0],origen,0);
    expect(r).toEqual([[f.x[0],f.yCorteSuperior-.5,f.x[0],f.yCorteSuperior],[f.x[0],f.yCorteSuperior,f.x[0]+f.brazo,f.yCorteSuperior],[f.x[1],f.yCorteSuperior-.5,f.x[1],f.yCorteSuperior],[f.x[1],f.yCorteSuperior,f.x[1]-f.brazo,f.yCorteSuperior]]);
  });
  it('traslada derecha y escuadrado sin copiar el X+1 de un pedido a los demás',()=>{
    expect(marcasBolsillo({distancia:20,ancho:30,lado:'derecho',altoSuperior:50},400,11,1)).toEqual([[351,38.5,351,39],[351,39,351.5,39],[381,38.5,381,39],[381,39,380.5,39]]);
  });
});
