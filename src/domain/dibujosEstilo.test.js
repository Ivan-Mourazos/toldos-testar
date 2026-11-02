import { expect, test } from 'vitest';
import { buildFabricDiagramSvg } from './planteamientoPdf.js';
const texto = d => d.nodes.filter(n=>n.tag==='text').map(n=>n.text).join(' ');
test('propuesta elimina distintivos repetidos y conserva medida en bamba', () => {
  for (const diagram of ['GENERAL', 'CORTINA-VENTANA', 'TOLDO-VELCRO']) {
    const awning = {model:'CORTINA', valanceHeight:20, curtainHasWindow:true};
    const actual=buildFabricDiagramSvg({diagram,awning});
    const muestra=buildFabricDiagramSvg({diagram,awning,estiloTecnico:true});
    expect(texto(muestra)).not.toContain('BAMBALINA INCLUIDA');
    expect(texto(muestra)).toContain('20 CM');
    expect(texto(buildFabricDiagramSvg({diagram,awning:{...awning,valanceHeight:0},estiloTecnico:true}))).not.toContain('SIN BAMBA');
    expect(actual).toEqual(buildFabricDiagramSvg({diagram,awning,estiloTecnico:false}));
  }
});
test('otras variantes no activan la propuesta y la bamba separada sigue avisando', () => {
  const awning={valanceHeight:25,valanceFabric:'OTRA'};
  expect(buildFabricDiagramSvg({diagram:'ENROLLABLE',awning,estiloTecnico:true})).toEqual(buildFabricDiagramSvg({diagram:'ENROLLABLE',awning}));
  expect(texto(buildFabricDiagramSvg({diagram:'TOLDO-VELCRO',awning,estiloTecnico:true}))).toContain('BAMBA SEPARADA');
});
