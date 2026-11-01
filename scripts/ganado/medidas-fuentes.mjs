// Recopilación de solo lectura. Todas las escrituras se limitan a tmp/ganado-medidas.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
export const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const base = process.env.GANADO_ESTUDIO ?? 'C:/Users/ivan.sanchez/Documents/Proyectos DEV/toldos-testar/tmp/dxf-estudio/ganado';
export const salida = path.join(raiz, 'tmp/ganado-medidas');
export const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
export function guardar(nombre, datos) { fs.mkdirSync(salida, { recursive: true }); fs.writeFileSync(path.join(salida, nombre), typeof datos === 'string' ? datos : JSON.stringify(datos, null, 2)); }
export function fuentes() {
  const ps = JSON.parse(fs.readFileSync(fs.existsSync(path.join(salida,'fuentes/pedidos-base.json'))?path.join(salida,'fuentes/pedidos-base.json'):path.join(base, 'pedidos.json'))).pedidos;
  const local=path.join(salida,'fuentes-plantillas.json');
  const ts = JSON.parse(fs.readFileSync(fs.existsSync(local)?local:path.join(base, 'plantillas/fuentes.json')));
  const fsn = path.join(salida, 'fuentes-red.json');
  const nuevas = fs.existsSync(fsn) ? JSON.parse(fs.readFileSync(fsn)).fuentes.filter(x => x.dxf && fs.existsSync(x.dxf)) : [];
  const pedidos = fs.readdirSync(path.join(base, 'dwg-dxf')).filter(f => /\.dxf$/i.test(f)).map(f => {
    const id = path.basename(f, '.dxf'); const p = ps.find(p => p.pedido === id);
    return { id, clase: 'pedido', cliente: p?.cliente, dxf: path.join(base, 'dwg-dxf', f), original: p?.fuentes?.dwg?.ruta ?? p?.fuentes?.dwg?.original ?? path.join(base, 'originales', id + '.dwg'), bot: path.join(base, 'originales', id + '-bot.dxf') };
  });
  return [...pedidos.filter(x => !nuevas.some(n => n.id === x.id)), ...nuevas, ...ts.filter(x => x.dxf && fs.existsSync(x.dxf)).map(x => ({ id: x.id, clase: 'plantilla', original: x.ruta, dxf: x.dxf, nombre: x.rel }))];
}
export function canvasLocal() { return createRequire(import.meta.url)(path.join(raiz, 'node_modules/.pnpm/@napi-rs+canvas@1.0.2/node_modules/@napi-rs/canvas')); }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if(process.argv.includes('--plantillas-locales')){
    for(const d of ['fuentes/plantillas/dxf','fuentes/plantillas/dwg'])fs.mkdirSync(path.join(salida,d),{recursive:true});
    const ts=JSON.parse(fs.readFileSync(path.join(base,'plantillas/fuentes.json'))).filter(x=>x.dxf&&fs.existsSync(x.dxf));
    const locales=ts.map(t=>{const dxf=path.join(salida,'fuentes/plantillas/dxf',t.id+'.dxf'),copia=path.join(salida,'fuentes/plantillas/dwg',t.id+'.dwg');fs.copyFileSync(t.dxf,dxf);fs.copyFileSync(t.copia,copia);return {...t,dxf,copia,sha256Dxf:hash(dxf)};});
    fs.copyFileSync(path.join(base,'pedidos.json'),path.join(salida,'fuentes/pedidos-base.json'));
    guardar('fuentes-plantillas.json',locales);console.log(JSON.stringify({plantillasLocales:locales.length}));
  }
  if (process.argv.includes('--copiar')) {
    for (const d of ['fuentes/dwg', 'fuentes/dxf', 'fuentes/bot', 'oda-temp']) fs.mkdirSync(path.join(salida, d), { recursive: true });
    const ps = JSON.parse(fs.readFileSync(path.join(base, 'pedidos.json'))).pedidos;
    const lista = [], ausentes = [];
    // Se revisa toda la exportación, no solo clientes seleccionados por su nombre.
    for (const p of ps) {
      if (!p.lineas.some(l => l.articulo === 'LONAREMGANA')) continue;
      const anio = '20' + p.pedido.slice(2, 4);
      const original = `//192.168.0.128/Oftecnica/Oficina Tecnica/${anio}/${p.pedido}.dwg`;
      const copia = path.join(salida, 'fuentes/dwg', p.pedido + '.dwg');
      try {
        if (!fs.existsSync(copia)) fs.copyFileSync(original, copia);
        const botOriginal = `//192.168.0.128/Oftecnica/maqcorte/${anio}/ARCHIVOS DXF - MAQUINA NUEVA/${p.pedido}.dxf`;
        const bot = path.join(salida, 'fuentes/bot', p.pedido + '.dxf');
        let tieneBot = false;
        try { if (!fs.existsSync(bot)) fs.copyFileSync(botOriginal, bot); tieneBot = true; } catch { /* No implica ausencia de geometría de oficina. */ }
        lista.push({ id: p.pedido, clase: 'pedido', cliente: p.cliente, original, copia, sha256: hash(copia), dxf: path.join(salida, 'fuentes/dxf', p.pedido + '.dxf'), ...(tieneBot ? { bot, botOriginal, botSha256: hash(bot) } : {}) });
      } catch (e) { ausentes.push({ id: p.pedido, original, error: e.code }); }
    }
    const pdfOrigen = '//192.168.0.128/RPS/VENTAS/PEDIDOS/2026/AR.26.05319.pdf';
    const pdf = path.join(salida, 'fuentes/hoja-entrada.pdf');
    fs.copyFileSync(pdfOrigen, pdf);
    const carpetaCal = '//192.168.0.128/Oftecnica/Oficina Tecnica/DIBUJOS/REMOLQUES/REMOLQUES GANADO/TALLERES CAL';
    const adjuntos = [];
    function recorrer(d) { for (const x of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, x.name); if (x.isDirectory()) recorrer(f); else adjuntos.push({ ruta: f, bytes: fs.statSync(f).size }); } }
    recorrer(carpetaCal);
    guardar('fuentes-red.json', { fuentes: lista, ausentes, pdf: { original: pdfOrigen, copia: pdf, sha256: hash(pdf) }, carpetaCal: adjuntos });
    console.log(JSON.stringify({ copiados: lista.length, ausentes: ausentes.length, adjuntosCal: adjuntos.length }));
  }
  if (process.argv.includes('--convertir')) {
    const args = [path.join(salida, 'fuentes/dwg'), path.join(salida, 'fuentes/dxf'), 'ACAD2018', 'DXF', '0', '1', '*.dwg'];
    const r = spawnSync('C:/Users/ivan.sanchez/tools/oda/ODAFileConverter.exe', args, { windowsHide: true, encoding: 'utf8', timeout: 1200000, env: { ...process.env, TEMP: path.join(salida, 'oda-temp'), TMP: path.join(salida, 'oda-temp') } });
    guardar('oda.json', { args, status: r.status, error: r.error?.message, stdout: r.stdout, stderr: r.stderr });
    console.log(JSON.stringify({ oda: r.status, error: r.error?.message, convertidos: fs.readdirSync(path.join(salida, 'fuentes/dxf')).filter(f => /\.dxf$/i.test(f)).length }));
    if (r.status !== 0) process.exitCode = 1;
  }
  if (process.argv.includes('--hoja')) {
    const canvas = canvasLocal();
    globalThis.DOMMatrix = canvas.DOMMatrix; globalThis.ImageData = canvas.ImageData; globalThis.Path2D = canvas.Path2D;
    const pdfjs = await import(pathToFileURL(path.join(raiz, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join(salida, 'fuentes/hoja-entrada.pdf'))), useSystemFonts: true }).promise;
    for(const i of [3,4]){
      const p = await doc.getPage(i), viewport = p.getViewport({ scale: 2.3 });
      const c = canvas.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await p.render({ canvasContext: c.getContext('2d'), viewport }).promise;
      fs.writeFileSync(path.join(salida, `hoja-entrada-p${i}.png`), c.toBuffer('image/png'));
    }
    console.log('Páginas 3 y 4 renderizadas en tmp/ganado-medidas.');
  }
}
