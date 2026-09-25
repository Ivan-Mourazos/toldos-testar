/**
 * Contrasta contra RPS todas las referencias de artículo que el dominio puede
 * emitir, para que ninguna reserva ni despiece salga con un código dado de baja
 * o inexistente.
 *
 * Mira dos cosas distintas:
 *  - Las literales escritas en los ficheros de reglas.
 *  - Las que se componen al vuelo, calculando los casos válidos de cada modelo
 *    en cada lacado del catálogo. Aquí es donde se esconden los fallos, porque
 *    una referencia mal compuesta solo aparece con un color o un largo concreto.
 *
 * Falla si hay códigos rotos en blanco o negro. En los demás lacados informa por
 * modelo: puede ser un color que ya no se ofrece, y eso se decide modelo a modelo.
 *
 * Uso: node scripts/validate-rps-references.mjs ["MODELO"]
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sql from 'mssql';
import { config } from '../src/config.js';
import { lacadoNames } from '../src/domain/lacados.js';
import { fullAwningModelNames, sampleAwnings } from './lib/model-samples.mjs';
import { groupProblems, isPrefixOfExisting } from './lib/rps-references.mjs';

// Referencias que la aplicación emite a sabiendas de que no están en el maestro,
// con el motivo. Cualquier otra que aparezca es un fallo.
const aceptadas = new Map([
  ['VARILLAMAXSCR8MM', 'Maxiscreem con guía de varilla: de baja en RPS y sin relevo localizado. Pendiente de que compras diga qué se monta hoy.'],
  ['CURRONMOPLBLAN', 'Currón Monobloc Plus blanco: de baja en RPS. El negro sigue activo, el blanco no tiene relevo con consumo.'],
]);

const palabras = new Set([
  'BAMBALINA', 'COMPENSADORA', 'ENROLLABLE', 'HORIZONTAL', 'MAXISCREEM', 'MOVIMIENTO',
  'TERMINADA', 'VERTICAL', 'ESTANDAR', 'STANDARD', 'INTERIOR', 'EXTERIOR', 'FINISHED'
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

// TURA80HG o TA3BLAN4X4 son el principio de un código que se completa con el largo.
for (const literal of [...literales.keys()]) {
  if (isPrefixOfExisting(literal, maestro)) literales.delete(literal);
}

// Solo casos válidos de cada modelo: probar salidas o variantes imposibles
// llenaba el informe de brazos que nadie puede pedir (BPRT07…150C).
const found = new Map();
const anota = (code, lugar) => {
  const clean = String(code || '').toUpperCase();
  if (!clean) return;
  if (!found.has(clean)) found.set(clean, new Set());
  found.get(clean).add(lugar);
};
const soloModelo = process.argv[2] ? process.argv[2].toUpperCase() : null;
for (const model of fullAwningModelNames.filter((m) => !soloModelo || m === soloModelo)) {
  for (const lacado of lacadoNames) {
    for (const { result } of sampleAwnings(model, lacado)) {
      const block = result.ofs[0];
      for (const line of block.materials) anota(line.code, `${model}/${lacado}`);
      // El despiece también se imprime y el taller lo lee: un código roto ahí confunde igual.
      for (const row of block.despiece?.rows || []) anota(row.reference, `${model}/${lacado}`);
    }
  }
}
if (!soloModelo) {
  for (const [code, ficheros] of literales) {
    for (const fichero of ficheros) anota(code, `${fichero}/literal`);
  }
}

const { porModelo, fallanHabituales } = groupProblems({ found, maestro, aceptadas });
console.log(JSON.stringify({ referencias: found.size, porModelo }, null, 2));
for (const [model, { habituales, otros }] of Object.entries(porModelo)) {
  const rotas = habituales.filter((p) => !p.aceptada).map((p) => `${p.code} (${p.estado})`);
  if (rotas.length) console.error(`${model} en blanco/negro: ${rotas.join(', ')}`);
  if (otros.length) console.error(`${model}: ${otros.length} códigos rotos en otros lacados`);
}
if (fallanHabituales) {
  console.error(`\n${fallanHabituales} referencias rotas en blanco o negro. La reserva saldría con códigos que RPS no tiene.`);
  process.exitCode = 1;
}
