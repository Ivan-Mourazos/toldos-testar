// Estudio reproducible de ARAUJO. Solo SELECT; los resultados y los hashes se escriben en tmp/araujo/.
// node scripts/estudiar-araujo.mjs [--local] [--cad] [--plantilla]
// --local recalcula sin SQL a partir de la consulta conservada; --cad inventaría las copias locales históricas.
import fs from 'node:fs';
import crypto from 'node:crypto';
import sql from 'mssql';
import { registrosDxf, valor } from '../src/domain/corteLona/dxfTestHelpers.js';
import { limpiarTextoDxf, textoDxf } from '../src/flujoDwg/planoDxf.js';

const dir='tmp/araujo';
fs.mkdirSync(dir,{recursive:true});
let filas;
if(process.argv.includes('--local'))filas=JSON.parse(fs.readFileSync(`${dir}/historico.json`,'utf8'));
else{
  const {config}=await import('../src/config.js');
  const pool=await new sql.ConnectionPool({server:config.db.server,port:config.db.port,user:config.db.user,password:config.db.password,database:config.db.database,options:{encrypt:false,trustServerCertificate:true},requestTimeout:120000}).connect();
  try{
    const consulta=await pool.request().input('c',sql.VarChar(10),config.db.company).input('cli',sql.VarChar(20),'000460').query(`SELECT o.CodOrder pedido,CONVERT(varchar(10),o.OrderDate,120) fecha,l.NumLine linea,a.CodArticle articulo,l.Description descripcion,l.Comment comentario,l.Quantity cantidad,CONVERT(varchar(40),mo.CodManufacturingOrder) of_
      FROM dbo.FACOrderSL o JOIN dbo.FACCustomer c ON c.IDCustomer=o.IDCustomer AND c.CodCompany=o.CodCompany
      JOIN dbo.FACOrderLineSL l ON l.IDOrder=o.IDOrder AND l.CodCompany=o.CodCompany
      JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
      LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
      WHERE o.CodCompany=@c AND c.CodCustomer=@cli AND a.CodArticle LIKE 'PUERTA%' ORDER BY o.OrderDate DESC,l.NumLine`);
    filas=consulta.recordset;
  }finally{await pool.close();}
}
const datos=filas.map(r=>{
  const t=`${r.descripcion??''} ${r.comentario??''}`.toUpperCase().replace(/\s+/g,' ');
  const medidas=[...t.matchAll(/\d+(?:[.,]\d+)?\s*(?:CM(?: DE FRENTE)?)?\s*[X×]\s*\d+(?:[.,]\d+)?(?:\s*CM)?(?:\s*\+\s*\d+(?:[.,]\d+)?(?:\s*CM)?)*/g)].map(m=>m[0]);
  const bolsaSola=/BOLSA|SACO/.test(t)&&(/SOLO|SUELT|BOLSAS INFERIORES|BOLSA INFERIOR PARA/.test(t)||!medidas.some(m=>m.includes('+'))&&!/LONA PARA PUERTA|POR CONFECCION DE LONA PARA PUERTA/.test(t));
  const tipo=bolsaSola?'bolsa suelta':/^PUERTAPLET/.test(r.articulo)||/TRAMO|TRAMOS/.test(t)?'tramo suelto':r.articulo==='PUERTAENR'?'puerta enrollable':r.articulo==='PUERTAPLE'?'puerta plegable':'otro';
  return {...r,tipo,ventanas:/VENTAN|VENTANAL|CRISTAL|TRANSPARENTE/.test(t)&&!/SIN VENTAN/.test(t),impresa:/IMPRES|I\.?D\.?U\.?V|DIGITAL/.test(t),rotulada:/ROTUL|ANAGRAMA|LOGO|CUÑO/.test(t),bolsa:/BOLSA|SACO/.test(t),canutillo:/CANUTILLO/.test(t),medidas};
});
const contar=key=>Object.fromEntries([...new Set(datos.map(key))].sort().map(k=>[k,datos.filter(r=>key(r)===k).length]));
const banderas=['ventanas','impresa','rotulada','bolsa','canutillo'];
const resumen={lineas:datos.length,pedidos:new Set(datos.map(r=>r.pedido)).size,desde:datos.at(-1)?.fecha,hasta:datos[0]?.fecha,
  articulos:contar(r=>r.articulo),anios:contar(r=>r.fecha.slice(0,4)),tipos:contar(r=>r.tipo),
  menciones:Object.fromEntries(banderas.map(k=>[k,{si:datos.filter(r=>r[k]).length,no:datos.filter(r=>!r[k]).length}])),conMedidas:datos.filter(r=>r.medidas.length).length,
  porTipo:Object.fromEntries([...new Set(datos.map(r=>r.tipo))].map(t=>[t,{lineas:datos.filter(r=>r.tipo===t).length,...Object.fromEntries(banderas.map(k=>[k,datos.filter(r=>r.tipo===t&&r[k]).length]))}]))};
