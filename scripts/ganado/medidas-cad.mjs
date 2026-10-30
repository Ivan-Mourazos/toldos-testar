// Reconstrucción de secciones y contraste independiente con el desarrollo CAD.
import { leerDxf, vertices, bulges, normal } from './medidas-dxf.mjs';
import { desarrollarBanda, desarrollarDesdeCentro, distancia, cruz, restar, sumar, por, producto, norma } from './medidas-geometria.mjs';
const EPS = 1e-6;
const clave = p => p.map(x => Math.round(x / EPS)).join(',');
const limites = ps => [0, 1, 2].map(k => [Math.min(...ps.map(p => p[k])), Math.max(...ps.map(p => p[k]))]);
const ancho = p => p.caja[1][1] - p.caja[1][0];
function curvaBulge(a, b, q, n) {
  if (!q) return { a, b, curva: false };
  const c = sumar(por(sumar(a, b), 0.5), por(cruz(n, restar(b, a)), (1 - q * q) / (4 * q)));
  return { a, b, c, u: restar(a, c), n, ang: 4 * Math.atan(q), curva: true };
}
function enCurva(s, t) {
  if (!s.curva) return sumar(s.a, por(restar(s.b, s.a), t));
  return sumar(s.c, sumar(por(s.u, Math.cos(s.ang * t)), por(cruz(s.n, s.u), Math.sin(s.ang * t))));
}
function invertir(s) { return s.curva ? { ...s, a: s.b, b: s.a, u: restar(s.b, s.c), ang: -s.ang } : { ...s, a: s.b, b: s.a }; }
function parametro(s, q) {
  if (!s.curva) { const v = restar(s.b, s.a), t = producto(restar(q, s.a), v) / producto(v, v); return distancia(enCurva(s, t), q) < EPS ? t : null; }
  if (Math.abs(distancia(q, s.c) - norma(s.u)) > EPS) return null;
  const v = restar(q, s.c); let ang = Math.atan2(producto(v, cruz(s.n, s.u)), producto(v, s.u));
  if (s.ang > 0 && ang < -EPS) ang += 2 * Math.PI;
  if (s.ang < 0 && ang > EPS) ang -= 2 * Math.PI;
  return ang / s.ang;
}

