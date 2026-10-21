import {describe,expect,it} from 'vitest';
import {repartirPanos} from './empates.ts';
describe('Reparto común en rollo',()=>{
  it('usa el tubo más alto que cabe y conserva su entrada en el paño inferior',()=>{
    const r=repartirPanos({desde:11,hasta:587,frente:500,rollo:300,tubos:[{eje:245,solape:12,tubo:5},{eje:297,solape:12,tubo:6},{eje:349,solape:12,tubo:7}]});
    expect(r.uniones).toEqual([{eje:297,solape:12,tubo:6}]);
    expect(r.tramos.map(t=>t.hasta-t.desde)).toEqual([292,296]);
  });
  it('sin tubo viable reparte con 2 y números de unión',()=>{
    const r=repartirPanos({desde:0,hasta:700,frente:450,rollo:300,normal:true});
    expect(r.tramos.map(t=>t.hasta-t.desde)).toEqual([300,300,104]);
    expect(r.uniones.map(t=>t.solape)).toEqual([2,2]);
    expect(r.tramos[1]).toMatchObject({unionInferior:0,unionSuperior:1});
  });
  it('si cabe girado conserva una sola pieza y no inventa empates',()=>{
    expect(repartirPanos({desde:0,hasta:700,frente:250,rollo:300,normal:true}).tramos).toHaveLength(1);
  });
  it('no asigna un tubo fuera del paño o un empate repetido',()=>{
    const r=repartirPanos({desde:0,hasta:500,frente:400,rollo:300,indicados:[{eje:200,solape:12},{eje:200,solape:12}]});
    expect(r.error).toBeTruthy(); expect(r.uniones).toEqual([]);
  });
});
