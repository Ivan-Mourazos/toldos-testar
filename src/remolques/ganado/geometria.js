// Geometría del estudio, en mm. No contiene medidas de ningún pedido.
export const sumar = (a, b) => a.map((x, i) => x + b[i]);
export const restar = (a, b) => a.map((x, i) => x - b[i]);
export const por = (a, k) => a.map(x => x * k);
export const producto = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norma = a => Math.hypot(...a);
export const distancia = (a, b) => norma(restar(a, b));
export const unitario = a => por(a, 1 / norma(a));

// Algoritmo del eje arbitrario de DXF. LINE usa WCS; ARC/CIRCLE y polilíneas 2D usan OCS.
export function ocs(p, normal = [0, 0, 1]) {
  const n = unitario(normal);
  const x = unitario(cruz(Math.abs(n[0]) < 1 / 64 && Math.abs(n[1]) < 1 / 64 ? [0, 1, 0] : [0, 0, 1], n));
  const y = cruz(n, x);
  return sumar(sumar(por(x, p[0]), por(y, p[1])), por(n, p[2] || 0));
}

const signo = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
function tercerPunto(a, b, da, db, lado) {
  const c = distancia(a, b);
  if (c < 1e-10) throw Error('Arista degenerada en el desarrollo');
  const x = (da * da + c * c - db * db) / (2 * c);
  const h2 = da * da - x * x;
  if (h2 < -1e-5) throw Error('Triángulo imposible');
  const h = Math.sqrt(Math.max(0, h2)) * lado, ux = (b[0] - a[0]) / c, uy = (b[1] - a[1]) / c;
  return [a[0] + x * ux - h * uy, a[1] + x * uy + h * ux];
}

// Una banda abierta entre dos secciones. Mantiene las longitudes de los triángulos,
// sin afirmar que una superficie alabeada sea desarrollable sin deformación.
export function desarrollarBanda(a3, b3, diagonal = 'a-siguiente') {
  if (a3.length !== b3.length || a3.length < 2) throw Error('Las secciones deben tener la misma correspondencia');
  if (diagonal === 'b-siguiente') {
    const r = desarrollarBanda(b3, a3);
    return { ...r, a: r.b, b: r.a };
  }
  const a = [[0, 0]], b = [[distancia(a3[0], b3[0]), 0]], triangulos = [];
  for (let i = 0; i + 1 < a3.length; i++) {
    const lado = i ? -signo(a[i], b[i], b[i - 1]) || 1 : 1;
    a.push(tercerPunto(a[i], b[i], distancia(a3[i], a3[i + 1]), distancia(b3[i], a3[i + 1]), lado));
    b.push(tercerPunto(a[i + 1], b[i], distancia(a3[i + 1], b3[i + 1]), distancia(b3[i], b3[i + 1]), -signo(a[i + 1], b[i], a[i]) || 1));
    triangulos.push({ espacio: [a3[i], b3[i], a3[i + 1]], plano: [a[i], b[i], a[i + 1]] });
    triangulos.push({ espacio: [a3[i + 1], b3[i], b3[i + 1]], plano: [a[i + 1], b[i], b[i + 1]] });
  }
  return { a, b, contorno: [...a, ...b.toReversed()], triangulos };
}

// Apertura desde la cumbrera: cada mitad se triangula hacia su propio borde.
// Evita imponer a la segunda mitad la diagonal escogida para la primera.
export function desarrollarDesdeCentro(a3, b3) {
  if (a3.length !== b3.length || a3.length % 2 !== 1) throw Error('La cumbrera necesita correspondencia central');
  const k = (a3.length - 1) / 2;
  const iz = desarrollarBanda(a3.slice(0, k + 1).toReversed(), b3.slice(0, k + 1).toReversed());
  const de = desarrollarBanda(a3.slice(k), b3.slice(k));
  const reflejar = p => [p[0], -p[1]];
  const a = [...iz.a.toReversed(), ...de.a.slice(1).map(reflejar)], b = [...iz.b.toReversed(), ...de.b.slice(1).map(reflejar)];
  return { a, b, contorno: [...a, ...b.toReversed()], triangulos: [...iz.triangulos, ...de.triangulos.map(t => ({ ...t, plano: t.plano.map(reflejar) }))] };
}

