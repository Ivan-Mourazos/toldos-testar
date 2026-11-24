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
import { leerPlanoTexto, textoDxf } from '../src/flujoDwg/planoDxf.js';

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
            CONVERT(varchar(40), mo.CodManufacturingOrder) of_,
            CONVERT(varchar(10), mo.RealEndDate, 120) ofFin
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

function extraerAtributosCajetin(dxfTxt) {
  const lineas = dxfTxt.replace(/\r\n/g, '\n').split('\n');
  const attrs = {};
  for (let i = 0; i < lineas.length - 1; i += 2) {
    if (lineas[i].trim() === '0' && lineas[i + 1].trim() === 'ATTRIB') {
      let tag = '';
      let val = '';
      for (let j = i + 2; j < lineas.length - 1; j += 2) {
        const c = lineas[j].trim();
        const v = lineas[j + 1].trim();
        if (c === '0') break;
        if (c === '2') tag = v.toUpperCase();
        if (c === '1') val = v;
      }
      if (tag && val && !attrs[tag]) attrs[tag] = val;
    }
  }
  return attrs;
}

function extraerTextosYDimensionesPlano(rutaDxf) {
  const txt = fs.readFileSync(rutaDxf, 'utf8');
  const attrs = extraerAtributosCajetin(txt);
  const plano = leerPlanoTexto(txt);
  const textos = [...new Set(plano.modelo.filter(p => p.tipo === 'texto').map(p => textoDxf(p.valor || p.texto || '').replace(/\s+/g, ' ').trim()).filter(Boolean))];
  const relevante = textos.filter(t => /E\.?T|Ø|30X|40X|50X|60X|SACO|FALD|ARENA|VELCRO|CORD|VARILLA|B\.?N\.?|B\.?D\.?|PISAR|SOLDAR|CERRAR|DEJAR|CINTA|REFUERZO|HUECO|CORTE|CRISTAL|TRANSP/i.test(t));
  // Valores de cotas reales (código 42 en entidades DIMENSION)
  const lineas = txt.replace(/\r\n/g, '\n').split('\n');
  const cotas = [];
  for (let i = 0; i < lineas.length - 1; i += 2) {
    if (lineas[i].trim() === '0' && lineas[i + 1].trim() === 'DIMENSION') {
      let real = null;
      let override = '';
      for (let j = i + 2; j < lineas.length - 1; j += 2) {
        const c = lineas[j].trim();
        const v = lineas[j + 1].trim();
        if (c === '0') break;
        if (c === '42') real = Number(v);
        if (c === '1') override = v;
      }
      if (Number.isFinite(real)) cotas.push({ real: Math.round(real * 100) / 100, override });
    }
  }
  return {
    tecnico: attrs.TECNICO || attrs['TÉCNICO'] || attrs.DIBUJADO || attrs.AUTOR || '',
    revisor: attrs.REVISION || attrs['REVISIÓN'] || attrs.REVISOR || '',
    fechaCajetin: attrs.FECHA || '',
    ofCajetin: attrs.OF || '',
    attrs,
    relevante,
    cotasPequenas: [...new Set(cotas.filter(c => c.real >= 4 && c.real <= 80).map(c => c.override ? `${c.real}[${c.override}]` : String(c.real)))],
  };
}

if (process.argv.includes('--auditar-dudas')) {
  const manifiesto = JSON.parse(fs.readFileSync(path.join(DIR, 'manifiesto-pedidos.json'), 'utf8'));
  const piezasData = JSON.parse(fs.readFileSync(path.join(DIR, 'piezas-maqcorte.json'), 'utf8'));
  const rpsBelts = JSON.parse(fs.readFileSync(path.join(DIR, 'rps-038908.json'), 'utf8'));
  const rpsLuz = JSON.parse(fs.readFileSync(path.join(DIR, 'rps-052082.json'), 'utf8'));
  const rpsMap = { belts: rpsBelts, luz: rpsLuz };
  const salida = { belts: [], luz: [] };

  for (const slug of ['belts', 'luz']) {
    console.log(`\n==================== ${slug.toUpperCase()} ====================`);
    for (const ped of manifiesto[slug]) {
      const rpsLineas = rpsMap[slug].filter(r => r.pedido === ped.pedido && r.articulo.startsWith('PUERTA'));
      const dxfPlano = ped.dwgs[0] ? path.join(DIR, slug, 'dxf-plano', ped.dwgs[0].nombre.replace(/\.dwg$/i, '.dxf')) : null;
      const infoPlano = dxfPlano && fs.existsSync(dxfPlano) ? extraerTextosYDimensionesPlano(dxfPlano) : null;
      const recMaq = piezasData[slug]?.find(x => x.pedido === ped.pedido);
      const piezasMaq = recMaq?.archivos?.flatMap(a => a.islas.flatMap(is => is.subpiezas.map(p => ({ w: p.w, h: p.h, mH: p.marcasH, mV: p.marcasV, txt: p.textos })))) ?? [];
      const row = {
        pedido: ped.pedido,
        fecha: ped.fecha,
        articulos: [...new Set(rpsLineas.map(l => l.articulo))],
        ofs: rpsLineas.map(l => ({ of: l.of_, fin: l.ofFin, uds: l.cantidad })),
        comentariosRps: rpsLineas.map(l => l.comentario.replace(/\s+/g, ' ').trim()),
        tecnico: infoPlano?.tecnico || '?',
        revisor: infoPlano?.revisor || '',
        fechaCajetin: infoPlano?.fechaCajetin || '',
        notasPlano: infoPlano?.relevante || [],
        cotasPequenas: infoPlano?.cotasPequenas || [],
        piezasMaq,
        pedPdfs: ped.pedPdfs.map(p => p.nombre),
        plantPdfs: ped.plantPdfs.map(p => p.nombre),
      };
      salida[slug].push(row);
      const estados = row.ofs.map(o => `${o.of || '-'}:${o.fin || '-'}`).join(',');
      console.log(`${row.pedido} | ${row.fecha} | ${row.articulos.join('+')} | tec=${row.tecnico} rev=${row.revisor} | OF=${estados}`);
      console.log(`   notas: ${row.notasPlano.slice(0, 12).join(' | ')}`);
      const etysaco = piezasMaq.filter(p => Math.min(p.w, p.h) <= 75).map(p => `${p.w}x${p.h}`);
      const panos = piezasMaq.filter(p => Math.min(p.w, p.h) > 75).map(p => `${p.w}x${p.h}`);
      console.log(`   panos: ${panos.join(', ')} || et/saco/cristal: ${etysaco.slice(0, 14).join(', ')}`);
    }
  }
  fs.writeFileSync(path.join(DIR, 'auditoria-dudas.json'), JSON.stringify(salida, null, 2));
  console.log('\nGuardado en', path.join(DIR, 'auditoria-dudas.json'));
}
