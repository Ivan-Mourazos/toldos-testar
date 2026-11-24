// Analiza todos los DXF de maqcorte y las presentaciones de los DWG de Belts Vigo y Puertas Luz.
// Lee solo las copias locales bajo tmp/belts-luz/.
import fs from 'node:fs';
import path from 'node:path';
import { leerPlanoTexto, presentacionesDxf, textoDxf, cajaPrimitiva } from '../src/flujoDwg/planoDxf.js';

const DIR = 'tmp/belts-luz';
const manifiesto = JSON.parse(fs.readFileSync(path.join(DIR, 'manifiesto-pedidos.json'), 'utf8'));

// Extrae componentes conexos (piezas) de un DXF de maqcorte (en mm)
function analizarMaqcorteDxf(ruta) {
  const txt = textoDxf(fs.readFileSync(ruta));
  const plano = leerPlanoTexto(txt);
  // Agrupar primitivas de DISCO1/CUTTER/ROTULADOR/texto por proximidad (bounding boxes solapados + margen 25mm)
  const items = [];
  for (const p of plano.modelo) {
    if (!['raya', 'arco', 'texto'].includes(p.tipo)) continue;
    const b = cajaPrimitiva(p);
    if (![b.x0, b.x1, b.y0, b.y1].every(Number.isFinite)) continue;
    items.push({ p, b });
  }
  // Detectar si está en mm o m o cm (en maqcorte suele ser mm, ej. 3000)
  const xs = items.flatMap(i => [i.b.x0, i.b.x1]);
  const ys = items.flatMap(i => [i.b.y0, i.b.y1]);
  const span = Math.max((Math.max(...xs) - Math.min(...xs)) || 0, (Math.max(...ys) - Math.min(...ys)) || 0);
  // Escala a cm: si span > 2000 suele ser mm (div 10); si span < 100 suele ser m (mul 100)
  const factorCm = span > 1500 ? 0.1 : span < 120 ? 100 : 1;

  // Separar piezas usando solo DISCO1 y CUTTER exteriores: agrupamos rayos/arcos conectados por vértices (tolerancia 2mm)
  const corte = items.filter(i => ['DISCO1', 'CUTTER', 'corte', 'CORTE'].includes(i.p.capa) && i.p.tipo !== 'texto');
  const parent = corte.map((_, idx) => idx);
  const find = (a) => parent[a] === a ? a : (parent[a] = find(parent[a]));
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };

  const tol = factorCm === 0.1 ? 3 : factorCm === 100 ? 0.003 : 0.3;
  // Conectar segmentos que comparten extremo o se solapan en caja (dentro de 3mm)
  for (let i = 0; i < corte.length; i++) {
    const bi = corte[i].b;
    for (let j = i + 1; j < corte.length; j++) {
      const bj = corte[j].b;
      if (bi.x1 + tol >= bj.x0 && bj.x1 + tol >= bi.x0 && bi.y1 + tol >= bj.y0 && bj.y1 + tol >= bi.y0) {
        union(i, j);
      }
    }
  }
  const grupos = new Map();
  for (let i = 0; i < corte.length; i++) {
    const r = find(i);
    if (!grupos.has(r)) grupos.set(r, []);
    grupos.get(r).push(corte[i]);
  }

  // Calcular caja de cada grupo y separar exteriores vs huecos internos
  const cajas = [...grupos.values()].map(arr => {
    const x0 = Math.min(...arr.map(i => i.b.x0));
    const x1 = Math.max(...arr.map(i => i.b.x1));
    const y0 = Math.min(...arr.map(i => i.b.y0));
    const y1 = Math.max(...arr.map(i => i.b.y1));
    const capas = [...new Set(arr.map(i => i.p.capa))];
    const tieneArco = arr.some(i => i.p.tipo === 'arco' || (i.p.tipo === 'raya' && i.p.curva));
    return { x0, x1, y0, y1, w: (x1 - x0) * factorCm, h: (y1 - y0) * factorCm, capas, tieneArco, arr };
  });

  // Un grupo contenido estrictamente dentro de otro mayor es un hueco (ventana o recorte E.T.)
  const piezas = [];
  for (let i = 0; i < cajas.length; i++) {
    const ci = cajas[i];
    const padre = cajas.findIndex((cj, j) => j !== i && cj.x0 <= ci.x0 + tol && cj.x1 >= ci.x1 - tol && cj.y0 <= ci.y0 + tol && cj.y1 >= ci.y1 - tol && (cj.w * cj.h > ci.w * ci.h * 1.05));
    if (padre >= 0) continue;
    // Recoger huecos dentro de ci
    const huecos = cajas.filter((cj, j) => j !== i && ci.x0 <= cj.x0 + tol && ci.x1 >= cj.x1 - tol && ci.y0 <= cj.y0 + tol && ci.y1 >= cj.y1 - tol && (ci.w * ci.h > cj.w * cj.h * 1.05))
      .map(h => ({
        w: Number(h.w.toFixed(2)),
        h: Number(h.h.toFixed(2)),
        dx: Number(((h.x0 - ci.x0) * factorCm).toFixed(2)),
        dy: Number(((h.y0 - ci.y0) * factorCm).toFixed(2)),
        arco: h.tieneArco,
      }));
    // Recoger marcas ROTULADOR dentro de ci
    const marcas = items.filter(it => ['ROTULADOR', 'marca', 'MARCA'].includes(it.p.capa) && it.p.tipo === 'raya'
      && it.b.x0 >= ci.x0 - tol && it.b.x1 <= ci.x1 + tol && it.b.y0 >= ci.y0 - tol && it.b.y1 <= ci.y1 + tol);
    const marcasH = [], marcasV = [];
    for (const m of marcas) {
      const dx = Math.abs(m.p.b[0] - m.p.a[0]) * factorCm;
      const dy = Math.abs(m.p.b[1] - m.p.a[1]) * factorCm;
      if (dy < 0.15 && dx > Math.min(ci.w, ci.h) * 0.3) {
        marcasH.push(Number(((m.p.a[1] - ci.y0) * factorCm).toFixed(2)));
      } else if (dx < 0.15 && dy > Math.min(ci.w, ci.h) * 0.3) {
        marcasV.push(Number(((m.p.a[0] - ci.x0) * factorCm).toFixed(2)));
      }
    }
    // Textos dentro o muy cerca de ci
    const textos = items.filter(it => it.p.tipo === 'texto'
      && it.b.x0 >= ci.x0 - 50 && it.b.x1 <= ci.x1 + 50 && it.b.y0 >= ci.y0 - 50 && it.b.y1 <= ci.y1 + 50)
      .map(it => it.p.valor.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    piezas.push({
      w: Number(ci.w.toFixed(2)),
      h: Number(ci.h.toFixed(2)),
      x0: Number((ci.x0 * factorCm).toFixed(1)),
      y0: Number((ci.y0 * factorCm).toFixed(1)),
      capas: ci.capas,
      arco: ci.tieneArco,
      huecos,
      marcasH: [...new Set(marcasH)].sort((a, b) => a - b),
      marcasV: [...new Set(marcasV)].sort((a, b) => a - b),
      textos: [...new Set(textos)],
    });
  }
  piezas.sort((a, b) => b.w * b.h - a.w * a.h);
  return { factorCm, totalPiezas: piezas.length, piezas };
}