// Perfil con dos aguas y redondeos tangentes a lateral y agua. Las aguas se miden
// desde la intersección teórica de rectas a la cumbrera; no desde la tangencia.
export function perfil({ ancho, alto, aguas, radio, pasos = 12 }) {
  if (![ancho, alto, aguas, radio].every(Number.isFinite) || ancho <= 0 || alto <= 0 || aguas < 0 || radio <= 0) throw Error('Falta definir el perfil y el radio');
  const ang = Math.atan2(aguas, ancho / 2), giro = Math.PI / 2 - ang;
  const t = radio * Math.tan(giro / 2), tang = [t * Math.cos(ang), alto + t * Math.sin(ang)];
  if (t >= alto || tang[0] >= ancho / 2) throw Error('El radio no cabe en el perfil');
  const mitad = [[0, 0], [0, alto - t]];
  const centro = [radio, alto - t];
  for (let i = 1; i <= pasos; i++) {
    const a = Math.PI - giro * i / pasos;
    mitad.push([centro[0] + radio * Math.cos(a), centro[1] + radio * Math.sin(a)]);
  }
  mitad.push([ancho / 2, alto + aguas]);
  return [...mitad, ...mitad.slice(0, -1).toReversed().map(([y, z]) => [ancho - y, z])];
}

export function contornoPerfil({ancho,alto,aguas,radio}) {
  const ang=Math.atan2(aguas,ancho/2),giro=Math.PI/2-ang,t=radio*Math.tan(giro/2);
  return 2*alto+2*Math.hypot(ancho/2,aguas)-4*t+2*radio*giro;
}

export function construirMorro(m) {
  const delta = (m.ancho - m.frente) / 2;
  if (!(m.diagonal > Math.abs(delta))) throw Error('La diagonal no permite esos anchos');
  const proyeccion = Math.sqrt(m.diagonal ** 2 - delta ** 2);
  const a = perfil({ ancho: m.ancho, alto: m.altoA, aguas: m.aguasA, radio: m.radioA, pasos: m.pasos });
  const b = perfil({ ancho: m.frente, alto: m.altoB, aguas: m.aguasB, radio: m.radioB, pasos: m.pasos });
  const perfilA = a.map(([y, z]) => [0, y, z]);
  const perfilB = b.map(([y, z]) => [proyeccion, y + delta, z]);
  return { medidas: m, proyeccion, perfilA, perfilB, desarrollo: desarrollarDesdeCentro(perfilA, perfilB) };
}

export function resolverSistema(matriz, vector) {
  const a=matriz.map((r,i)=>[...r,vector[i]]),n=vector.length;
  for(let i=0;i<n;i++){
    let k=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[k][i]))k=j;
    if(Math.abs(a[k][i])<1e-12)throw Error('Ajuste geométrico indeterminado');
    [a[k],a[i]]=[a[i],a[k]];const d=a[i][i];for(let c=i;c<=n;c++)a[i][c]/=d;
    for(let j=0;j<n;j++)if(j!==i){const q=a[j][i];for(let c=i;c<=n;c++)a[j][c]-=q*a[i][c];}
  }
  return a.map(r=>r[n]);
}
export function ajustarCirculo(ps) {
  if(ps.length<3)throw Error('Faltan puntos para medir la curva');
  const origen=[0,1].map(k=>ps.reduce((s,p)=>s+p[k],0)/ps.length),m=Array.from({length:3},()=>[0,0,0]),v=[0,0,0];
  for(const p of ps){const x=p[0]-origen[0],y=p[1]-origen[1],fila=[x,y,1],b=-x*x-y*y;for(let i=0;i<3;i++){v[i]+=fila[i]*b;for(let j=0;j<3;j++)m[i][j]+=fila[i]*fila[j];}}
  const [d,e,f]=resolverSistema(m,v),centro=[origen[0]-d/2,origen[1]-e/2],radio=Math.sqrt((d*d+e*e)/4-f),errores=ps.map(p=>distancia(p,centro)-radio);
  return {centro,radio,rms:Math.hypot(...errores)/Math.sqrt(errores.length),max:Math.max(...errores.map(Math.abs)),errores};
}
