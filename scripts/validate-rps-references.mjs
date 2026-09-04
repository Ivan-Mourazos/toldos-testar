/**
 * Contrasta contra RPS todas las referencias de artículo que el dominio puede
 * emitir, para que ninguna reserva salga con un código dado de baja o
 * inexistente.
 *
 * Mira dos cosas distintas:
 *  - Las literales escritas en los ficheros de reglas.
 *  - Las que se componen al vuelo, calculando un toldo de cada modelo en cada
 *    lacado del catálogo. Aquí es donde se esconden los fallos, porque una
 *    referencia mal compuesta solo aparece con un color concreto.
 *
 * Una referencia de baja no bloquea la reserva en RPS, así que este fallo no
 * salta solo: hay que buscarlo. De ahí este script.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sql from 'mssql';
import { config } from '../src/config.js';
import { calculateOrder } from '../src/domain/rules.js';
import { lacadoNames } from '../src/domain/lacados.js';
import { fullAwningModelNames } from '../src/domain/modelBehavior.js';

// Referencias que la aplicación emite a sabiendas de que no están en el maestro,
// con el motivo. Cualquier otra que aparezca es un fallo.
const aceptadas = new Map([
  ['VARILLAMAXSCR8MM', 'Maxiscreem con guía de varilla: de baja en RPS y sin relevo localizado. Pendiente de que compras diga qué se monta hoy.'],
  ['CURRONMOPLBLAN', 'Currón Monobloc Plus blanco: de baja en RPS. El negro sigue activo, el blanco no tiene relevo con consumo.']
]);

const palabras = new Set([
  'BAMBALINA', 'COMPENSADORA', 'ENROLLABLE', 'HORIZONTAL', 'MAXISCREEM', 'MOVIMIENTO',
  'TERMINADA', 'VERTICAL', 'ESTANDAR'
]);

const domainDir = 'src/domain';
const literales = new Map();
for (const file of readdirSync(domainDir).filter((n) => n.endsWith('Rules.js'))) {
  const src = readFileSync(path.join(domainDir, file), 'utf8');
  for (const match of src.matchAll(/'([A-Z][A-Z0-9/]{7,24})'/g)) {
    const code = match[1];
    // Palabras del propio código, no referencias. Las referencias reales todo-letras
    // (CASPLAS, CURRONMOPLBLAN) sí deben entrar, así que se filtra por lista.
    if (palabras.has(code)) continue;
    if (!literales.has(code)) literales.set(code, new Set());
    literales.get(code).add(file.replace('Rules.js', ''));
  }
}

const pool = await new sql.ConnectionPool({
  server: config.db.server, port: config.db.port, user: config.db.user, password: config.db.password,
  database: config.db.database, options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 8_000, requestTimeout: 60_000
}).connect();
const maestro = await pool.request().input('company', sql.VarChar(10), config.db.company)
  .query('SELECT a.CodArticle, a.InactiveDate FROM dbo.STKArticle a WHERE a.CodCompany = @company;')
  .then((r) => new Map(r.recordset.map((row) => [row.CodArticle.toUpperCase(), row.InactiveDate])));
await pool.close();

const estado = (code) => {
  if (!maestro.has(code)) return 'no existe en el maestro';
  const baja = maestro.get(code);
  return baja ? `de baja el ${String(baja).slice(4, 15)}` : '';
};

const base = {
  id: 'a', of: '0000000', units: 1, width: 300, projection: 250, valanceHeight: 0,
  machineSide: 'M.F.DER', crankHeight: 150, placement: 'FRONTAL', wallType: '', sensor: 'SIN SENSOR',
  rotFabric: 'NO', rotValance: 'NO', curtainHasWindow: false, curtainFinish: 'NORMAL',
  tubeLoad: 'TUBO DE CARGA UNIVERS 280', armCount: 2, reglasModificadas: false,
  irisGuideType: 'ESTÁNDAR', irisGuideFixing: 'PARED', irisAssumeSquare: true,
  irisFrontTop: 300, irisExitLeft: 250
};
const submodelos = {
  ELECTRA: 'SIN COFRE / CON GUÍA', IRIS: 'IRIS 110 CON COFRE', HERA: 'HERA 43 MAQUINA',
  MAXISCREEM: 'COFRE / VARILLA', 'AGATA BOX': 'SEMI BOX'
};
const compuestas = new Map();
for (const model of fullAwningModelNames) {
  for (const lacado of lacadoNames) {
    for (const device of ['MAQUINA', 'MAQ. INTERIOR', 'MOTOR']) {
      let result;
      try {
        result = calculateOrder({
          orderCode: 'AUDIT', sameFabric: true, fabric: 'ACRILI2170P120|||120|||ACR NEGRO',
          structureColor: lacado,
          awnings: [{ ...base, model, device, structureColor: lacado,
            submodel: submodelos[model] || '', electraSupport: 'SOPORTE ELIT VERTICAL' }]
        });
      } catch { continue; }
      for (const line of result.ofs[0]?.materials || []) {
        const code = String(line.code || '').toUpperCase();
        if (!code || literales.has(code)) continue;
        if (!compuestas.has(code)) compuestas.set(code, new Set());
        compuestas.get(code).add(`${model}/${lacado}`);
      }
    }
  }
}

const problemas = [];
for (const [origen, mapa] of [['literal', literales], ['compuesta', compuestas]]) {
  for (const [code, quien] of mapa) {
    const mal = estado(code);
    if (!mal) continue;
    problemas.push({ code, origen, estado: mal, donde: [...quien].slice(0, 6), aceptada: aceptadas.get(code) || null });
  }
}
// Un artículo DE BAJA existió y se retiró: reservarlo es un error seguro.
// Uno que no existe puede ser un lacado que nadie ha pedido nunca y que se daría
// de alta cuando llegue el primero, así que se informa pero no se falla.
const deBaja = problemas.filter((p) => !p.aceptada && p.estado.startsWith('de baja'));
const sinAlta = problemas.filter((p) => !p.aceptada && !p.estado.startsWith('de baja'));

console.log(JSON.stringify({
  referenciasLiterales: literales.size,
  referenciasCompuestas: compuestas.size,
  aceptadasConMotivo: problemas.filter((p) => p.aceptada),
  deBajaEnRps: deBaja,
  sinAltaEnRps: { total: sinAlta.length, referencias: sinAlta }
}, null, 2));

if (deBaja.length) {
  console.error(`\n${deBaja.length} referencias dadas de baja en RPS. La reserva saldría con códigos muertos.`);
  process.exitCode = 1;
}
if (sinAlta.length) {
  console.error(`${sinAlta.length} referencias sin alta en el maestro. Algunas serán lacados que nadie ha pedido; otras, piezas que nunca se reservaron y hay que dar de alta.`);
}
