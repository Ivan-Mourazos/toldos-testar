// Estudio reproducible de Belts Vigo (038908) y Puertas Luz (052082).
// Solo SELECT a RPS y lectura de carpetas de red; toda copia/conversión va bajo tmp/belts-luz/.
// Uso:
//   node --env-file="C:/Users/ivan.sanchez/Documents/Proyectos DEV/toldos-testar/.env" scripts/estudiar-belts-luz.mjs --rps
//   node scripts/estudiar-belts-luz.mjs --plantillas --recolectar
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sql from 'mssql';
import { crearOdaConverter } from '../src/odaConverter.js';

const DIR = 'tmp/belts-luz';
const ODA_EXE = process.env.ODA_FILE_CONVERTER || 'C:/Users/ivan.sanchez/tools/oda/ODAFileConverter.exe';
const OFICINA_ROOT = '//192.168.0.128/Oftecnica/Oficina Tecnica';
const MAQCORTE_ROOT = '//192.168.0.128/Oftecnica/maqcorte';
const RPS_PEDIDOS_ROOT = '//192.168.0.128/RPS/VENTAS/PEDIDOS';
const RPS_PLANT_ROOT = '//192.168.0.128/RPS/VENTAS/PLANTEAMIENTOS';

fs.mkdirSync(DIR, { recursive: true });
const oda = crearOdaConverter({ executable: ODA_EXE, timeoutMs: 120_000 });
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

if (process.argv.includes('--rps')) {
  const { config } = await import('../src/config.js');
  const pool = await new sql.ConnectionPool({
    server: config.db.server,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 120000,
  }).connect();
  try {
    const cli = await pool.request()
      .input('c', sql.VarChar(10), config.db.company)
      .query(`SELECT CodCustomer, Description, ThirdType
        FROM dbo.FACCustomer
        WHERE CodCompany=@c
          AND (UPPER(Description) LIKE '%BELTS%'
            OR UPPER(Description) LIKE '%PUERTAS LUZ%'
            OR UPPER(Description) LIKE '%SELVA%')
        ORDER BY CodCustomer`);
    fs.writeFileSync(path.join(DIR, 'clientes-rps.json'), JSON.stringify(cli.recordset, null, 2));
    for (const cliente of cli.recordset) {
      const cod = String(cliente.CodCustomer).trim();
      const q = await pool.request()
        .input('c', sql.VarChar(10), config.db.company)
        .input('cli', sql.VarChar(20), cod)
        .query(`SELECT o.CodOrder pedido,
            CONVERT(varchar(10), o.OrderDate, 120) fecha,
            l.NumLine linea,
            a.CodArticle articulo,
            l.Description descripcion,
            l.Comment comentario,
            l.Quantity cantidad,
            CONVERT(varchar(40), mo.CodManufacturingOrder) of_
          FROM dbo.FACOrderSL o
          JOIN dbo.FACCustomer c ON c.IDCustomer=o.IDCustomer AND c.CodCompany=o.CodCompany
          JOIN dbo.FACOrderLineSL l ON l.IDOrder=o.IDOrder AND l.CodCompany=o.CodCompany
          JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
          LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
          WHERE o.CodCompany=@c AND c.CodCustomer=@cli
          ORDER BY o.OrderDate DESC, o.CodOrder DESC, l.NumLine`);
      fs.writeFileSync(path.join(DIR, `rps-${cod}.json`), JSON.stringify(q.recordset, null, 2));
    }
    console.log('RPS guardado en', DIR);
  } finally {
    await pool.close();
  }
}

if (process.argv.includes('--plantillas')) {
  const dwgDir = path.join(DIR, 'plantillas', 'dwg');
  const dxfDir = path.join(DIR, 'plantillas', 'dxf');
  fs.mkdirSync(dwgDir, { recursive: true });
  fs.mkdirSync(dxfDir, { recursive: true });
  const resumen = [];
  for (const nombre of ['BELTS VIGO.dwg', 'PUERTAS LUZ.dwg']) {
    const origen = `${OFICINA_ROOT}/DIBUJOS/PUERTAS/${nombre}`;
    const destinoDwg = path.join(dwgDir, nombre);
    const destinoDxf = path.join(dxfDir, nombre.replace(/\.dwg$/i, '.dxf'));
    const stat = fs.statSync(origen);
    fs.copyFileSync(origen, destinoDwg);
    const dwgBuf = fs.readFileSync(destinoDwg);
    const dxfBuf = await oda.convertir(dwgBuf, { desde: 'dwg', hasta: 'dxf' });
    fs.writeFileSync(destinoDxf, dxfBuf);
    resumen.push({ nombre, sizeDwg: dwgBuf.length, mtime: stat.mtime.toISOString(), sha256Dwg: sha256(dwgBuf), sizeDxf: dxfBuf.length });
    console.log(`Plantilla ${nombre}: DWG ${dwgBuf.length} B -> DXF ${dxfBuf.length} B`);
  }
  fs.writeFileSync(path.join(DIR, 'plantillas', 'manifiesto.json'), JSON.stringify(resumen, null, 2));
}

function listarSeguro(carpeta) {
  try { return fs.readdirSync(carpeta); } catch { return []; }
}