fs.writeFileSync(`${dir}/historico.json`,JSON.stringify(datos,null,2));
fs.writeFileSync(`${dir}/resumen-rps.json`,JSON.stringify(resumen,null,2));
console.log(JSON.stringify(resumen,null,2));
if(process.argv.includes('--cad')){
  // El CAD del pedido en estudio no es evidencia, aunque permanezca una copia local sin revisar.
  const dibujos=fs.readdirSync(`${dir}/dxf`).filter(n=>n.endsWith('.dxf')&&!n.includes('5365')).map(nombre=>{
    const contenido=fs.readFileSync(`${dir}/dxf/${nombre}`);
    return {nombre,sha256:crypto.createHash('sha256').update(contenido).digest('hex'),rs:registrosDxf(contenido.toString('latin1')).filter(r=>valor(r,67)!=='1')};
  });
  // Ayuda para separar plantillas repetidas: nunca da por bueno un plano o revisión por esta frecuencia.
  const clave=r=>JSON.stringify([r.tipo,valor(r,10),valor(r,20),valor(r,1),valor(r,42)]),cuentas=new Map();
  for(const d of dibujos)for(const k of new Set(d.rs.filter(r=>['DIMENSION','TEXT','MTEXT'].includes(r.tipo)).map(clave)))cuentas.set(k,(cuentas.get(k)??0)+1);
  const evidencia=dibujos.map(d=>({archivo:d.nombre,sha256:d.sha256,
    cotasSingulares:d.rs.filter(r=>r.tipo==='DIMENSION'&&cuentas.get(clave(r))<=2).map(r=>({capa:valor(r,8),x:Number(valor(r,10)),y:Number(valor(r,20)),medida:Number(valor(r,42)),rotulo:valor(r,1)??''})),
    textosSingulares:d.rs.filter(r=>['TEXT','MTEXT'].includes(r.tipo)&&cuentas.get(clave(r))<=2).map(r=>({x:Number(valor(r,10)),y:Number(valor(r,20)),texto:valor(r,1)??''}))}));
  fs.writeFileSync(`${dir}/evidencia-cad.json`,JSON.stringify(evidencia,null,2));
  console.log(`${evidencia.length} DXF históricos inventariados; 5365 excluido. Hashes, cotas y textos singulares en ${dir}/evidencia-cad.json`);
}
if(process.argv.includes('--plantilla')){
  const archivo=`${dir}/plantilla/ARAUJO.dxf`,contenido=fs.readFileSync(archivo);
  const rs=registrosDxf(textoDxf(contenido)).filter(r=>valor(r,67)!=='1');
  const evidencia={archivo,sha256:crypto.createHash('sha256').update(contenido).digest('hex'),
    textos:rs.filter(r=>['TEXT','MTEXT','ATTRIB'].includes(r.tipo)).map(r=>({id:valor(r,5),x:Number(valor(r,10)),y:Number(valor(r,20)),texto:limpiarTextoDxf(r.pares.filter(([c])=>c===1||c===3).map(([,s])=>s).join(''))})),
    cotas:rs.filter(r=>r.tipo==='DIMENSION').map(r=>({id:valor(r,5),capa:valor(r,8),x:Number(valor(r,10)),y:Number(valor(r,20)),medida:Number(valor(r,42)),rotulo:valor(r,1)??''}))};
  fs.writeFileSync(`${dir}/plantilla/evidencia.json`,JSON.stringify(evidencia,null,2));
  console.log(`Plantilla ARAUJO: ${evidencia.textos.length} textos y ${evidencia.cotas.length} cotas inventariados. Las revisiones se contrastan por su zona, no por frecuencia.`);
}