export function extraerSecciones(f) {
  const es = leerDxf(f).entidades;
  // El CAD no obliga a orientar el remolque con un eje concreto. Se elige el eje
  // longitudinal por la normal predominante de los arcos verticales, sin mirar
  // el resultado plano ni sus medidas.
  const verticales=es.filter(e=>e.t==='ARC'&&limites(vertices(e,4))[2][1]-limites(vertices(e,4))[2][0]>.001);
  const contar=k=>verticales.filter(e=>{const n=restar(e.T(normal(e)),e.T([0,0,0]));return Math.abs(n[k])>.999;}).length;
  const giro=contar(1)>contar(0);
  if(giro)for(const e of es){const T=e.T;e.T=p=>{const q=T(p);return [q[1],-q[0],q[2]];};}
  const perfiles = [];
  for (const e of es) {
    if (!['POLYLINE', 'LWPOLYLINE'].includes(e.t) || e.bloque) continue;
    const ps = vertices(e), c = ps.length ? limites(ps) : null;
    if (!c || c[0][1] - c[0][0] > EPS || c[1][1] - c[1][0] < 0.2 || c[2][1] - c[2][0] < 0.1) continue;
    // Normal transformada; permite INSERT si en el futuro se amplía esa selección.
    const n = restar(e.T(normal(e)), e.T([0, 0, 0]));
    const bs = bulges(e), segmentos = [];
    for (let i = 0; i + 1 < ps.length; i++) segmentos.push({ ...curvaBulge(ps[i], ps[i + 1], bs[i], n), id: e.id + ':' + i });
    if (distancia(ps[0], ps.at(-1)) < EPS || Math.abs(ps[0][2] - ps.at(-1)[2]) > 0.05) continue;
    perfiles.push({ id: e.id, capa: e.capa, segmentos, caja: c, origen: 'polilínea' });
  }
  // En dibujos antiguos los perfiles están explotados en LINE y ARC.
  const planos = new Map();
  for (const e of es) {
    if (e.bloque || !['LINE', 'ARC'].includes(e.t)) continue;
    const ps = vertices(e, 2), c = limites(ps);
    if (c[0][1] - c[0][0] > EPS) continue;
    if (Math.max(...ps.map(p => Math.abs(p[2]))) < EPS) continue;
    let s;
    if (e.t === 'LINE') { if (distancia(ps[0], ps[1]) < EPS) continue; s = { a: ps[0], b: ps[1], curva: false }; }
    else {
      const n = restar(e.T(normal(e)), e.T([0, 0, 0]));
      // El centro en WCS se obtiene del plano OCS a través del muestreo del arco.
      const ang = ((+e.g[51] - +e.g[50] + 360) % 360) * Math.PI / 180;
      s = curvaBulge(ps[0], ps.at(-1), Math.tan(ang / 4), n);
    }
    const k = Math.round(ps[0][0] / EPS);
    if (!planos.has(k)) planos.set(k, []);
    const list = planos.get(k);
    if (!list.some(t => (distancia(t.a, s.a) < EPS && distancia(t.b, s.b) < EPS || distancia(t.a, s.b) < EPS && distancia(t.b, s.a) < EPS) && t.curva === s.curva)) list.push({ ...s, id: e.id, capa: e.capa });
  }
  for (let segmentos of planos.values()) {
    if (!segmentos.some(s => s.curva)) continue;
    // Las cuerdas auxiliares de un arco no son un segundo perfil. Conservar el
    // ARC evita sustituirlo por el camino de mayor número de líneas auxiliares.
    segmentos = segmentos.filter(s => s.curva || !segmentos.some(a => { if (!a.curva) return false; const t = parametro(a, s.a), u = parametro(a, s.b); return t != null && u != null && t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS; }));
    const ady = new Map();
    segmentos.forEach((s, i) => { for (const p of [s.a, s.b]) { const k = clave(p); if (!ady.has(k)) ady.set(k, []); ady.get(k).push(i); } });
    const vistos = new Set();
    for (let i = 0; i < segmentos.length; i++) {
      if (vistos.has(i)) continue;
      const cola = [i], grupo = [];
      while (cola.length) { const j = cola.pop(); if (vistos.has(j)) continue; vistos.add(j); grupo.push(j); for (const p of [segmentos[j].a, segmentos[j].b]) cola.push(...(ady.get(clave(p)) ?? []).filter(x => !vistos.has(x))); }
      if (grupo.length < 4 || grupo.length > 24 || grupo.filter(j => segmentos[j].curva).length < 2) continue;
      const ps = grupo.flatMap(j => [segmentos[j].a, segmentos[j].b]), c = limites(ps);
      const extremos = [...ady.keys()].filter(k => ady.get(k).some(j => grupo.includes(j)) && ady.get(k).filter(j => grupo.includes(j)).length === 1).map(k => { const s = segmentos[ady.get(k)[0]]; return clave(s.a) === k ? s.a : s.b; });
      const abajo = extremos.filter(p => p[2] - c[2][0] < 0.005).sort((a, b) => a[1] - b[1]);
      if (abajo.length < 2) continue;
      let mejor = null;
      function recorrer(p, camino, usados) {
        if (camino.length > 24) return;
        if (camino.length >= 4 && distancia(p, abajo.at(-1)) < EPS) { if (!mejor || camino.length > mejor.length) mejor = camino; return; }
        for (const j of ady.get(clave(p)) ?? []) {
          if (usados.has(j) || !grupo.includes(j)) continue;
          const s = distancia(segmentos[j].a, p) < EPS ? segmentos[j] : invertir(segmentos[j]);
          recorrer(s.b, [...camino, s], new Set([...usados, j]));
        }
      }
      recorrer(abajo[0], [], new Set());
      if (mejor?.filter(s => s.curva).length >= 2 && c[1][1] - c[1][0] > 0.2 && c[2][1] - c[2][0] > 0.1) perfiles.push({ id: mejor.map(s => s.id).join('+'), capa: [...new Set(mejor.map(s => s.capa))].join('/'), segmentos: mejor, caja: c, origen: 'líneas y arcos' });
    }
  }
  const lineas = es.filter(e => e.t === 'LINE' && !e.bloque).map(e => ({ id: e.id, ps: vertices(e) }));
  for (const p of perfiles) {
    p.caja=limites(p.segmentos.flatMap(s=>Array.from({length:s.curva?25:2},(_,i)=>enCurva(s,i/(s.curva?24:1)))));
    if (p.segmentos[0].a[1] > p.segmentos.at(-1).b[1]) p.segmentos = p.segmentos.toReversed().map(invertir);
    // Los puntos intermedios se leen del 3D cuando conserva las generatrices.
    const enlaces = lineas.filter(l => Math.abs(l.ps[0][0] - l.ps[1][0]) > 0.01).flatMap(l => l.ps).filter(q => Math.abs(q[0] - p.caja[0][0]) < EPS);
    const parametros = p.segmentos.map(s => {
      const ts = [];
      for (const q of enlaces) {
        const t = parametro(s, q); if (t == null) continue;
        if (t > EPS && t < 1 - EPS && !ts.some(x => Math.abs(t - x) < EPS)) ts.push(t);
      }
      return ts;
    });
    const ps = []; p.muestreo = [];
    for (let j = 0; j < p.segmentos.length; j++) {
      const s = p.segmentos[j], ts = parametros[j];
      if (!ts.length && s.curva) {
        const espejo = p.segmentos.findIndex((q, k) => k !== j && q.curva && parametros[k].length && Math.abs(norma(q.u) - norma(s.u)) < EPS && Math.abs(Math.abs(q.ang) - Math.abs(s.ang)) < 0.001);
        if (espejo >= 0) ts.push(...parametros[espejo].map(t => 1 - t));
      }
      if (!ts.length && s.curva) ts.push(0.25, 0.5, 0.75);
      if (!ts.length && !s.curva && Math.abs(s.a[2] - s.b[2]) < EPS && s.a[2] - p.caja[2][0] > 0.1 && distancia(s.a, s.b) > EPS) ts.push(0.5);
      ts.sort((a,b)=>a-b); p.muestreo.push([0,...ts]);
      ps.push(s.a, ...ts.map(t => enCurva(s, t)));
    }
    ps.push(p.segmentos.at(-1).b);
    p.puntos = ps;
    p.radios = p.segmentos.filter(s => s.curva).map(s => norma(s.u));
  }
  return { es, perfiles, giro };
}

