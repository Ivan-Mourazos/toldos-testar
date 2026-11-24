// Mide con precisión de 0,01 cm todas las piezas, marcas, radios, cabeceras, bajos, E.T. y sacos
// en TODOS los pedidos reales de Belts Vigo y Puertas Luz (solo lectura de tmp/belts-luz/).
import fs from 'node:fs';
import path from 'node:path';
import { leerPlanoTexto, presentacionesDxf, textoDxf, cajaPrimitiva } from '../src/flujoDwg/planoDxf.js';

const DIR = 'tmp/belts-luz';
const manifiesto = JSON.parse(fs.readFileSync(path.join(DIR, 'manifiesto-pedidos.json'), 'utf8'));

function analizarRadiosYContornosMaqcorte(ruta) {
  const plano = leerPlanoTexto(textoDxf(fs.readFileSync(ruta)));
  // Detectar factor a cm
  const allB = plano.modelo.filter(p => ['raya', 'arco'].includes(p.tipo)).map(p => cajaPrimitiva(p)).filter(b => Number.isFinite(b.x0));
  const span = Math.max(Math.max(...allB.map(b => b.x1)) - Math.min(...allB.map(b => b.x0)), Math.max(...allB.map(b => b.y1)) - Math.min(...allB.map(b => b.y0)));
  const f = span > 1500 ? 0.1 : span < 120 ? 100 : 1;

  // Radios en CUTTER y DISCO1
  const radios = { CUTTER: new Set(), DISCO1: new Set() };
  for (const p of plano.modelo) {
    if (!['CUTTER', 'DISCO1'].includes(p.capa)) continue;
    if (p.tipo === 'arco' && p.r > 0) radios[p.capa].add(Number((p.r * f).toFixed(2)));
    else if (p.tipo === 'raya' && p.curva) {
      const l = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]);
      const r = l * (1 + p.curva ** 2) / (4 * Math.abs(p.curva));
      radios[p.capa].add(Number((r * f).toFixed(2)));
    }
  }
  return {
    radiosCutter: [...radios.CUTTER].sort((a, b) => a - b),
    radiosDisco: [...radios.DISCO1].sort((a, b) => a - b),
  };
}

// Extrae TODAS las piezas cerradas del corte en maqcorte (incluidas las que llevan arcos/pestañas)
// usando segmentos DISCO1 + CUTTER y detectando todos los rectángulos de piezas de lona, saco y cristal.
function extraerResumenAlzadoYCorte(slug, ped) {
  const base = path.join(DIR, slug);
  const res = {
    pedido: ped.pedido,
    fecha: ped.fecha,
    lineas: ped.lineas.map(l => ({ articulo: l.articulo, qty: l.cantidad, of: l.of })),
    hojas: [],
    radios: [],
  };

  for (const mf of ped.maqDxfs) {
    const r = analizarRadiosYContornosMaqcorte(path.join(base, 'maqcorte-dxf', mf.nombre));
    res.radios.push({ archivo: mf.nombre, ...r });
  }

  for (const d of ped.dwgs.filter(x => x.dxfOk)) {
    const dxfPath = path.join(base, 'dxf-plano', d.nombre.replace(/\.dwg$/i, '.dxf'));
    const hojas = presentacionesDxf(textoDxf(fs.readFileSync(dxfPath)));
    for (const h of hojas) {
      const mod = h.primitivas.filter(p => p.espacio !== 'papel');
      if (mod.length < 10) continue;
      // Cotas numéricas (en cm)
      const cotas = mod.filter(p => p.tipo === 'cota').map(p => Number((p.medida * 100).toFixed(2))).sort((a, b) => a - b);
      // Cajetín
      const papelTxt = h.primitivas.filter(p => p.espacio === 'papel' && p.tipo === 'texto').map(p => p.valor.replace(/\s+/g, ' ').trim());
      const tecnico = papelTxt.find(t => /IV[AÁ]N|LUCIA|TAMARA|JAIME|ADRIAN|ALBERTO|BANESA|JESUS/i.test(t)) || '';
      res.hojas.push({
        archivo: d.nombre,
        hoja: h.nombre,
        tecnico,
        cotas,
      });
    }
  }
  return res;
}

