// Script de contraste reproducible sobre TODOS los pedidos reales de Belts Vigo (038908) y Puertas Luz (052082).
// Lee los DXF reales de maqcorte y plano copiados en tmp/belts-luz/ y genera:
//   - tmp/belts-luz/tabla-contraste.md (tablas Markdown para docs/modelos/puertas-belts-luz.md)
//   - tmp/belts-luz/resumen-contraste.json
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'tmp/belts-luz';
const manifiesto = JSON.parse(fs.readFileSync(path.join(DIR, 'manifiesto-pedidos.json'), 'utf8'));
const piezasData = JSON.parse(fs.readFileSync(path.join(DIR, 'piezas-maqcorte.json'), 'utf8'));
const analisisData = JSON.parse(fs.readFileSync(path.join(DIR, 'analisis-pedidos.json'), 'utf8'));

function resumenMaq(slug, pedido) {
  const rec = piezasData[slug].find(x => x.pedido === pedido);
  const ana = analisisData[slug].find(x => x.pedido === pedido);
  if (!rec || !rec.archivos.length) return { fuente: 'solo DWG/CMT (sin maqcorte DXF)', piezas: [], radios: [] };
  const f = rec.archivos[0];
  const anaC = ana?.cortes?.[0];
  const piezas = f.islas.flatMap(is => is.subpiezas.map(p => ({ w: p.w, h: p.h, mH: p.marcasH, mV: p.marcasV, txt: p.textos })));
  const huecos = anaC ? anaC.piezas.flatMap(p => p.huecos) : [];
  const islasRaw = anaC ? anaC.piezas.map(p => ({ w: p.w, h: p.h, arco: p.arco, mH: p.marcasH, mV: p.marcasV, txt: p.textos })) : [];
  return { fuente: `maqcorte/${f.archivo}`, piezas, huecos, islasRaw };
}

function resumenPlano(slug, pedido) {
  const ana = analisisData[slug].find(x => x.pedido === pedido);
  if (!ana || !ana.planos.length) return { fuente: '—', notas: [] };
  const pl = ana.planos[0];
  const notas = [...new Set(pl.hojas.flatMap(h => h.textosModelo))];
  return { fuente: `oficina/${pl.archivo}`, notas, hojas: pl.hojas.length };
}

function extraerMedidasRps(comentario) {
  const m = /(\d+(?:[.,]\d+)?)\s*(?:CM(?:\s+DE\s+FRENTE)?)?\s*[X×]\s*(\d+(?:[.,]\d+)?)/i.exec(comentario || '');
  if (!m) return null;
  return { f: Number(m[1].replace(',', '.')), h: Number(m[2].replace(',', '.')) };
}

function fmt(n) { return Number(n).toLocaleString('es-ES', { maximumFractionDigits: 2 }); }

