import{describe,it,expect}from 'vitest';
import{existsSync,readFileSync}from 'node:fs';
import{prepararTexto,normalizarCampo}from './textos.ts';
import{dxfACmt}from './index.ts';
import type{Dxf,EntidadDxf}from './tipos.ts';
const d:Dxf={entities:[],layers:{},styles:{Standard:{3:'arial.ttf',70:'0'}},sections:{}};
const e=(type='MTEXT',pairs:[number,string][]=[]):EntidadDxf=>({type,pairs:[[8,'texto'],[1,'AB\\PCD'],[10,'100'],[20,'500'],[40,'20'],...pairs]});
const arial=process.env.CMT_ARIAL_PATH??'C:/Windows/Fonts/arial.ttf';
describe('texto del importador DXF Inkscape 1.2/master',()=>{
 it.each([[1,0,20],[2,.5,20],[3,1,20],[4,0,10],[5,.5,10],[6,1,10],[7,0,20],[8,.5,20],[9,1,20]])('anclaje %s: solo cambia lo que cambia el script', (anchor,horizontal,dy)=>{const p=prepararTexto(e('MTEXT',[[71,String(anchor)]]),d);expect(p.anclaje).toBe(horizontal);expect(p.dy).toBe(dy);});
 it('TEXT inyecta 70 y 71, pero un 71 previo conserva prioridad; 72/73 no intervienen',()=>{const p=prepararTexto(e('TEXT',[[72,'2'],[73,'3'],[11,'800'],[21,'900']]),d);expect(p.dy).toBe(0);expect(p.anclaje).toBe(0);expect(prepararTexto(e('TEXT',[[71,'2']]),d).anclaje).toBe(.5);});
 it('la presencia de 70, incluso cero, evita el dy inicial de MTEXT',()=>expect(prepararTexto(e('MTEXT',[[70,'0']]),d).dy).toBe(0));
 it('50 tiene prioridad incluso si vale cero; solo los vectores de módulo cercano a uno giran',()=>{expect(prepararTexto(e('MTEXT',[[11,'0'],[21,'1']]),d).giro).toBe(90);expect(prepararTexto(e('MTEXT',[[50,'0'],[11,'0'],[21,'1']]),d).giro).toBe(0);expect(prepararTexto(e('MTEXT',[[11,'0'],[21,'2']]),d).giro).toBe(0);});
 it('el bit 4 de STYLE activa escritura vertical y anula el giro',()=>{const p=prepararTexto(e('MTEXT',[[50,'30'],[7,'Standard']]),{...d,styles:{Standard:{70:'4'}}});expect(p.vertical).toBe(true);expect(p.giro).toBe(0);});
 it('plegado por número de caracteres: incluye el P inicial vacío del script',()=>{const t=e();t.pairs=t.pairs.filter(p=>p[0]!==1).concat([[1,'DERECHO'],[41,'21']]);const p=prepararTexto(t,d);expect(p.plegado).toBe(true);expect(p.lineas.map(l=>l.map(r=>r.texto).join(''))).toEqual(['','DE','RE','CH','O']);});
 it('un P o una llave impide plegar; 44 y 73 no ajustan el interlineado de 125 %',()=>{const p=prepararTexto(e('MTEXT',[[41,'21'],[44,'2'],[73,'2']]),d);expect(p.plegado).toBe(false);expect(p.interlineado).toBe(1.25);});
 it('la limpieza es por fragmento y codiciosa; %% y ^J permanecen literales',()=>{expect(normalizarCampo(' A\\W2;BORRAR;FIN ')).toBe(' AFIN ');expect(normalizarCampo('%%C %%d %%p ^J ^I \\~ \\U+2205')).toBe('%%C %%d %%p ^J    ∅');});
 it('el control F quita el nombre pero usa la fuente global; H relativo inválido deja el grupo sin texto',()=>{const t=e();t.pairs=t.pairs.filter(p=>p[0]!==1).concat([[1,'{\\FCalibri|b1;AB}{\\H2x;PERDIDO}']]);const p=prepararTexto(t,d);expect(p.lineas[0].map(r=>r.texto).join('')).toBe('AB');});
 it('mtext_normalize repite el control F a ambos lados de un P dentro de llaves',()=>{const t=e();t.pairs=t.pairs.filter(p=>p[0]!==1).concat([[1,'{\\FCalibri;AB\\PCD}']]);expect(prepararTexto(t,d).lineas.map(l=>l.map(f=>f.texto).join(''))).toEqual(['AB','CD']);});
 it('50/51 con extrusión negativa conserva la permutación de ángulos del importador',()=>{expect(prepararTexto(e('TEXT',[[50,'30'],[51,'12'],[230,'-1']]),d).giro).toBe(168);});
 it('un formato desconocido se conserva literal; no se inventa una fracción S',()=>{const t=e();t.pairs=t.pairs.filter(p=>p[0]!==1).concat([[1,'\\pt6;TRANSP.']]);expect(prepararTexto(t,d).lineas[0][0].texto).toBe('\\pt6;TRANSP.');expect(normalizarCampo('ANTES\\S1/2;DESPUES')).toBe('ANTESDESPUES');});
 it.skipIf(!existsSync(arial)).each([['plegado',10],['porcentajes',38]])('Arial necesaria: contornos reales de %s coinciden con el robot', (name,total)=>{
  const t=readFileSync(new URL(`./__fixtures__/quinta-${name}.dxf`,import.meta.url),'utf8');const r=dxfACmt(t,{rutaFuente:arial});expect(r.dudas).toEqual([]);expect(r.objetos).toHaveLength(total);
  const ref=JSON.parse(readFileSync(new URL(`./__fixtures__/quinta-${name}-robot.json`,import.meta.url),'utf8')) as {objetos:{points:{x:number;y:number;type:number}[]}[]};
  for(const [i,o]of r.objetos.entries()){expect(o.paths[0]).toHaveLength(ref.objetos[i].points.length);for(const[j,q]of o.paths[0].entries()){const p=ref.objetos[i].points[j];expect(q.type).toBe(p.type);expect(Math.hypot(q.x-p.x,q.y-p.y)/(72/25.4)).toBeLessThan(.1);}}
 });
});