// Ajuste rígido, sin escala. La reflexión solo cambia qué cara de la lona se ve.
export function ajustar(a, b) {
  if (a.length !== b.length) throw Error('Correspondencia de puntos incompleta');
  let mejor;
  const ac = [0, 1].map(k => a.reduce((s, p) => s + p[k], 0) / a.length), bc = [0, 1].map(k => b.reduce((s, p) => s + p[k], 0) / b.length);
  for (const signo of [1, -1]) {
    let x = 0, y = 0;
    for (let i = 0; i < a.length; i++) { const u = a[i][0] - ac[0], v = (a[i][1] - ac[1]) * signo, w = b[i][0] - bc[0], z = b[i][1] - bc[1]; x += u * w + v * z; y += u * z - v * w; }
    const ang = Math.atan2(y, x), c = Math.cos(ang), s = Math.sin(ang);
    const T = p => [(p[0] - ac[0]) * c - (p[1] - ac[1]) * signo * s + bc[0], (p[0] - ac[0]) * s + (p[1] - ac[1]) * signo * c + bc[1]];
    const puntos = a.map(T), errores = puntos.map((p, i) => distancia(p, b[i]));
    const r = { rms: Math.hypot(...errores) / Math.sqrt(errores.length), max: Math.max(...errores), puntos, errores, T };
    if (!mejor || r.rms < mejor.rms) mejor = r;
  }
  return mejor;
}
const longitud = ps => ps.slice(1).reduce((s, p, i) => s + distancia(p, ps[i]), 0);
function candidatosLado(ps, planos, perfil) {
  const out=[];
  for(const p of planos)for(const invertido of [false,true]){
    let q=invertido?p.ps.toReversed():p.ps;
    let arcos=[];
    if(p.bs.some(x=>Math.abs(x)>EPS)){
      if(p.ps.length!==perfil.segmentos.length+1)continue;
      const raw=p.ps.map(v=>[...v,0]),segs=[];
      for(let i=0;i+1<raw.length;i++)segs.push(curvaBulge(raw[i],raw[i+1],p.bs[i],[0,0,1]));
      const ss=invertido?segs.toReversed().map(invertir):segs;
      if(ss.some((s,i)=>s.curva!==perfil.segmentos[i].curva))continue;
      q=ss.flatMap((s,i)=>perfil.muestreo[i].map(t=>enCurva(s,t).slice(0,2)));
      q.push(ss.at(-1).b.slice(0,2));
      arcos=ss.flatMap((s,i)=>s.curva?[{segmento:i,radioPlanoMm:norma(s.u)*1000,centroPlano:s.c.slice(0,2),barridoGrados:Math.abs(s.ang)*180/Math.PI,longitudPlanoMm:norma(s.u)*Math.abs(s.ang)*1000,longitudPerfil3dMm:norma(perfil.segmentos[i].u)*Math.abs(perfil.segmentos[i].ang)*1000,diferenciaLongitudMm:(norma(s.u)*Math.abs(s.ang)-norma(perfil.segmentos[i].u)*Math.abs(perfil.segmentos[i].ang))*1000}]:[]);
    }
    if(q.length===ps.length&&Math.abs(longitud(q)-longitud(ps))<.1)out.push({...p,ps:q,arcos,ajuste:ajustar(ps,q)});
  }
  return out.sort((a,b)=>a.ajuste.rms-b.ajuste.rms).slice(0,8);
}
export function compararFuente(f, metodo = 'centro') {
  const { es, perfiles } = extraerSecciones(f.dxf);
  const signoPlano=e=>Math.sign(restar(e.T(normal(e)),e.T([0,0,0]))[2])||1;
  const conectores=es.filter(e=>e.t==='LINE').map(e=>vertices(e)).filter(ps=>Math.abs(ps[0][2]-ps[1][2])<EPS).map(ps=>ps.map(p=>p.slice(0,2)));
  for(const e of es.filter(e=>['LWPOLYLINE','POLYLINE'].includes(e.t))){const ps=vertices(e),bs=bulges(e);if(!ps.length||limites(ps)[2][1]-limites(ps)[2][0]>EPS)continue;for(let i=0;i+1<ps.length;i++)if(!bs[i])conectores.push([ps[i].slice(0,2),ps[i+1].slice(0,2)]);}
  function conectado(a,b){
    const v=restar(b,a),l=norma(v);if(l<EPS)return true;
    const tramos=[];
    for(const [p,q] of conectores){const tp=producto(restar(p,a),v)/(l*l),tq=producto(restar(q,a),v)/(l*l);if(distancia(p,sumar(a,por(v,tp)))>EPS||distancia(q,sumar(a,por(v,tq)))>EPS)continue;tramos.push([Math.min(tp,tq),Math.max(tp,tq)]);}
    tramos.sort((a,b)=>a[0]-b[0]);let fin=0;for(const [x,y] of tramos){if(x>fin+EPS)break;if(y>fin)fin=y;}return fin>=1-EPS;
  }
  const planos = es.filter(e => ['LWPOLYLINE', 'POLYLINE'].includes(e.t) && /refer|tubos|borrar|ejes/i.test(e.capa)).map(e => ({ id: e.id, capa: e.capa, ps: vertices(e).map(p => p.slice(0, 2)), zs: vertices(e).map(p => p[2]), bs: bulges(e).map(q=>q*signoPlano(e)) })).filter(p => p.ps.length >= 6 && Math.max(...p.zs) - Math.min(...p.zs) < EPS);
  const bandas = [];
  for (let i = 0; i < perfiles.length; i++) for (let j = i + 1; j < perfiles.length; j++) {
    let a = perfiles[i], b = perfiles[j];
    if (ancho(a) < ancho(b)) [a, b] = [b, a];
    const dx = Math.abs(a.caja[0][0] - b.caja[0][0]);
    if (dx < 0.1 || dx > 3 || Math.abs((a.caja[1][0] + a.caja[1][1]) - (b.caja[1][0] + b.caja[1][1])) > 0.03 || ancho(a) - ancho(b) < 0.05) continue;
    if (a.puntos.length !== b.puntos.length) { bandas.push({ perfiles: [a.id, b.id], estado: 'sin correspondencia de secciones', puntosA: a.puntos.length, puntosB: b.puntos.length }); continue; }
    const r = metodo === 'centro' && a.puntos.length % 2 ? desarrollarDesdeCentro(a.puntos, b.puntos) : desarrollarBanda(a.puntos, b.puntos), ca = candidatosLado(r.a, planos,a), cb = candidatosLado(r.b, planos,b);
    let mejor;
    for (const pa of ca) for (const pb of cb) {
      if (pa.id === pb.id) continue;
      const aj = ajustar([...r.a, ...r.b], [...pa.ps, ...pb.ps]);
      const cierres=Number(conectado(pa.ps[0],pb.ps[0]))+Number(conectado(pa.ps.at(-1),pb.ps.at(-1)));
      if (!mejor || cierres>mejor.cierres || cierres===mejor.cierres&&aj.rms < mejor.ajuste.rms) mejor = { a: pa, b: pb, ajuste: aj,cierres };
    }
    const apoyoEnlaces = es.filter(e => e.t === 'LINE' && !e.bloque).map(e => vertices(e)).filter(ps => [ps, ps.toReversed()].some(([p,q]) => Math.abs(p[0]-a.caja[0][0]) < EPS && Math.abs(q[0]-b.caja[0][0]) < EPS && p[1]>=a.caja[1][0]-EPS && p[1]<=a.caja[1][1]+EPS && q[1]>=b.caja[1][0]-EPS && q[1]<=b.caja[1][1]+EPS)).length;
    const fila = { perfiles: [a.id, b.id], origen: [a.origen, b.origen], apoyoEnlaces, puntosPorPerfil: a.puntos.length, radiosMm: [a.radios.map(x => x * 1000), b.radios.map(x => x * 1000)], anchoMm: ancho(a) * 1000, frenteMm: ancho(b) * 1000, proyeccionMm: dx * 1000, alturaMm: [a.caja[2][1] - a.caja[2][0], b.caja[2][1] - b.caja[2][0]].map(x => x * 1000), estado: mejor ? (mejor.ajuste.max <= 0.001 ? 'cuadra' : 'no cuadra') : 'sin desarrollo plano identificado' };
    if (mejor) {
      const original = [...mejor.a.ps, ...mejor.b.ps];
      const pred = mejor.ajuste.puntos;
      const distancias = (x, y) => x.map(p => Math.min(...y.map(q => distancia(p, q))));
      const ida = distancias(pred, original), vuelta = distancias(original, pred);
      const difLong = [];
      for (const [gen, real] of [[r.a, mejor.a.ps], [r.b, mejor.b.ps]]) for (let k = 1; k < gen.length; k++) difLong.push(Math.abs(distancia(gen[k - 1], gen[k]) - distancia(real[k - 1], real[k])) * 1000);
      for (let k = 0; k < r.a.length; k++) difLong.push(Math.abs(distancia(r.a[k], r.b[k]) - distancia(mejor.a.ps[k], mejor.b.ps[k])) * 1000);
      Object.assign(fila, { referenciaPlana: [mejor.a.id, mejor.b.id], capasPlanas: [mejor.a.capa, mejor.b.capa], cierresIdentificados:mejor.cierres,asociacion:mejor.cierres===2?'Contorno cerrado por las uniones originales':'Pareja candidata sin los dos cierres identificados',errorVerticesMm: mejor.ajuste.max * 1000, rmsMm: mejor.ajuste.rms * 1000, errorIdaMm: Math.max(...ida) * 1000, errorVueltaMm: Math.max(...vuelta) * 1000, errorLongitudesMm: Math.max(...difLong), puntos3d: [a.puntos, b.puntos], generado: pred, referencia: original, erroresPorVerticeMm: mejor.ajuste.errores.map(x => x * 1000), longitudesDiferenciaMm: difLong });
      fila.arcosMorro=[{lado:'cuerpo',entidad:mejor.a.id,arcos:mejor.a.arcos},{lado:'frente',entidad:mejor.b.id,arcos:mejor.b.arcos}];
      const erroresArcos=fila.arcosMorro.flatMap(l=>l.arcos.map(a=>Math.abs(a.diferenciaLongitudMm)));
      fila.errorLongitudArcosMorroMm=erroresArcos.length?Math.max(...erroresArcos):null;
      if(fila.errorLongitudArcosMorroMm>1)fila.estado='no cuadra';
      if(mejor.cierres<2 && fila.estado==='no cuadra')fila.estado='sin correspondencia acreditada';
    }
    bandas.push(fila);
  }
  const arcos = [];
  const cabezas = es.filter(e => ['LWPOLYLINE','POLYLINE'].includes(e.t) && /refer|tubos|borrar|ejes/i.test(e.capa)).map(e => ({ id:e.id,capa:e.capa,ps:vertices(e),bs:bulges(e).map(q=>q*signoPlano(e)) })).filter(e => e.bs.filter(q=>Math.abs(q)>EPS).length>=2 && e.ps.length>=4 && e.ps.length<=12 && limites(e.ps)[2][1]-limites(e.ps)[2][0]<EPS);
  for (const p of perfiles) {
    const ps=[...p.segmentos.map(s=>s.a),p.segmentos.at(-1).b].map(q=>[q[1],q[2]]);
    const reales=p.segmentos.map((s,i)=>s.curva?{i,radio:norma(s.u),angulo:Math.abs(s.ang),centro:[s.c[1],s.c[2]],medio:enCurva(s,.5).slice(1)}:null).filter(Boolean);
    let mejor;
    for(const c of cabezas.filter(c=>c.ps.length===ps.length)) for(const invertido of [false,true]) {
      const pts=(invertido?c.ps.toReversed():c.ps).map(q=>q.slice(0,2));
      const aj=ajustar(ps,pts);
      const cs=[];
      for(let i=0;i+1<c.ps.length;i++){const q=c.bs[i];if(q){const cuerda=distancia(c.ps[i],c.ps[i+1]),s=curvaBulge(c.ps[i],c.ps[i+1],q,[0,0,1]);cs.push({i:invertido?c.ps.length-2-i:i,radio:cuerda*(1+q*q)/(4*Math.abs(q)),angulo:Math.abs(4*Math.atan(q)),centro:s.c.slice(0,2),medio:enCurva(s,.5).slice(0,2)});}}
      cs.sort((a,b)=>a.i-b.i);
      if(cs.length!==reales.length || cs.some((s,i)=>s.i!==reales[i].i))continue;
      if(!mejor||aj.rms<mejor.aj.rms)mejor={c,aj,cs};
    }
    if(mejor){
      const radios=reales.map((s,i)=>Math.abs(s.radio-mejor.cs[i].radio)*1000),longitudes=reales.map((s,i)=>Math.abs(s.radio*s.angulo-mejor.cs[i].radio*mejor.cs[i].angulo)*1000);
      const centros=reales.map((s,i)=>distancia(mejor.aj.T(s.centro),mejor.cs[i].centro)*1000),medios=reales.map((s,i)=>distancia(mejor.aj.T(s.medio),mejor.cs[i].medio)*1000);
      arcos.push({perfil:p.id,referenciaPlana:mejor.c.id,capa:mejor.c.capa,arcos:reales.length,errorVerticesMm:mejor.aj.max*1000,errorRadiosMm:Math.max(...radios),errorCentrosMm:Math.max(...centros),errorPuntoMedioMm:Math.max(...medios),errorLongitudArcoMm:Math.max(...longitudes),errorBarridoGrados:Math.max(...reales.map((s,i)=>Math.abs(s.angulo-mejor.cs[i].angulo)*180/Math.PI)),estado:Math.max(mejor.aj.max*1000,...radios,...longitudes,...centros,...medios)<=1?'cuadra':'no cuadra',alcance:'Arcos del perfil y cabeza terminada; no acredita los arcos del corte del morro'});
    }
  }
  return { id: f.id, fuente: f.dxf, original: f.original, cliente: f.cliente, nombre: f.nombre, perfiles: perfiles.map(p => ({ id: p.id, origen: p.origen, capa: p.capa, puntos: p.puntos.length, radiosMm: p.radios.map(x => x * 1000) })), bandas, arcos };
}
