// Lo ejecuta Iván: SELECT sobre las conexiones ya configuradas del histórico.
// Sin --exportar solo prepara la consulta: no lee configuración ni abre conexiones.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(import.meta.dirname, '..');
const proyectoHistorico = 'C:/Users/ivan.sanchez/Documents/Proyectos DEV/historial-pedido-hecho';
const desde = '2025-01-01';
const hasta = '2027-01-01';

export function normalizarPedidos(pedidos) {
  const normalizados = pedidos.map(p => String(p).toUpperCase().replace(/[.\s]/g, ''));
  if (normalizados.some(p => !/^(AR|SA)\d{7}$/.test(p))) throw new Error('Número de pedido documental inválido.');
  return [...new Set(normalizados)].sort();
}

export function crearConsultas(pedidos) {
  const controles = normalizarPedidos(pedidos);
  // Cada valor va en un parámetro; nunca se concatena el número a SQL.
  const parametros = controles.map((_, i) => '@documento' + i);
  const pedidoDocumental = parametros.length
    ? `REPLACE(REPLACE(UPPER(o.CodOrder), '.', ''), ' ', '') IN (${parametros.join(', ')})`
    : '1 = 0';
  const texto = `CONCAT(l.Description, N' ', l.Comment, N' ', a.Description, N' ', o.Comment) COLLATE Latin1_General_CI_AI`;
  const rps = `WITH lineas AS (
    SELECT o.IDOrder id_pedido, l.IDOrderLine id_linea, o.CodOrder numero_pedido,
      CONVERT(varchar(10), o.OrderDate, 120) fecha, l.NumLine numero_linea,
      c.CodCustomer codigo_cliente,
      LTRIM(RTRIM(COALESCE(NULLIF(c.CompanyName, ''), c.Description))) cliente,
      a.CodArticle codigo_articulo, a.Description articulo,
      l.Description descripcion, l.Comment observaciones_linea,
      o.Comment observaciones_pedido, l.Quantity cantidad,
      mo.CodManufacturingOrder orden_fabricacion, mo.Notes notas_of,
      CASE WHEN ${pedidoDocumental} THEN 1 ELSE 0 END pedido_documental,
      CASE
        WHEN a.CodArticle COLLATE Latin1_General_CI_AI LIKE N'%FALD%' THEN 'articulo-faldon'
        WHEN ${texto} LIKE N'%FALDON%' THEN 'texto-faldon'
        WHEN ${texto} LIKE N'%FRONTAL%' THEN 'texto-frontal'
        ELSE 'contexto-del-pedido'
      END motivo_linea
    FROM dbo.FACOrderSL o
    JOIN dbo.FACOrderLineSL l ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
    JOIN dbo.FACCustomer c ON c.IDCustomer = o.IDCustomer AND c.CodCompany = o.CodCompany
    LEFT JOIN dbo.STKArticle a ON a.IDArticle = l.IDArticle AND a.CodCompany = l.CodCompany
    LEFT JOIN dbo.CPRManufacturingOrder mo
      ON mo.IDManufacturingOrder = l.IDManufacturingOrder AND mo.CodCompany = l.CodCompany
    WHERE o.CodCompany = @empresa AND o.OrderDate >= @desde AND o.OrderDate < @hasta
  ), seleccionados AS (
    SELECT DISTINCT id_pedido FROM lineas
    WHERE pedido_documental = 1 OR motivo_linea <> 'contexto-del-pedido'
  )
  SELECT l.* FROM lineas l JOIN seleccionados s ON s.id_pedido = l.id_pedido
  ORDER BY l.fecha, l.numero_pedido, l.numero_linea, l.id_linea`;
  const historico = `SELECT p.id, p.numero_pedido, p.rps_numero_linea, p.fecha,
      c.codigo_cliente, c.nombre cliente, f.nombre familia, t.nombre tecnico,
      p.tipo, p.largo, p.ancho, p.alto, p.alto_delante, p.alto_atras,
      p.aguas, p.radio, p.recogida_delante, p.recogida_atras,
      p.impresion_digital, p.observaciones, p.estado_planteo,
      p.datos_tecnicos, p.datos_tecnicos_version
    FROM historico.pedidos p
    JOIN historico.clientes c ON c.id = p.cliente_id
    JOIN historico.familias f ON f.id = p.familia_id
    LEFT JOIN historico.tecnicos t ON t.id = p.tecnico_id
    WHERE ((p.fecha >= @desde AND p.fecha < @hasta)
      OR (p.fecha IS NULL AND (REPLACE(p.numero_pedido, '.', '') LIKE 'AR25%'
        OR REPLACE(p.numero_pedido, '.', '') LIKE 'AR26%'
        OR REPLACE(p.numero_pedido, '.', '') LIKE 'SA25%'
        OR REPLACE(p.numero_pedido, '.', '') LIKE 'SA26%')))
      AND (f.nombre COLLATE Latin1_General_CI_AI LIKE N'%FALD%'
        OR f.nombre COLLATE Latin1_General_CI_AI LIKE N'%FRONTAL%'
        OR CONCAT(p.observaciones, N' ', p.datos_tecnicos) COLLATE Latin1_General_CI_AI LIKE N'%FALDON%'
        OR CONCAT(p.observaciones, N' ', p.datos_tecnicos) COLLATE Latin1_General_CI_AI LIKE N'%FRONTAL%'
        OR REPLACE(REPLACE(UPPER(p.numero_pedido), '.', ''), ' ', '') IN (${parametros.length ? parametros.join(', ') : "N''"}))
    ORDER BY p.fecha, p.numero_pedido, p.rps_numero_linea, p.id`;
  return { rps, historico, controles };
}

