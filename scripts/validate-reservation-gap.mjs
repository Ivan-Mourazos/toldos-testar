/**
 * Mide, modelo a modelo, la distancia entre lo que la aplicación reserva y lo
 * que el taller consume de verdad.
 *
 * El histórico de `_MaterialesPrevistosOF` NO sirve como contraste: es
 * precisamente lo que está incompleto y lo que se quiere corregir. La fuente
 * buena es `CPRImputationMaterialMO`, que es lo que salió del almacén.
 *
 * Devuelve dos listas por modelo:
 *  - falta: se consume a menudo y no lo reservamos.
 *  - sobra: lo reservamos y no aparece consumido nunca.
 *
 * Ninguna de las dos es automáticamente un fallo. Hay consumo que no es del
 * toldo (embalaje, restos) y hay piezas que se reservan y se montan sin
 * imputar. Es material para decidir el despiece, no un veredicto.
 */
import sql from 'mssql';
import { config } from '../src/config.js';
import { calculateOrder } from '../src/domain/rules.js';

// Artículo de venta de RPS con el que se identifican las OF de cada modelo.
const articuloDeVenta = {
  'ARZUA PRO': "= 'ARZUA'",
  XACOBEO: "= 'XACOBEO'",
  GALICIA: "LIKE 'GALICIA%'",
  'MONOBLOCK 350': "= 'MONOB'",
  ANTICA: "= 'ANTICA'",
  SELENA: "LIKE 'SELENA%'",
  HERA: "LIKE 'HERA%'",
  MAXISCREEM: "LIKE 'DIANA%'",
  ELECTRA: "LIKE 'ELECTR%'",
  IRIS: "LIKE 'IRIS%'"
};

const submodelos = {
  ELECTRA: 'SIN COFRE / CON GUÍA', IRIS: 'IRIS 110 CON COFRE',
  HERA: 'HERA 43 MAQUINA', MAXISCREEM: 'COFRE / VARILLA'
};

const modelo = process.argv[2] ? process.argv[2].toUpperCase() : null;
const objetivo = modelo ? { [modelo]: articuloDeVenta[modelo] } : articuloDeVenta;
if (modelo && !articuloDeVenta[modelo]) {
  console.error(`No sé con qué artículo de venta identificar "${modelo}". Modelos: ${Object.keys(articuloDeVenta).join(', ')}`);
  process.exit(1);
}

const base = {
  id: 'a', of: '0000000', units: 1, width: 300, projection: 250, valanceHeight: 0,
  armCount: 2, machineSide: 'M.F.DER', crankHeight: 150, placement: 'FRONTAL', wallType: '',
  sensor: 'SIN SENSOR', rotFabric: 'NO', rotValance: 'NO', curtainHasWindow: false,
  curtainFinish: 'NORMAL', tubeLoad: 'TUBO DE CARGA UNIVERS 280', reglasModificadas: false,
  irisGuideType: 'ESTÁNDAR', irisGuideFixing: 'PARED', irisAssumeSquare: true,
  irisFrontTop: 300, irisExitLeft: 250, electraSupport: 'SOPORTE ELIT VERTICAL'
};

function loQueReservamos(model) {
  const codes = new Set();
  for (const device of ['MAQUINA', 'MAQ. INTERIOR', 'MOTOR']) {
    for (const lacado of ['BLANCO', 'NEGRO (R-09011)']) {
      let result;
      try {
        result = calculateOrder({
          orderCode: 'GAP', sameFabric: true, fabric: 'ACRILI2170P120|||120|||ACR NEGRO',
          structureColor: lacado,
          awnings: [{ ...base, model, device, structureColor: lacado, submodel: submodelos[model] || '' }]
        });
      } catch { continue; }
      for (const line of result.ofs[0]?.materials || []) codes.add(String(line.code).toUpperCase());
    }
  }
  return codes;
}

// Una referencia es "la misma pieza en otro color o largo" si comparte raíz.
const raiz = (code) => code
  .replace(/(BL\d\d|NE\d\d|NEGRO|BLAN|MR\d\d|VE\d\d|GR\d\d|PL\d\d|O5\d\d|MA\d\d|BU\d\d|NEM\d|NM\d\d|GT\d\d|BR\d\d)?\d{3,4}C$/, '')
  .replace(/(BL\d\d|NE\d\d|NEGRO|BLAN|MR\d\d|VE\d\d|GR\d\d|PL\d\d|O5\d\d|MA\d\d|BU\d\d|NEM\d|NM\d\d|GT\d\d|BR\d\d)$/, '');

const pool = await new sql.ConnectionPool({
  server: config.db.server, port: config.db.port, user: config.db.user, password: config.db.password,
  database: config.db.database, options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 8_000, requestTimeout: 120_000
}).connect();

const informe = {};
for (const [model, filtro] of Object.entries(objetivo)) {
  const consumido = await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
    SELECT a.CodArticle, a.Description, COUNT(DISTINCT mo.IDManufacturingOrder) AS ofs
    FROM dbo.FACOrderSL o
    JOIN dbo.FACOrderLineSL l ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
    JOIN dbo.STKArticle art ON art.IDArticle = l.IDArticle AND art.CodCompany = l.CodCompany
    JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder = l.IDManufacturingOrder AND mo.CodCompany = l.CodCompany
    JOIN dbo.CPRImputationMaterialMO i ON i.IDManufacturingOrder = mo.IDManufacturingOrder AND i.CodCompany = mo.CodCompany
    JOIN dbo.STKArticle a ON a.IDArticle = i.IDArticle AND a.CodCompany = i.CodCompany
    WHERE o.CodCompany = @company AND UPPER(art.CodArticle) ${filtro} AND YEAR(i.ImputationDate) >= 2025
    GROUP BY a.CodArticle, a.Description
    ORDER BY ofs DESC;`).then((r) => r.recordset);

  const nuestras = loQueReservamos(model);
  const nuestrasRaices = new Set([...nuestras].map(raiz));
  const totalOfs = consumido.length ? Math.max(...consumido.map((x) => x.ofs)) : 0;
  const cubierta = (code) => nuestras.has(code.toUpperCase()) || nuestrasRaices.has(raiz(code.toUpperCase()));

  informe[model] = {
    ofsMedidas: totalOfs,
    articulosQueReservamos: nuestras.size,
    // Solo lo que aparece en al menos el 20% de las OF: por debajo suele ser
    // material puntual, sustituciones o reprocesos.
    falta: consumido
      .filter((x) => x.ofs >= Math.max(3, totalOfs * 0.2) && !cubierta(x.CodArticle))
      .map((x) => ({ code: x.CodArticle, ofs: x.ofs, descripcion: x.Description.trim() })),
    sobra: [...nuestras].filter((code) => !consumido.some((x) => raiz(x.CodArticle.toUpperCase()) === raiz(code)))
  };
}
await pool.close();

console.log(JSON.stringify(informe, null, 2));