function analizarPlanoDxf(ruta) {
  const txt = textoDxf(fs.readFileSync(ruta));
  const hojas = presentacionesDxf(txt);
  const resHojas = hojas.map(h => {
    const textos = h.primitivas
      .filter(p => p.tipo === 'texto' && p.valor.trim())
      .map(p => ({ esp: p.espacio, capa: p.capa, t: p.valor.replace(/\s+/g, ' ').trim() }));
    const cotas = h.primitivas
      .filter(p => p.tipo === 'cota')
      .map(p => ({ capa: p.capa, m: Number((p.medida * 100).toFixed(2)), r: p.valor || '' }));
    return {
      nombre: h.nombre,
      nTextos: textos.length,
      nCotas: cotas.length,
      textosPapel: textos.filter(t => t.esp === 'papel').map(t => t.t),
      textosModelo: [...new Set(textos.filter(t => t.esp !== 'papel').map(t => t.t))],
      cotasModelo: cotas,
    };
  });
  return { hojas: resHojas };
}

const informe = {};
for (const slug of ['belts', 'luz']) {
  informe[slug] = [];
  console.log(`\n==================== ${slug.toUpperCase()} ====================`);
  for (const ped of manifiesto[slug]) {
    const base = path.join(DIR, slug);
    const cortes = ped.maqDxfs.map(f => ({
      archivo: f.nombre,
      ...analizarMaqcorteDxf(path.join(base, 'maqcorte-dxf', f.nombre)),
    }));
    const planos = ped.dwgs.filter(d => d.dxfOk).map(d => {
      const dxfName = d.nombre.replace(/\.dwg$/i, '.dxf');
      return {
        archivo: d.nombre,
        ...analizarPlanoDxf(path.join(base, 'dxf-plano', dxfName)),
      };
    });
    const item = { pedido: ped.pedido, fecha: ped.fecha, lineas: ped.lineas, cortes, planos };
    informe[slug].push(item);

    console.log(`\n--- ${ped.pedido} (${ped.fecha}) | ${ped.lineas.map(l => `${l.articulo} x${l.cantidad} OF=${l.of}`).join(' ; ')} ---`);
    for (const l of ped.lineas) console.log(`  RPS: ${(l.comentario || '').replace(/\s+/g, ' ').slice(0, 180)}`);
    for (const c of cortes) {
      console.log(`  MAQCORTE ${c.archivo} (factor=${c.factorCm}, piezas=${c.totalPiezas}):`);
      for (const pz of c.piezas) {
        const mh = pz.marcasH.length ? ` marcasH=[${pz.marcasH.join(',')}]` : '';
        const mv = pz.marcasV.length ? ` marcasV=[${pz.marcasV.join(',')}]` : '';
        const hu = pz.huecos.length ? ` huecos=${pz.huecos.map(h => `${h.w}x${h.h}@(${h.dx},${h.dy})${h.arco ? 'R' : ''}`).join(';')}` : '';
        const tx = pz.textos.length ? ` txt=[${pz.textos.slice(0, 6).join(' | ')}]` : '';
        console.log(`    - ${pz.w} x ${pz.h} cm${pz.arco ? ' (arco)' : ''}${mh}${mv}${hu}${tx}`);
      }
    }
    for (const pl of planos) {
      console.log(`  PLANO ${pl.archivo}: ${pl.hojas.length} presentaciones`);
      for (const h of pl.hojas) {
        const notas = h.textosModelo.filter(t => !/^\d+([.,]\d+)?$/.test(t) && t.length > 1).slice(0, 20);
        console.log(`    Hoja "${h.nombre}": ${h.nCotas} cotas | textos=[${notas.join(' | ')}]`);
      }
    }
  }
}

fs.writeFileSync(path.join(DIR, 'analisis-pedidos.json'), JSON.stringify(informe, null, 2));
console.log('\nGuardado tmp/belts-luz/analisis-pedidos.json');
