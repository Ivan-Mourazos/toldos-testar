import { centros, posicionLona, radioMedioTubo, type ModeloEnrolle } from '../../puertas/enrolle/geometria.ts';

/** Malla de dibujo en mm. Incluye el extremo exacto y limita la memoria para medidas excepcionales. */
export function prepararTrayectoria(modelo: ModeloEnrolle) {
  const pasos = Math.max(1, Math.min(50000, Math.ceil(modelo.largo / 2)));
  const paso = modelo.largo / pasos;
  const muestras = Array.from({ length: pasos + 1 }, (_, i) => posicionLona(modelo, i * paso));
  return { modelo, muestras, paso };
}

export function fotograma({ modelo, muestras, paso }: ReturnType<typeof prepararTrayectoria>, avance: number) {
  const apoyo = posicionLona(modelo, avance);
  const c = Math.cos(apoyo.a), s = Math.sin(apoyo.a);
  const tubos = centros(modelo, avance).map((p, i) => ({
    ...p, a: modelo.marcas[i] <= avance ? modelo.tubos[i].angulo : apoyo.a,
  }));
  const punto = (marca: number) => {
    if (marca >= avance) return { x: apoyo.x - (marca - avance) * s, y: apoyo.y + (marca - avance) * c };
    const indice = Math.max(0, marca / paso);
    const i = Math.min(muestras.length - 2, Math.floor(indice)), f = indice - i;
    const p = muestras[i], q = muestras[i + 1];
    return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
  };
  const radio = radioMedioTubo(modelo.cfg);
  // La soldadura comparte el recorrido del paño. Solo se levanta cerca del tubo
  // para llegar al extremo común de las dos semicircunferencias.
  const uniones = tubos.map((t, i) => [-radio, radio].map(d => {
    const base = punto(modelo.marcas[i] + d);
    return { x: t.x - d * Math.sin(t.a) - base.x, y: t.y + d * Math.cos(t.a) - base.y };
  }));
  const cola = (i: number, d: number, alcance: number) => {
    const p = punto(modelo.marcas[i] + d);
    const delta = uniones[i][Number(d >= 0)];
    const u = alcance > radio ? Math.max(0, Math.min(1, (alcance - Math.abs(d)) / (alcance - radio))) : 1;
    const peso = u * u * (3 - 2 * u);
    return { x: p.x + peso * delta.x, y: p.y + peso * delta.y };
  };
  return { apoyo, tubos, punto, cola };
}
