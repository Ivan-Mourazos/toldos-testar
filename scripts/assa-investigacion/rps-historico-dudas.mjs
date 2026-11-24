// Consulta histórica (2021-2026) de COMBURSA en RPS para Q-AS0711-02, Q-AS0711-03, Q-AS0711-04 y Q-AS0711-05.
// Solo SELECT. No arranca la web ni escribe fuera de tmp/.
import fs from 'node:fs/promises';
import { getRpsPoolForRemolques } from '../../src/rpsCatalog.js';
import { config } from '../../src/config.js';
import { CONSULTA_LOTE } from '../../src/assa/rps.js';

const destino = new URL('../../tmp/assa-dudas/', import.meta.url);
const pool = await getRpsPoolForRemolques();
if (!pool) throw new Error('RPS no está configurado.');

const consulta = async sql => {
  const req = pool.request().input('company', config.db.company);
  return (await req.query(sql)).recordset;
};

const seleccionRango = (desde, hasta) =>
  CONSULTA_LOTE.slice(0, CONSULTA_LOTE.lastIndexOf('ORDER BY'))
    .replace('l.ReceptionDemandDate = @fecha', `l.ReceptionDemandDate >= '${desde}' AND l.ReceptionDemandDate < '${hasta}'`);

const familiasObjetivo = `
  RIGHT(base.CodArticle, 11) IN (
    '410129-0117','410130-0175','420102-0021','420148-0040',
    '430129-0002','430172-0005','430172-0034','410170-0001','410171-0001'
  )
  OR LEFT(RIGHT(base.CodArticle, 11), 6) IN ('410129','410130','410170','410171','410172','410173')
`;

try {
  const lineas = [], materiales = [], bultos = [];
  for (const anio of [2021, 2022, 2023, 2024, 2025, 2026]) {
    for (const [m0, m1] of [['0101', '0701'], ['0701', '1232']]) {
      const desde = `${anio}${m0}`, hasta = m1 === '1232' ? `${anio + 1}0101` : `${anio}${m1}`;
      const sel = seleccionRango(desde, hasta);
      const ls = await consulta(`SELECT base.*, o.Comment comentarioPedido, mo.Notes notasOf,
        mo.Quantity cantidadOf, CONVERT(varchar(10), mo.RealEndDate, 120) finReal,
        CONVERT(varchar(10), o.OrderDate, 120) fechaPedido
        FROM (${sel}) base
        JOIN dbo.FACOrderSL o ON o.CodCompany=@company AND o.IDOrder=base.IDOrder
        LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.CodCompany=@company AND mo.CodManufacturingOrder=base.of_
        WHERE ${familiasObjetivo}
        ORDER BY base.entregaSolicitada, base.CodOrder, base.NumLine`);
      lineas.push(...ls);

      const ms = await consulta(`WITH base AS (${sel})
        SELECT base.IDOrderLine, base.CodOrder, base.NumLine, base.CodArticle, base.cantidad, base.of_,
          CONVERT(varchar(10), mo.RealEndDate, 120) finReal,
          a.CodArticle codigo, a.Description descripcion,
          SUM(m.Quantity) consumo, SUM(m.QuantitySecondUnit) segundaCantidad
        FROM base
        JOIN dbo.CPRManufacturingOrder mo ON mo.CodCompany=@company AND mo.CodManufacturingOrder=base.of_
        JOIN dbo.CPRImputationMaterialMO m ON m.CodCompany=mo.CodCompany AND m.IDManufacturingOrder=mo.IDManufacturingOrder
        JOIN dbo.STKArticle a ON a.CodCompany=m.CodCompany AND a.IDArticle=m.IDArticle
        WHERE ${familiasObjetivo}
        GROUP BY base.IDOrderLine, base.CodOrder, base.NumLine, base.CodArticle, base.cantidad, base.of_, mo.RealEndDate, a.CodArticle, a.Description
        ORDER BY base.IDOrderLine, a.CodArticle`);
      materiales.push(...ms);

      const bs1 = await consulta(`WITH base AS (${sel})
        SELECT b0.IDOrderLine, b0.CodOrder, b0.NumLine, b0.CodArticle, b0.cantidad cantidadPedido,
          b0.entregaSolicitada, b0.of_,
          p.CodPackingList lista, CONVERT(varchar(10), p.PackingDate, 120) fechaLista, p.Finished cerrada,
          b.BoxNumber numero, b.Comment comentario, p.Comment comentarioLista, bd.Quantity cantidad, 'pedido' enlace,
          bd.IDPackingListBoxDetail
        FROM base b0
        JOIN dbo.FACPackingListBoxDetailSL bd ON bd.CodCompany=@company AND bd.IDOrderLine=b0.IDOrderLine
        JOIN dbo.FACPackingListBoxSL b ON b.CodCompany=bd.CodCompany AND b.IDPackingListBox=bd.IDPackingListBox
        JOIN dbo.FACPackingListSL p ON p.CodCompany=b.CodCompany AND p.IDPackingList=b.IDPackingList`);
      const bs2 = await consulta(`WITH base AS (${sel})
        SELECT b0.IDOrderLine, b0.CodOrder, b0.NumLine, b0.CodArticle, b0.cantidad cantidadPedido,
          b0.entregaSolicitada, b0.of_,
          p.CodPackingList lista, CONVERT(varchar(10), p.PackingDate, 120) fechaLista, p.Finished cerrada,
          b.BoxNumber numero, b.Comment comentario, p.Comment comentarioLista, bd.Quantity cantidad, 'albarán' enlace,
          bd.IDPackingListBoxDetail
        FROM base b0
        JOIN dbo.FACDeliveryNoteLineSL d ON d.CodCompany=@company AND d.IDOrderLine=b0.IDOrderLine
        JOIN dbo.FACPackingListBoxDetailSL bd ON bd.CodCompany=@company AND bd.IDDeliveryNoteLine=d.IDDeliveryNoteLine
        JOIN dbo.FACPackingListBoxSL b ON b.CodCompany=bd.CodCompany AND b.IDPackingListBox=bd.IDPackingListBox
        JOIN dbo.FACPackingListSL p ON p.CodCompany=b.CodCompany AND p.IDPackingList=b.IDPackingList
        WHERE bd.IDOrderLine IS NULL OR bd.IDOrderLine<>b0.IDOrderLine`);
      const bs = [...bs1, ...bs2];
      bultos.push(...bs);
      console.log(`${desde}-${hasta}: ${ls.length} líneas, ${ms.length} materiales, ${bs.length} bultos`);
    }
  }

  const articulos = await consulta(`SELECT CodArticle, Description, Notes, TechnicalDescription
    FROM dbo.STKArticle
    WHERE CodCompany=@company AND (
      RIGHT(CodArticle, 11) IN (
        '410129-0117','410130-0175','420102-0021','420148-0040',
        '430129-0002','430172-0005','430172-0034','410170-0001','410171-0001'
      )
      OR CodArticle LIKE '%410129-0117%' OR CodArticle LIKE '%410130-0175%'
      OR CodArticle LIKE '%410170-0001%' OR CodArticle LIKE '%410171-0001%'
    )
    ORDER BY CodArticle`);

  await fs.mkdir(destino, { recursive: true });
  await fs.writeFile(new URL('rps-historico.json', destino), JSON.stringify({
    recogido: new Date().toISOString(),
    lineas,
    materiales,
    bultos,
    articulos,
  }, null, 2));
  console.log(`TOTAL guardado: ${lineas.length} líneas, ${materiales.length} materiales, ${bultos.length} bultos, ${articulos.length} artículos`);
} finally {
  await pool.close();
}