export function comprobarSoloLectura(consulta) {
  if (!/^\s*(SELECT\b|WITH\b)/i.test(consulta)
      || /\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|EXEC(?:UTE)?|INTO)\b/i.test(consulta)) {
    throw new Error('La consulta no supera la comprobación de solo lectura.');
  }
}

function configuracion(entorno, prefijo) {
  const obligatorias = ['HOST', 'DATABASE', 'USER', 'PASSWORD'];
  const ausentes = obligatorias.filter(k => !entorno[prefijo + k]);
  if (ausentes.length) throw new Error('Faltan variables: ' + ausentes.map(k => prefijo + k).join(', '));
  return {
    server: entorno[prefijo + 'HOST'], port: Number(entorno[prefijo + 'PORT'] || 1433),
    database: entorno[prefijo + 'DATABASE'], user: entorno[prefijo + 'USER'], password: entorno[prefijo + 'PASSWORD'],
    options: { encrypt: entorno[prefijo + 'ENCRYPT'] === 'true', trustServerCertificate: entorno[prefijo + 'TRUST_SERVER_CERT'] !== 'false', readOnlyIntent: true },
    pool: { min: 0, max: 1, idleTimeoutMillis: 10000 }, requestTimeout: 180000,
  };
}

async function consultar(sql, config, consulta, controles) {
  comprobarSoloLectura(consulta);
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const peticion = pool.request();
    peticion.input('empresa', sql.VarChar(3), '001');
    peticion.input('desde', sql.Date, desde);
    peticion.input('hasta', sql.Date, hasta);
    controles.forEach((p, i) => peticion.input('documento' + i, sql.VarChar(20), p));
    return (await peticion.query(consulta)).recordset;
  } finally { await pool.close(); }
}