// Detectar características medibles de un pedido de maqcorte + plano
function evaluarPedido(slug, ped) {
  const maq = resumenMaq(slug, ped.pedido);
  const pl = resumenPlano(slug, ped.pedido);
  const arts = [...new Set(ped.lineas.map(l => l.articulo))].join(', ');
  const ofs = ped.lineas.map(l => l.of || '—').join('/');
  const qty = ped.lineas.map(l => l.cantidad).join('+');
  const medidasRps = ped.lineas.map(l => {
    const m = extraerMedidasRps(l.comentario);
    return m ? `${fmt(m.f)}×${fmt(m.h)}` : 'varias';
  }).join('; ');

  const notasTxt = pl.notas.join(' | ');
  const hallazgos = [];
  const noCuadra = [];

  if (slug === 'belts') {
    if (ped.lineas.every(l => l.articulo === 'PUERTAPLET' || l.articulo === 'PUERTAPLETRAM')) {
      hallazgos.push('Ventana/tramo suelto enmarcado (fuera de puerta completa)');
    } else if (/CORD[OÓ]N/i.test(notasTxt)) {
      const tira19 = maq.piezas.find(p => Math.abs(p.h - 19) < 0.5 || Math.abs(p.w - 19) < 0.5);
      const isla = maq.islasRaw?.[0];
      hallazgos.push(`Enrollable con cordón 4,5 + B.N. (corte ${isla ? `${fmt(isla.w)}×${fmt(isla.h)}` : '—'}, tira ${tira19 ? `${fmt(tira19.w)}×${fmt(tira19.h)}` : '—'})`);
      noCuadra.push('Variante sin saco con cordón y B.N.: fuera de enrollable estándar (Q-BV03)');
    } else {
      // Comprobar saco rectangular de ancho F
      const m0 = extraerMedidasRps(ped.lineas[0].comentario);
      const F = m0?.f;
      if (maq.islasRaw?.length && F) {
        const saco = maq.islasRaw.find(p => (Math.abs(p.w - F) < 1 && p.h >= 30 && p.h <= 85) || (Math.abs(p.h - F) < 1 && p.w >= 30 && p.w <= 85));
        if (saco) {
          const altoS = Math.abs(saco.w - F) < 1 ? saco.h : saco.w;
          hallazgos.push(`Saco ${fmt(F)}×${fmt(altoS)} (ancho F, sin pestaña)`);
          if (Math.abs(altoS - 39) > 0.6 && Math.abs(altoS - 78) > 0.6) noCuadra.push(`Alto de saco ${fmt(altoS)} cm distinto de 39 cm (editable, Q-BV01)`);
        }
        // Comprobar pestaña de 3 cm en paño (ancho F+3 o caja F+3)
        const conPest3 = maq.islasRaw.some(p => Math.abs(p.w - (F + 3)) < 1 || Math.abs(p.h - (F + 3)) < 1)
          || maq.piezas.some(p => Math.abs(p.w - (F + 3)) < 1 || Math.abs(p.h - (F + 3)) < 1)
          || /DEJAR 3 CM/i.test(notasTxt);
        if (conPest3) hallazgos.push('E.T. inf. integrada + pestaña 3 cm');
        // E.T. medidas
        const ets = maq.piezas.filter(p => (Math.abs(p.w - F) < 1 && p.h >= 8 && p.h <= 16) || (Math.abs(p.h - F) < 1 && p.w >= 8 && p.w <= 16));
        if (ets.length) {
          const anchos = [...new Set(ets.map(p => Math.min(p.w, p.h)))];
          hallazgos.push(`${ets.length} E.T. de ${anchos.map(fmt).join('/')} cm`);
        }
        // Ventanas y cristales (+4 cm)
        const ventHuecos = maq.huecos.filter(h => Math.max(h.w, h.h) >= 20);
        if (ventHuecos.length) {
          const v0 = ventHuecos[0];
          const vMin = Math.min(v0.w, v0.h), vMax = Math.max(v0.w, v0.h);
          const cris = maq.islasRaw.find(p => Math.abs(Math.max(p.w, p.h) - (vMax + 4)) < 1 && Math.abs(Math.min(p.w, p.h) - (vMin + 4)) < 1);
          if (cris) hallazgos.push(`Ventana ${fmt(vMax)}×${fmt(vMin)} → cristal ${fmt(Math.max(cris.w, cris.h))}×${fmt(Math.min(cris.w, cris.h))} (+4 cm)`);
        }
        // Comprobar si es variante ventanal 320x480
        const cacho = maq.piezas.find(p => Math.abs(Math.min(p.w, p.h) - 13) < 0.5 && Math.max(p.w, p.h) >= 35 && Math.max(p.w, p.h) <= 45);
        if (cacho) hallazgos.push(`Ventanales con cachos ${fmt(cacho.w)}×${fmt(cacho.h)} y cristal 300×${fmt(Math.max(cacho.w, cacho.h))}`);
        // Comprobar cintas en apilable
        const cintas = maq.huecos.filter(h => Math.max(h.w, h.h) <= 15 && Math.min(h.w, h.h) >= 6);
        if (cintas.length) {
          const c0 = cintas[0];
          hallazgos.push(`${cintas.length} recortes cinta ${fmt(c0.w)}×${fmt(c0.h)} (sin muescas laterales)`);
        }
      } else {
        hallazgos.push('Solo plano DWG/CMT (2023): coincide estructura E.T. inf. + pestaña 3 cm + saco sin pestaña');
      }
      const pid = ped.pedido.replace(/\./g, '');
      if (/AL CORTE/i.test(notasTxt) && !/VARILLA/i.test(notasTxt) && ped.lineas[0].articulo === 'PUERTAENR' && pid !== 'AR2300905') {
        noCuadra.push('Cabecera AL CORTE sin varilla (+0 cm; editable en cabecera)');
      }
      if (/AR2500554|AR2400462/.test(pid)) {
        noCuadra.push('Cristal/cacho de 41,5 en 2024–feb 2025; revisado a 39 cm desde mar 2025 (AR2501549, AR2505965)');
      }
      if (/AR2604762|AR2604618|AR2505886/.test(pid)) {
        noCuadra.push('Alzado acota E.T. 9,5 cm, maqcorte corta 10/10,5 cm (Q-BV02)');
      }
      if (pid === 'AR2602598') {
        noCuadra.push('Maqcorte incluye 2 opciones de anidado (normal + corte para resto); 5 E.T. por puerta');
      }
    }
  } else {
    // PUERTAS LUZ
    const esTransp = /TRANSP\.\s*1|SACO DE 350/i.test(notasTxt);
    const m0 = extraerMedidasRps(ped.lineas[0].comentario);
    const F = m0?.f;

    if (esTransp && ped.lineas.length === 1) {
      // Enrollable transparente pura
      const saco350 = maq.islasRaw.find(p => Math.abs(p.h - 70) < 0.5 || Math.abs(p.w - 70) < 0.5);
      const arena = maq.piezas.find(p => Math.abs(p.h - 22) < 0.5 || Math.abs(p.w - 22) < 0.5);
      if (saco350) hallazgos.push(`Saco 350: ${fmt(Math.max(saco350.w, saco350.h))}×${fmt(Math.min(saco350.w, saco350.h))} (= F+3 × 70)`);
      if (arena) hallazgos.push(`Saco arena: ${fmt(Math.max(arena.w, arena.h))}×${fmt(Math.min(arena.w, arena.h))} (= F−6 × 22)`);
      const t1 = maq.islasRaw.filter(p => p.txt.some(t => /TRANSP|A1|A2|A3/.test(t)));
      hallazgos.push(`Enrollable transparente (${t1.length} islas cristal, E.T. 3 cm huecos)`);
      if (F > 250) noCuadra.push('Margen lateral 15 cm (tira 16 cm) frente a 6 cm (tira 7 cm) en puertas ≤210 cm (Q-PL04)');
    } else if (ped.lineas.length > 1) {
      // Pedidos multi-puerta (AR2503726, AR2501810, AR2406937)
      const arena = maq.piezas.filter(p => Math.abs(p.h - 22) < 0.5 || Math.abs(p.w - 22) < 0.5);
      const cintas = maq.huecos.filter(h => Math.max(h.w, h.h) <= 15 && Math.min(h.w, h.h) >= 6);
      const vents = maq.huecos.filter(h => Math.max(h.w, h.h) >= 25);
      hallazgos.push(`Pedido multi-puerta (${ped.lineas.length} líneas)`);
      if (arena.length) hallazgos.push(`${arena.length} sacos arena de 22 cm`);
      if (cintas.length) hallazgos.push(`Cintas ${[...new Set(cintas.map(c => `${fmt(c.w)}×${fmt(c.h)}`))].join(', ')}`);
      if (vents.length) hallazgos.push(`${vents.length} huecos ventana R2 → cristales +4 cm R4`);
      if (ped.pedido === 'AR.24.06937') noCuadra.push('Pedido inicial dic 2024: saco de 80 (40 cm) sin saco de arena; patrón sustituido en 2025–2026');
      if (ped.pedido === 'AR.25.03726' || ped.pedido === 'AR.25.01810') noCuadra.push('Apilables >5 m con refuerzos 2 mm y cintas 12,5×7,5; saco arena F−6 (Q-PL02, Q-PL03)');
    } else {
      // Pedido 1 puerta de lona (apilable o enrollable)
      const sacoExt = maq.islasRaw.find(p => (Math.abs(p.w - F) <= 3.5 && p.h >= 28 && p.h <= 62) || (Math.abs(p.h - F) <= 3.5 && p.w >= 28 && p.w <= 62));
      const arena = maq.piezas.find(p => Math.abs(p.h - 22) < 0.5 || Math.abs(p.w - 22) < 0.5);
      const ets = maq.piezas.filter(p => (Math.abs(p.w - F) < 1 && p.h >= 8 && p.h <= 14) || (Math.abs(p.h - F) < 1 && p.w >= 8 && p.w <= 14));
      const vents = maq.huecos.filter(h => Math.max(h.w, h.h) >= 25);
      const cintas = maq.huecos.filter(h => Math.max(h.w, h.h) <= 15 && Math.min(h.w, h.h) >= 6);
      if (sacoExt) hallazgos.push(`Saco ext. ${fmt(Math.max(sacoExt.w, sacoExt.h))}×${fmt(Math.min(sacoExt.w, sacoExt.h))}`);
      if (arena) hallazgos.push(`Saco arena ${fmt(Math.max(arena.w, arena.h))}×${fmt(Math.min(arena.w, arena.h))} (marcas ${[...arena.mH, ...arena.mV].map(fmt).join('/')})`);
      if (ets.length) hallazgos.push(`${ets.length} E.T. de ${[...new Set(ets.map(p => Math.min(p.w, p.h)))].map(fmt).join('/')} cm`);
      if (cintas.length) hallazgos.push(`Cintas ${[...new Set(cintas.map(c => `${fmt(c.w)}×${fmt(c.h)}`))].join('/')} R0,5`);
      if (vents.length) {
        const v0 = vents[0];
        const vMin = Math.min(v0.w, v0.h), vMax = Math.max(v0.w, v0.h);
        const cris = maq.islasRaw.find(p => Math.abs(Math.max(p.w, p.h) - (vMax + 4)) < 1 && Math.abs(Math.min(p.w, p.h) - (vMin + 4)) < 1);
        hallazgos.push(`Ventana ${fmt(vMax)}×${fmt(vMin)} R2 → cristal ${cris ? `${fmt(Math.max(cris.w, cris.h))}×${fmt(Math.min(cris.w, cris.h))}` : '—'} R4`);
      }
      if (ped.pedido === 'AR.25.05627') noCuadra.push('Saco ext. 509×58 (F+3) y marca saco arena a 5 cm (17); en 2026 es F y marca a 3 cm (Q-PL01, Q-PL02)');
      if (ped.pedido === 'AR.26.00326') noCuadra.push('Cabecera BD (4,5) (+4,5 cm, marca 9 cm) por pliegue doble para atornillar (editable)');
    }
  }

  return {
    pedido: ped.pedido,
    fecha: ped.fecha,
    arts,
    ofs,
    qty,
    medidasRps,
    fuente: [pl.fuente, maq.fuente].join(' · '),
    cuadra: hallazgos.join('; ') || '—',
    noCuadra: noCuadra.join('; ') || 'Cuadra con la regla vigente',
  };
}

const resultado = { belts: [], luz: [] };
let md = '';
for (const [slug, titulo] of [['belts', 'Belts Vigo (038908)'], ['luz', 'Puertas Luz (052082)']]) {
  md += `### Tabla de contraste · ${titulo}\n\n`;
  md += '| Pedido | Fecha | Artículo (uds) | OF | Medidas RPS (cm) | Fuentes leídas | Qué cuadra (medido en DXF) | Diferencias / excepciones |\n';
  md += '| --- | --- | --- | --- | --- | --- | --- | --- |\n';
  for (const ped of manifiesto[slug]) {
    const fila = evaluarPedido(slug, ped);
    resultado[slug].push(fila);
    md += `| ${fila.pedido} | ${fila.fecha} | ${fila.arts} (${fila.qty}) | ${fila.ofs} | ${fila.medidasRps} | \`${fila.fuente}\` | ${fila.cuadra} | ${fila.noCuadra} |\n`;
  }
  md += '\n';
}

fs.writeFileSync(path.join(DIR, 'tabla-contraste.md'), md);
fs.writeFileSync(path.join(DIR, 'resumen-contraste.json'), JSON.stringify(resultado, null, 2));
console.log(md);
