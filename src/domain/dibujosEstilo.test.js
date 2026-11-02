import { expect, test } from 'vitest';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildFabricDiagramSvg, buildFabricDiagramBoxPdf, buildFabricDiagramPreviewPdf, buildStructureDiagramBoxPdf, buildValanceDiagramSpec, SVG_FABRIC_DIAGRAMS } from './planteamientoPdf.js';
const texto = d => d.nodes.filter(n=>n.tag==='text').map(n=>n.text).join(' ');
const awning={model:'CORTINA',width:400,projection:250,valanceHeight:25,curtainHasWindow:true,curtainWindowHeight:136,curtainWindowFloorHeight:70,curtainWindowCorner:20,valanceCurve:'RECTA'};
test.each(SVG_FABRIC_DIAGRAMS)('%s se dibuja sin colores en la aplicación',diagram=>{
 const dibujo=buildFabricDiagramSvg({diagram,awning});
 for(const n of dibujo.nodes) for(const key of ['fill','stroke']) if(n.attrs[key] && n.attrs[key]!=='none') {
  expect(n.attrs[key]).toMatch(/^#([0-9a-f]{2})\1\1$/i);
 }
 expect(texto(dibujo)).not.toMatch(/BAMBA SEPARADA|BAMBALINA INCLUIDA|SIN BAMBA/);
});
test.each(['GENERAL','CORTINA-VENTANA','CORTINA-SIN-VENTANA','TOLDO-VELCRO','SUPLEMENTO'])('%s conserva la unión al cuerpo aunque cambie la tela',diagram=>{
 const normal=buildFabricDiagramSvg({diagram,awning});
 const otra=buildFabricDiagramSvg({diagram,awning:{...awning,valanceFabric:'OTRA'}});
 expect(otra.nodes.filter(n=>n.tag==='path')).toEqual(normal.nodes.filter(n=>n.tag==='path'));
 expect(texto(otra)).toContain('BAMBA · 25 CM · OTRA TELA');
 expect(texto(normal)).toContain('BAMBA · 25 CM');
 expect(buildValanceDiagramSpec({...awning,valanceFabric:'OTRA'}).separate).toBe(true);
});
test('sin bamba no aparece pieza ni etiqueta de bamba',()=>{
 for(const diagram of ['GENERAL','CORTINA-VENTANA','TOLDO-VELCRO']) expect(texto(buildFabricDiagramSvg({diagram,awning:{...awning,valanceHeight:0}}))).not.toContain('BAMBA');
});
test('pdfkit aplica blanco y negro a confección y conserva color en Iris de estructura',async()=>{
 for(const [estructura,buffer] of [[false,await buildFabricDiagramBoxPdf({diagram:'GENERAL',awning})],[true,await buildStructureDiagramBoxPdf({awning:{...awning,model:'IRIS',irisFrontTop:400,irisExitLeft:250,irisAssumeSquare:true},calculation:{}})]]){
  const tarea=getDocument({data:new Uint8Array(buffer)});try{
   const pdf=await tarea.promise; const ops=await(await pdf.getPage(1)).getOperatorList();
   const colores=ops.fnArray.flatMap((fn,i)=>[OPS.setFillRGBColor,OPS.setStrokeRGBColor].includes(fn)?[ops.argsArray[i][0]]:[]);
   expect(colores.some(c=>!/^#([0-9a-f]{2})\1\1$/i.test(c))).toBe(estructura);
  }finally{await tarea.destroy();}
 }
});

test('las marcas de broches del suplemento conservan relleno negro',()=>{
 const dibujo=buildFabricDiagramSvg({diagram:'SUPLEMENTO',awning:{...awning,supplementFastening:'BROCHES',supplementFasteningPitchCm:15}});
 expect(dibujo.nodes.filter(n=>n.tag==='path'&&n.attrs.fill==='#000000'&&n.attrs.stroke==='none').length).toBeGreaterThan(5);
});


test('la miniatura completa, incluida su cabecera, se imprime sin color',async()=>{
 const tarea=getDocument({data:new Uint8Array(await buildFabricDiagramPreviewPdf({awning}))});
 try{
  const pdf=await tarea.promise;const ops=await(await pdf.getPage(1)).getOperatorList();
  for(let i=0;i<ops.fnArray.length;i++)if([OPS.setFillRGBColor,OPS.setStrokeRGBColor].includes(ops.fnArray[i]))expect(ops.argsArray[i][0]).toMatch(/^#([0-9a-f]{2})\1\1$/i);
 }finally{await tarea.destroy();}
});