// Además: medir exactamente las alturas y marcas de los paños en el espacio modelo de maqcorte,
// separando piezas por bloques de corte (incluso las de pestaña de 3 cm!)
function medirBloquesMaqcorteExactos(ruta) {
  const plano = leerPlanoTexto(textoDxf(fs.readFileSync(ruta)));
  const allB = plano.modelo.filter(p => ['raya', 'arco'].includes(p.tipo)).map(p => cajaPrimitiva(p)).filter(b => Number.isFinite(b.x0));
  const span = Math.max(Math.max(...allB.map(b => b.x1)) - Math.min(...allB.map(b => b.x0)), Math.max(...allB.map(b => b.y1)) - Math.min(...allB.map(b => b.y0)));
  const f = span > 1500 ? 0.1 : span < 120 ? 100 : 1;

  // Listar todos los segmentos DISCO1/CUTTER agrupados por isla (con CUTTER incluido para piezas redondeadas!)
  const corte = plano.modelo.filter(p => ['DISCO1', 'CUTTER', 'corte'].includes(p.capa) && (p.tipo === 'raya' || p.tipo === 'arco'))
    .map(p => ({ p, b: cajaPrimitiva(p) })).filter(x => Number.isFinite(x.b.x0));
  const txts = plano.modelo.filter(p => p.tipo === 'texto')
    .map(p => ({ p, b: cajaPrimitiva(p) })).filter(x => Number.isFinite(x.b.x0));

  const tol = 0.5 / f;
  const par = corte.map((_, i) => i);
  const find = (a) => par[a] === a ? a : (par[a] = find(par[a]));
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
  for (let i = 0; i < corte.length; i++) {
    const bi = corte[i].b;
    for (let j = i + 1; j < corte.length; j++) {
      const bj = corte[j].b;
      if (bi.x1 + tol >= bj.x0 && bj.x1 + tol >= bi.x0 && bi.y1 + tol >= bj.y0 && bj.y1 + tol >= bi.y0) uni(i, j);
    }
  }
  const map = new Map();
  for (let i = 0; i < corte.length; i++) {
    const r = find(i);
    if (!map.has(r)) map.set(r, []);
    map.get(r).push(corte[i]);
  }
  const islas = [];
  for (const arr of map.values()) {
    const x0 = Math.min(...arr.map(x => x.b.x0)), x1 = Math.max(...arr.map(x => x.b.x1));
    const y0 = Math.min(...arr.map(x => x.b.y0)), y1 = Math.max(...arr.map(x => x.b.y1));
    const w = Number(((x1 - x0) * f).toFixed(2)), h = Number(((y1 - y0) * f).toFixed(2));
    if (w < 8 && h < 8) continue;

    // Detectar cortes principales (verticales de largo > 40% H y horizontales de largo > 40% W, o > 20 cm)
    const segsV = [], segsH = [];
    for (const s of arr) {
      if (s.p.tipo !== 'raya' || s.p.curva) continue;
      const ax = (s.p.a[0] - x0) * f, ay = (s.p.a[1] - y0) * f;
      const bx = (s.p.b[0] - x0) * f, by = (s.p.b[1] - y0) * f;
      if (Math.abs(ax - bx) < 0.15 && Math.abs(ay - by) > 5) segsV.push({ x: Number(((ax + bx) / 2).toFixed(2)), y0: Number(Math.min(ay, by).toFixed(2)), y1: Number(Math.max(ay, by).toFixed(2)) });
      else if (Math.abs(ay - by) < 0.15 && Math.abs(ax - bx) > 5) segsH.push({ y: Number(((ay + by) / 2).toFixed(2)), x0: Number(Math.min(ax, bx).toFixed(2)), x1: Number(Math.max(ax, bx).toFixed(2)) });
    }
    // Ver si hay pestaña de ~3 cm (segmento corto de 3 cm en extremo!)
    const pestanas3 = [...segsV, ...segsH].filter(s => {
      const len = s.y1 !== undefined ? s.y1 - s.y0 : s.x1 - s.x0;
      return Math.abs(len - 3) < 0.25;
    });
    // Coordenadas de cortes que dividen la isla
    const uniq = (a) => { const s = [...a].sort((u, v) => u - v); const o = []; for (const v of s) if (!o.length || v - o.at(-1) > 0.3) o.push(v); return o; };
    const cortesX = uniq(segsV.filter(s => s.y1 - s.y0 > 18).map(s => s.x));
    const cortesY = uniq(segsH.filter(s => s.x1 - s.x0 > 18).map(s => s.y));
    const diffsX = cortesX.slice(1).map((v, i) => Number((v - cortesX[i]).toFixed(2)));
    const diffsY = cortesY.slice(1).map((v, i) => Number((v - cortesY[i]).toFixed(2)));

    // Radios dentro de esta isla
    const rads = new Set();
    for (const s of arr) {
      if (s.p.tipo === 'arco' && s.p.r > 0) rads.add(Number((s.p.r * f).toFixed(2)));
      else if (s.p.tipo === 'raya' && s.p.curva) {
        const l = Math.hypot(s.p.b[0] - s.p.a[0], s.p.b[1] - s.p.a[1]);
        rads.add(Number((l * (1 + s.p.curva ** 2) / (4 * Math.abs(s.p.curva)) * f).toFixed(2)));
      }
    }
    const labels = [...new Set(txts.filter(t => t.b.x0 >= x0 - 2/f && t.b.x1 <= x1 + 2/f && t.b.y0 >= y0 - 2/f && t.b.y1 <= y1 + 2/f).map(t => t.p.valor.replace(/\s+/g, ' ').trim()))];
    islas.push({ w, h, diffsX, diffsY, pestanas3: pestanas3.length, rads: [...rads], labels: labels.slice(0, 8) });
  }
  return islas;
}

for (const slug of ['belts', 'luz']) {
  console.log(`\n================ MEDIDAS EXACTAS ${slug.toUpperCase()} ================`);
  for (const ped of manifiesto[slug]) {
    const r = extraerResumenAlzadoYCorte(slug, ped);
    console.log(`\n${ped.pedido} (${ped.fecha}) | ${r.lineas.map(l => `${l.articulo}x${l.qty}`).join(',')}`);
    for (const mf of ped.maqDxfs) {
      const islas = medirBloquesMaqcorteExactos(path.join(DIR, slug, 'maqcorte-dxf', mf.nombre));
      const rad = r.radios.find(x => x.archivo === mf.nombre);
      console.log(`  DXF ${mf.nombre} | radios CUTTER=${JSON.stringify(rad?.radiosCutter)} DISCO1=${JSON.stringify(rad?.radiosDisco)}`);
      for (const is of islas) {
        console.log(`    Isla ${is.w}x${is.h} | dX=[${is.diffsX.join(',')}] dY=[${is.diffsY.join(',')}] pest3=${is.pestanas3} R=[${is.rads.join(',')}] txt=[${is.labels.join('|')}]`);
      }
    }
  }
}
