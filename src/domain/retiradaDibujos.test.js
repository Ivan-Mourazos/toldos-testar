import {expect,test} from 'vitest';
import {getAwningDiagram,getFabricPatternDiagram} from './modelBehavior.js';
import {buildFabricDiagramSvg,SVG_FABRIC_DIAGRAMS,buildPlanteamientoPlan} from './planteamientoPdf.js';
const retirados=['ARZUA','GALICIA','XACOBEO','MONOBLOCK','PUNTO-RECTO','AMBAR','AGATA','MAXISCREEN','CUARZO','PERLA','CORAL','CAMBIO-TELA'];
const modelos=['ARZUA PRO','GALICIA','XACOBEO','MONOBLOCK 350','PUNTO RECTO','AMBAR BOX','AGATA BOX','MAXISCREEM','CUARZO BOX','PERLA BOX','CORAL BOX','CAMBIO TELA'];
test('solo quedan los 17 dibujos que representan confección',()=>{
 expect(SVG_FABRIC_DIAGRAMS).toHaveLength(17);
 for(const id of retirados)expect(SVG_FABRIC_DIAGRAMS).not.toContain(id);
});
test.each(modelos)('%s conserva GENERAL aunque el catálogo identifique otro diagrama',model=>{
 const awning={id:'a',model,width:400,projection:250,valanceHeight:25};
 expect(getFabricPatternDiagram(awning,getAwningDiagram(awning))).toBe('GENERAL');
 const plan=buildPlanteamientoPlan({awnings:[awning]},{ofs:[{awningId:'a',awningIndex:0,calculation:{}}]});
 expect(plan.fabricPages[0].diagram).toBe('GENERAL');
});
test.each([...retirados,'FUTURO'])('%s se resuelve como GENERAL, sin error ni hueco',diagram=>{
 const awning={width:400,projection:250,valanceHeight:25};
 expect(buildFabricDiagramSvg({diagram,awning})).toEqual(buildFabricDiagramSvg({diagram:'GENERAL',awning}));
});
test.each(['ANTICA','CAMBIO ANTICA'])('%s mantiene su perfil real',model=>{
 expect(getFabricPatternDiagram({model,anticaVariant:'TUBO 30X10 CON BAMBA'})).toBe('ANTICA');
});
