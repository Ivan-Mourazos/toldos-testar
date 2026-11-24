// Foto de COMBURSA para el contraste histórico. Solo SELECT, sin arrancar la web.
import fs from 'node:fs/promises';
import { getRpsPoolForRemolques } from '../../src/rpsCatalog.js';
import { config } from '../../src/config.js';
import { CONSULTA_LOTE } from '../../src/assa/rps.js';

const destino = new URL('../../tmp/assa-0711-historico/', import.meta.url);
const pool = await getRpsPoolForRemolques();
if (!pool) throw new Error('RPS no está configurado.');

const consulta = async sql => (await pool.request().input('company', config.db.company).query(sql)).recordset;
// Las mismas tres cuentas y la misma fecha solicitada por línea que usa la web.
const seleccion = CONSULTA_LOTE.slice(0, CONSULTA_LOTE.lastIndexOf('ORDER BY'))
  .replace('l.ReceptionDemandDate = @fecha', "l.ReceptionDemandDate >= '20250101' AND l.ReceptionDemandDate < '20270101'");
const referencias = "('410129-0117','410130-0175','420102-0021','420148-0040','430129-0002',"
  + "'430172-0005','430172-0034','410170-0001','410171-0001')";
try {
  const lineas = await consulta(`SELECT base.*, o.Comment comentarioPedido, mo.Notes notasOf,
    mo.Quantity cantidadOf, CONVERT(varchar(10),mo.RealEndDate,120) finReal
    FROM (${seleccion}) base
    JOIN dbo.FACOrderSL o ON o.CodCompany=@company AND o.IDOrder=base.IDOrder
    LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.CodCompany=@company AND mo.CodManufacturingOrder=base.of_
    ORDER BY base.entregaSolicitada, base.CodOrder, base.NumLine`);
  console.log(`${lineas.length} líneas leídas.`);
  const expedicion = await consulta(`WITH lineas AS (${seleccion})
    SELECT l.IDOrderLine, v.CodDeliveryNote albaran, d.Quantity cantidad, d.Comment comentario
    FROM lineas l
    JOIN dbo.FACDeliveryNoteLineSL d ON d.CodCompany=@company AND d.IDOrderLine=l.IDOrderLine
    JOIN dbo.FACDeliveryNoteSL v ON v.CodCompany=d.CodCompany AND v.IDDeliveryNote=d.IDDeliveryNote`);
  console.log(`${expedicion.length} albaranes de línea leídos.`);
  const bultos = await consulta(`WITH lineas AS (${seleccion}), enlaces AS (
    SELECT l.IDOrderLine, bd.IDPackingListBoxDetail, 'pedido' enlace
    FROM lineas l JOIN dbo.FACPackingListBoxDetailSL bd ON bd.CodCompany=@company AND bd.IDOrderLine=l.IDOrderLine
    UNION ALL
    SELECT l.IDOrderLine, bd.IDPackingListBoxDetail, 'albarán'
    FROM lineas l
    JOIN dbo.FACDeliveryNoteLineSL d ON d.CodCompany=@company AND d.IDOrderLine=l.IDOrderLine
    JOIN dbo.FACPackingListBoxDetailSL bd ON bd.CodCompany=@company AND bd.IDDeliveryNoteLine=d.IDDeliveryNoteLine
    WHERE bd.IDOrderLine IS NULL OR bd.IDOrderLine<>l.IDOrderLine
    )
    SELECT l.IDOrderLine, p.CodPackingList lista, p.PackingDate fecha, p.Finished cerrada,
      b.BoxNumber numero, b.Comment comentario, p.Comment comentarioLista, bd.Quantity cantidad, l.enlace
    FROM enlaces l
    JOIN dbo.FACPackingListBoxDetailSL bd ON bd.CodCompany=@company AND bd.IDPackingListBoxDetail=l.IDPackingListBoxDetail
    JOIN dbo.FACPackingListBoxSL b ON b.CodCompany=bd.CodCompany AND b.IDPackingListBox=bd.IDPackingListBox
    JOIN dbo.FACPackingListSL p ON p.CodCompany=b.CodCompany AND p.IDPackingList=b.IDPackingList
    ORDER BY l.IDOrderLine,p.CodPackingList,b.BoxNumber`);
  console.log(`${bultos.length} detalles de bulto leídos.`);
  const materiales = await consulta(`WITH lineas AS (${seleccion})
    SELECT l.IDOrderLine, a.CodArticle codigo, a.Description descripcion,
      SUM(m.Quantity) cantidad, SUM(m.QuantitySecondUnit) segundaCantidad
    FROM lineas l
    JOIN dbo.CPRManufacturingOrder mo ON mo.CodCompany=@company AND mo.CodManufacturingOrder=l.of_
    JOIN dbo.CPRImputationMaterialMO m ON m.CodCompany=mo.CodCompany AND m.IDManufacturingOrder=mo.IDManufacturingOrder
    JOIN dbo.STKArticle a ON a.CodCompany=m.CodCompany AND a.IDArticle=m.IDArticle
    WHERE RIGHT(l.CodArticle,11) IN ${referencias}
    GROUP BY l.IDOrderLine,a.CodArticle,a.Description
    ORDER BY l.IDOrderLine,a.CodArticle`);
  await fs.mkdir(destino, { recursive: true });
  await fs.writeFile(new URL('rps.json', destino), JSON.stringify({
    recogido: new Date().toISOString(), lineas, expedicion, bultos, materiales
  }, null, 2));
  console.log(`${lineas.length} líneas, ${expedicion.length} albaranes de línea, ${bultos.length} detalles de bulto y ${materiales.length} materiales.`);
} finally {
  await pool.close();
}
