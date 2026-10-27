import { describe, expect, it } from 'vitest';
import { extraerPanos } from './leerCorte.js';

const raya = (a, b, capa = 'DISCO1') => ({ tipo: 'raya', a, b, capa, curva: 0 });
const texto = (valor, punto) => ({ tipo: 'texto', valor, punto, h: 200, capa: 'texto' });

describe('lectura independiente de los paños del lote', () => {
  it('cuenta el paño abierto en el orillo sin inventar un corte inferior', () => {
    const modelo = [texto('HOK420150-0090', [3500, 2200]), texto('x30', [4000, 2900])];
    for (const y of [666, 1332, 1998]) {
      modelo.push(raya([0, y], [10412, y]));
    }
    modelo.push(raya([0, 0], [0, 1998]), raya([10412, 0], [10412, 1998]));
    const grupos = extraerPanos(modelo);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].codigo).toBe('420150-0090');
    expect(grupos[0].repeticiones).toBe(30);
    expect(grupos[0].panos.map(p => p.medidasMm)).toEqual(Array(3).fill([10412, 666]));
    expect(grupos[0].panos.filter(p => p.orilloInferior)).toHaveLength(1);
  });

  it('no asigna el rótulo de un accesorio situado a la derecha', () => {
    const modelo = [texto('HOK420150-0090', [3500, 2200]), texto('HOK420150-0088', [11000, 2100]),
      raya([0, 1998], [10412, 1998]), raya([0, 1332], [10412, 1332]),
      raya([0, 1332], [0, 1998]), raya([10412, 1332], [10412, 1998])];
    expect(extraerPanos(modelo).map(g => g.codigo)).toEqual(['420150-0090']);
  });

  it('rechaza una caja sin los dos costados y separa títulos entre paños', () => {
    expect(extraerPanos([texto('HOK420150-0090', [3500, 2200]), raya([0, 1998], [10412, 1998])])).toEqual([]);
    const modelo = [texto('HOK420150-0090', [3500, 2200]), texto('HOK420150-0002', [3500, 1200]),
      raya([0, 1998], [10412, 1998]), raya([0, 1332], [10412, 1332]),
      raya([0, 999], [10412, 999]), raya([0, 333], [10412, 333]),
      raya([0, 1332], [0, 1998]), raya([10412, 1332], [10412, 1998]),
      raya([0, 333], [0, 999]), raya([10412, 333], [10412, 999])];
    expect(extraerPanos(modelo).map(g => g.codigo).sort()).toEqual(['420150-0002', '420150-0090']);
  });

  it('lee sueltas con el rótulo dentro y un corte compartido que sobrepasa el costado', () => {
    // El paño inferior es más largo: su corte superior también separa el de arriba.
    const modelo = [texto('HOK420150-0002', [3500, 333]), texto('HOK420150-0021', [3500, 999]),
      raya([0, 0], [0, 1332]), raya([10652, 0], [10652, 666]), raya([10052, 666], [10052, 1332]),
      raya([0, 666], [10652, 666]), raya([0, 1332], [10052, 1332])];
    const grupos = extraerPanos(modelo);
    expect(grupos.find(g => g.codigo === '420150-0002').panos.map(p => p.medidasMm)).toEqual([[10652, 666]]);
    expect(grupos.find(g => g.codigo === '420150-0021').panos.map(p => p.medidasMm)).toEqual([[10052, 666]]);
    expect(grupos.find(g => g.codigo === '420150-0021').panos[0].orilloInferior).toBe(false);
  });

  it('no toma por costado un corte del paño siguiente que penetra solo 25 mm', () => {
    const modelo = [texto('HOK420150-0091', [3500, 400]), texto('HOK420150-0090', [3500, 1000]),
      raya([0, 0], [0, 666]), raya([10812, 0], [10812, 666]), raya([0, 666], [10812, 666]),
      raya([0, 641], [0, 1307]), raya([10412, 641], [10412, 1307]), raya([0, 1307], [10412, 1307])];
    const grupos = extraerPanos(modelo);
    expect(grupos.find(g => g.codigo === '420150-0091').panos[0].medidasMm).toEqual([10812, 666]);
    // El corte anterior sí deja solo 641 mm útiles al de arriba: no se oculta esa diferencia.
    expect(grupos.find(g => g.codigo === '420150-0090').panos[0].medidasMm).toEqual([10412, 641]);
  });

  it('cuenta también la suelta que acaba en el orillo superior', () => {
    const modelo = [texto('HOK420150-0090', [3500, 333]), texto('HOK420150-0090', [3500, 999]),
      raya([0, 0], [10412, 0]), raya([0, 666], [10412, 666]),
      raya([0, 0], [0, 1332]), raya([10412, 0], [10412, 1332])];
    const grupos = extraerPanos(modelo);
    expect(grupos.flatMap(g => g.panos)).toHaveLength(2);
    expect(grupos.flatMap(g => g.panos).filter(p => p.orilloSuperior)).toHaveLength(1);
    expect(grupos.flatMap(g => g.panos).every(p => p.orilloDelConjunto)).toBe(true);
  });

  it('propaga un único rótulo interior común a las dos sueltas contiguas', () => {
    const modelo = [texto('HOK420150-0090', [3500, 999]),
      raya([0, 666], [10412, 666]), raya([0, 1332], [10412, 1332]),
      raya([0, 0], [0, 1332]), raya([10412, 0], [10412, 1332])];
    const grupos = extraerPanos(modelo);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].panos).toHaveLength(2);
    expect(grupos[0].repeticiones).toBe(1);
  });
});