export async function ejecutar(args = process.argv.slice(2)) {
  const permitidos = new Set(['--exportar', '--dry-run', '--help']);
  if (args.some(a => !permitidos.has(a)) || (args.includes('--exportar') && args.includes('--dry-run'))) {
    throw new Error('Uso: node scripts/exportar-historico-faldones.mjs [--dry-run | --exportar]');
  }
  if (args.includes('--help')) {
    console.log('Sin --exportar: comprueba las consultas sin configuración ni conexiones.');
    console.log('--exportar: Iván consulta RPS e histórico con la configuración de historial-pedido-hecho; guarda JSON nuevo dentro de tmp/faldones-frontales/exportaciones.');
    return;
  }
  const indice = JSON.parse(await fs.readFile(path.join(raiz, 'docs/modelos/faldones-frontales-indice.json'), 'utf8'));
  const muestra = JSON.parse(await fs.readFile(path.join(raiz, 'docs/modelos/faldones-frontales-evidencias.json'), 'utf8'));
  const consultas = crearConsultas([...indice.candidatos.map(p => p.pedidoPorNombre), ...muestra.casos.map(p => p.pedido)]);
  comprobarSoloLectura(consultas.rps); comprobarSoloLectura(consultas.historico);
  if (!args.includes('--exportar')) {
    console.log(JSON.stringify({ modo: 'dry-run', desde, hastaExclusivo: hasta, empresa: '001', pedidosDocumentales: consultas.controles.length,
      consultas: ['RPS: pedidos coincidentes y todas sus líneas de contexto', 'Histórico: datos técnicos y estado, si su conexión está configurada'],
      conexionAbierta: false, configuracionLeida: false, archivosGenerados: false }, null, 2));
    return;
  }
  // Este bloque solo se ejecuta cuando Iván lanza el comando con --exportar.
  // Se leen las variables de la aplicación existente; nunca se imprimen ni se exportan.
  let entorno = {};
  for (const nombre of ['.env', '.env.local']) {
    try { Object.assign(entorno, parseEnv(await fs.readFile(path.join(proyectoHistorico, nombre), 'utf8'))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  Object.assign(entorno, process.env);
  const require = createRequire(path.join(proyectoHistorico, 'package.json'));
  const sql = require('mssql');
  const rpsConfig = configuracion(entorno, 'RPS_SQLSERVER_');
  const lineas = await consultar(sql, rpsConfig, consultas.rps, consultas.controles);
  let historico = { estado: 'sin-configuracion', pedidos: [] };
  if (['HOST', 'DATABASE', 'USER', 'PASSWORD'].every(k => entorno['SQLSERVER_' + k])) {
    try {
      historico = { estado: 'exportado', pedidos: await consultar(sql, configuracion(entorno, 'SQLSERVER_'), consultas.historico, consultas.controles) };
    } catch (error) {
      historico = { estado: 'error-consulta', codigo: String(error.code || 'DESCONOCIDO'), pedidos: [] };
      console.warn('RPS exportado; no se ha podido añadir el histórico técnico. El JSON indica esta limitación.');
    }
  }
  const exportado = new Date().toISOString();
  const salida = path.join(raiz, 'tmp/faldones-frontales/exportaciones', 'historico-faldones-2025-2026-' + exportado.replace(/[:.]/g, '-') + '.json');
  const contenido = {
    version: 1, exportado, periodo: { desde, hastaExclusivo: hasta }, empresa: '001',
    alcance: 'Censo amplio: artículos con FALD y textos con FALDON/FRONTAL, sin distinguir mayúsculas ni acentos, más pedidos del inventario documental. Incluye todas las líneas de los pedidos seleccionados y no filtra por existencia de OF o plano.',
    limite: 'Las coincidencias incluyen otros productos; las líneas de contexto no son automáticamente faldones. El histórico técnico no sustituye las líneas de ventas de RPS. Cantidades comerciales no acreditan por sí solas fabricación.',
    pedidosDocumentales: consultas.controles,
    rps: { pedidos: new Set(lineas.map(l => l.id_pedido)).size, lineas }, historico,
  };
  await fs.mkdir(path.dirname(salida), { recursive: true });
  await fs.writeFile(salida, JSON.stringify(contenido, null, 2) + '\n', { flag: 'wx' });
  console.log(`${contenido.rps.pedidos} pedidos; ${lineas.length} líneas RPS; ${historico.pedidos.length} registros técnicos (${historico.estado}).`);
  console.log('Guardado en: ' + salida);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ejecutar().catch(error => {
    // No volcar objetos del controlador ni configuración de conexión.
    const mensaje = /^(Uso:|Faltan variables:|Número de pedido|La consulta)/.test(error.message)
      ? error.message : 'No se ha completado la exportación. Código: ' + String(error.code || 'DESCONOCIDO');
    console.error(mensaje); process.exitCode = 1;
  });
}
