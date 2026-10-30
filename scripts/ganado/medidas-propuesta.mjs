// Propuesta única tras la aclaración de Iván: aguas 10 cm y caída adicional 10 cm.
import fs from 'node:fs';
import path from 'node:path';
import { guardar, salida } from './medidas-fuentes.mjs';
import { construirMorro } from './medidas-geometria.mjs';
import { dibujarPropuesta } from './medidas-dibujar.mjs';
const radio=JSON.parse(fs.readFileSync(path.join(salida,'radio-carton.json')));
// Se presenta como candidata la raya interior, cuya medida coincide con la
// familia de cabezas de caballos de Cal. Esa coincidencia no prueba el apoyo.
const medidas={largoCuerpo:2100,ancho:1600,frente:540,diagonal:1020,altoA:670,altoB:570,aguasA:100,aguasB:100,radioA:radio.radios[1].radioMm,radioB:radio.radios[1].radioMm,pasos:12};
const entrada={pedido:'AR.26.05319',linea:3,of:'0233492',unidad:'mm',validado:false,medidas,fuente:'fuentes/hoja-entrada.pdf, página 3; aclaración de Iván recibida por el coordinador: 67+10 atrás, 57+10 delante, caída 10 cm.',hipotesis:['La raya interior ajustada al escaneo se toma solo bajo la hipótesis de escala 1:1 del cartón en el PDF; coincide con la familia histórica R76,385 pero no está confirmado qué línea define el apoyo.','Se usa el mismo radio candidato en ambas secciones; falta comprobar que el arco delantero coincide.','Las alturas 67 y 57 llegan a la intersección teórica del agua con el lateral; falta validar la tangencia del arco.','No se suma 1 cm a las medidas ni se aplican bastillas, enfundados o solapes sin revisión de la ficha.','No se fuerza el largo total 300: se conservan 210 recto y 102 de diagonal.'],ollaos:{lateralDesdeAtras:[30,55,94,126,157,193],unidad:'cm',esquinas:'Se lee 2 esq al inicio; no hay un segundo 2 esq al final de la fila.',diagonal:4,delante:3},pendiente:['Escala comprobada del escaneo con una medida testigo y radio de apoyo confirmado.','Posición y dimensiones de ventana y puerta MFI; bastillas y solapas por borde.','Confirmar el cierre trasero: la hoja dice fruncido y goma o cuerda de 8 mm.']};
entrada.puerta={lado:'MFI',recogida:true,cierre:'cremallera hasta arriba',notaLiteral:'Da la medida la diagonal',dimensionPendiente:'Confirmar cómo se traslada la diagonal al ancho terminado y sus solapas'};
guardar('entrada-propuesta.json',entrada);
const modelo=construirMorro(medidas),lamina=dibujarPropuesta(modelo);
const q=modelo.proyeccion,total=medidas.largoCuerpo+q;
guardar('propuesta.json',{entrada,modelo,lamina,cuentaPlanta:{proyeccionMm:q,largoResultanteMm:total,largoTotalHojaMm:3000,diferenciaMm:total-3000,diagonalSiMandasen3000Mm:Math.hypot(3000-medidas.largoCuerpo,(medidas.ancho-medidas.frente)/2)},alcance:'Desarrollo geométrico terminado condicionado. No es un corte aprobado y no se genera DXF ni DWG.'});
console.log(JSON.stringify({proyeccionMm:q,largoResultanteMm:total,diferenciaCon3000Mm:total-3000,piezas:lamina.piezas,radioCondicionadoMm:medidas.radioA}));