if (process.argv.includes('--recolectar')) {
  const cacheDir = new Map();
  const listar = (carpeta) => {
    if (!cacheDir.has(carpeta)) cacheDir.set(carpeta, listarSeguro(carpeta));
    return cacheDir.get(carpeta);
  };

  const clientes = [
    { slug: 'belts', cod: '038908', nombre: 'BELTS VIGO' },
    { slug: 'luz', cod: '052082', nombre: 'PUERTAS LUZ' },
  ];

  const manifiesto = {};
  for (const cli of clientes) {
    const rows = JSON.parse(fs.readFileSync(path.join(DIR, `rps-${cli.cod}.json`), 'utf8'));
    const puertaRows = rows.filter(r => r.articulo.startsWith('PUERTA'));
    const pedidosUnicos = [...new Set(puertaRows.map(r => r.pedido))];
    const base = path.join(DIR, cli.slug);
    for (const sub of ['dwg', 'dxf-plano', 'maqcorte-dxf', 'maqcorte-cmt', 'pdf-pedido', 'pdf-plant']) {
      fs.mkdirSync(path.join(base, sub), { recursive: true });
    }
    manifiesto[cli.slug] = [];

    for (const ped of pedidosUnicos) {
      const lineas = puertaRows.filter(r => r.pedido === ped);
      const fecha = lineas[0].fecha;
      const anio = fecha.slice(0, 4);
      const compacto = ped.replace(/\./g, ''); // AR2604762
      const reCompacto = new RegExp(`^${compacto}(?:[^0-9]|$)`, 'i');
      const rePuntos = new RegExp(`^${ped.replace(/\./g, '\\.?')}(?:[^0-9]|$)`, 'i');

      const dirOfi = `${OFICINA_ROOT}/${anio}`;
      const dirMaqDxf = `${MAQCORTE_ROOT}/${anio}/ARCHIVOS DXF - MAQUINA NUEVA`;
      const dirMaqCmt = `${MAQCORTE_ROOT}/${anio}`;
      const dirPedPdf = `${RPS_PEDIDOS_ROOT}/${anio}`;
      const dirPlantPdf = `${RPS_PLANT_ROOT}/${anio}`;

      const dwgs = listar(dirOfi).filter(n => reCompacto.test(n) && /\.dwg$/i.test(n));
      const maqDxfs = listar(dirMaqDxf).filter(n => reCompacto.test(n) && /\.dxf$/i.test(n));
      const maqCmts = listar(dirMaqCmt).filter(n => reCompacto.test(n) && /\.(cmt|dxf)$/i.test(n));
      const pedPdfs = listar(dirPedPdf).filter(n => rePuntos.test(n) && /\.pdf$/i.test(n));
      const plantPdfs = listar(dirPlantPdf).filter(n => (rePuntos.test(n) || reCompacto.test(n)) && /\.pdf$/i.test(n));

      const entry = {
        pedido: ped, compacto, fecha, anio,
        lineas: lineas.map(l => ({ linea: l.linea, articulo: l.articulo, cantidad: l.cantidad, of: l.of_, comentario: l.comentario })),
        dwgs: [], maqDxfs: [], maqCmts: [], pedPdfs: [], plantPdfs: [],
      };

      for (const f of dwgs) {
        const src = `${dirOfi}/${f}`;
        const dstDwg = path.join(base, 'dwg', f);
        const dstDxf = path.join(base, 'dxf-plano', f.replace(/\.dwg$/i, '.dxf'));
        fs.copyFileSync(src, dstDwg);
        const buf = fs.readFileSync(dstDwg);
        let dxfOk = false;
        try {
          const dxf = await oda.convertir(buf, { desde: 'dwg', hasta: 'dxf' });
          fs.writeFileSync(dstDxf, dxf);
          dxfOk = true;
        } catch (err) {
          console.error(`Error ODA ${f}:`, err.message);
        }
        entry.dwgs.push({ nombre: f, origen: src, sha256: sha256(buf), dxfOk });
      }
      for (const f of maqDxfs) {
        const src = `${dirMaqDxf}/${f}`;
        const dst = path.join(base, 'maqcorte-dxf', f);
        fs.copyFileSync(src, dst);
        entry.maqDxfs.push({ nombre: f, origen: src, sha256: sha256(fs.readFileSync(dst)) });
      }
      for (const f of maqCmts) {
        const src = `${dirMaqCmt}/${f}`;
        const dst = path.join(base, 'maqcorte-cmt', f);
        fs.copyFileSync(src, dst);
        entry.maqCmts.push({ nombre: f, origen: src, sha256: sha256(fs.readFileSync(dst)) });
      }
      for (const f of pedPdfs) {
        const src = `${dirPedPdf}/${f}`;
        const dst = path.join(base, 'pdf-pedido', f);
        fs.copyFileSync(src, dst);
        entry.pedPdfs.push({ nombre: f, origen: src });
      }
      for (const f of plantPdfs) {
        const src = `${dirPlantPdf}/${f}`;
        const dst = path.join(base, 'pdf-plant', f);
        fs.copyFileSync(src, dst);
        entry.plantPdfs.push({ nombre: f, origen: src });
      }

      manifiesto[cli.slug].push(entry);
      console.log(`[${cli.slug}] ${ped} (${fecha}): DWG=${dwgs.length} maqDXF=${maqDxfs.length} maqCMT=${maqCmts.length} pedPDF=${pedPdfs.length} plantPDF=${plantPdfs.length}`);
    }
  }
  fs.writeFileSync(path.join(DIR, 'manifiesto-pedidos.json'), JSON.stringify(manifiesto, null, 2));
}
