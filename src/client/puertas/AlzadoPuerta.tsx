import React from 'react';
import { alturasTubos, MODELOS_PUERTAS } from '../../puertas/calcular.ts';
import type { Puerta, ResultadoPuerta } from '../../puertas/tipos.ts';
import { colocarTextosPuerta } from './textosPlano.ts';

const num = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export function AlzadoPuerta({ puerta: p, resultado }: { puerta: Puerta; resultado: ResultadoPuerta }) {
  const F = p.frente > 0 ? p.frente : 400;
  const H = p.alto > 0 ? p.alto : 400;
  const enr = p.modelo === 'PUERTAENR';
  const ple = p.modelo === 'PUERTAPLE';
  const auto = p.modelo === 'PUERTAUTO';

  const tubos = ple ? alturasTubos(p) : p.entradas.map(t => t.altura);
  const T = enr && p.enrollable.T > 0 ? p.enrollable.T : 0;
  const D = enr && p.enrollable.D > 7.5 ? p.enrollable.D : 60;
  const m = enr && p.enrollable.margen > 0 ? p.enrollable.margen : 0;
  const hSaco = enr ? 13 : auto ? 14 : p.apilable.saco === 120 ? 12 : 11;

  // Cadena derecha de pasos verticales (suma exactamente H; sin duplicar H).
  const hitosDerecha = ple
    ? [0, ...tubos, H]
    : enr
      ? [...new Set([0, ...tubos, ...(T > 0 ? [H - T - D, H - T] : []), H])]
          .filter(y => y >= 0 && y <= H)
          .sort((a, b) => a - b)
      : [...new Set([0, 14, ...p.autorreparable.empates.map(e => e + 12), H])]
          .filter(y => y >= 0 && y <= H)
          .sort((a, b) => a - b);

  const tuboParteT = enr && T > 0 && tubos.some(y => y > H - T + 0.1 && y < H - 0.1);
  const xCadena = F + 34;
  const xCotaT = F + 64;
  const xAltoTotal = F + (tuboParteT ? 96 : 74);

  // Bandas de entrada de tubo con sus cotas de alto a la izquierda (sin duplicar ejes del ventanal)
  const bandasIzquierda: Array<{ y: number; alto: number }> = enr
    ? [
        ...(T > 0 ? [T, T + D] : []),
        ...tubos.map(altura => H - altura),
      ]
        .filter((y, idx, arr) => y > 0 && y < H && arr.findIndex(v => Math.abs(v - y) < 0.5) === idx)
        .sort((a, b) => a - b)
        .map(y => ({ y, alto: 7.5 }))
    : ple
      ? tubos.map((altura, i) => ({
          y: H - altura,
          alto: p.entradas[i]?.alto || (p.entradas[i]?.diametro === 42 ? 13.5 : 12),
        }))
      : [];

  // Pieza desplegada del saco debajo del alzado
  const yDesplegado = H + 28;
  const hCorteSaco = enr ? 26 : auto ? 32 : p.apilable.doble ? 37 : p.apilable.saco === 120 ? 32 : 30;
  const pestanaSaco = enr ? 6.5 : auto ? 0 : p.apilable.doble ? 12 : 10;
  const altoPestana = enr ? 11 : auto ? 0 : p.apilable.doble ? 14 : p.apilable.saco === 120 ? 14 : 13;
  const wSaco = ple && p.apilable.doble ? Math.max(20, F - 6) : F;

  const textosTaller = colocarTextosPuerta({ ...p, frente: F, alto: H });
  const hayTextoFuera = textosTaller.some(t => t.x < 0);
  const xMin = hayTextoFuera ? -140 : -56;
  const yMin = -62;
  const anchoVista = xAltoTotal + 34 - xMin;
  const altoVista = yDesplegado + hCorteSaco + 46 - yMin;
  const letraBase = Math.min(10.5, Math.max(7.5, Math.min(F / 24, H / 38)));

  return (
    <section className="puerta-alzado panel bloque-3d" aria-label="Alzado de la puerta">
      <header>
        <h2>Alzado</h2>
        <span>
          {MODELOS_PUERTAS[p.modelo]} · {p.of || 'SIN OF'}
        </span>
      </header>
      <p>Medidas terminadas · cm · vista de frente</p>
      <svg
        role="img"
        aria-label={`Alzado ${MODELOS_PUERTAS[p.modelo]} ${num(F)} por ${num(H)} centímetros`}
        style={{ '--puerta-letra': `${letraBase}px` } as React.CSSProperties}
        viewBox={`${xMin} ${yMin} ${anchoVista} ${altoVista}`}
      >
        {/* Contorno general de la puerta */}
        <rect className="puerta-lona" x={0} y={0} width={F} height={H} />

        {/* Cabecera según modelo */}
        {(enr || auto) && (
          <g>
            <line className="puerta-varilla" x1={0} x2={F} y1={0} y2={0} />
            <text x={F / 2} y={-10} textAnchor="middle" className="puerta-texto-cabecera">
              VARILLA NEGRA (4,5)
            </text>
          </g>
        )}
        {ple && (
          <g>
            <rect
              className="puerta-entrada-alzado"
              x={0}
              y={0}
              width={F}
              height={Math.min(H * 0.2, p.apilable.bolsillo / 2)}
            />
            <text x={F / 2} y={-10} textAnchor="middle" className="puerta-texto-cabecera">
              E.T. Ø30 mm · BOLSILLO SUPERIOR {num(p.apilable.bolsillo)}
            </text>
          </g>
        )}

        {/* Autorreparable: entrada superior con salida de 5,5 cm, cremalleras y espaciador de 10 cm */}
        {auto && (
          <g>
            <rect className="puerta-entrada-alzado" x={-5.5} y={-3.5} width={F + 11} height={21} />
            <line className="puerta-guia" x1={0} x2={0} y1={0} y2={H} />
            <line className="puerta-guia" x1={F} x2={F} y1={0} y2={H} />
            <line className="puerta-cota" x1={10} x2={10} y1={17.5} y2={H - 14} strokeDasharray="4 3" />
            <line className="puerta-cota" x1={F - 10} x2={F - 10} y1={17.5} y2={H - 14} strokeDasharray="4 3" />
            <line className="puerta-cota" x1={0} x2={10} y1={H * 0.62} y2={H * 0.62} />
            <text x={5} y={H * 0.62 - 3} textAnchor="middle" className="puerta-cota-texto">
              10
            </text>
            <line className="puerta-cota" x1={-16} x2={-16} y1={-3.5} y2={17.5} />
            <line className="puerta-cota" x1={-20} x2={-12} y1={-3.5} y2={-3.5} />
            <line className="puerta-cota" x1={-20} x2={-12} y1={17.5} y2={17.5} />
            <text x={-22} y={8} textAnchor="end" className="puerta-cota-texto">
              21
            </text>
          </g>
        )}

        {/* Ventanal enrollable: cachos laterales acotados y cristal acotado con su ancho de corte */}
        {enr && T > 0 && (
          <g>
            <rect
              className="puerta-cacho"
              x={0}
              y={T + 3.75}
              width={m}
              height={Math.max(0, D - 7.5)}
            />
            <rect
              className="puerta-cacho"
              x={Math.max(0, F - m)}
              y={T + 3.75}
              width={m}
              height={Math.max(0, D - 7.5)}
            />
            <rect
              className="puerta-cristal"
              x={m}
              y={T + 3.75}
              width={Math.max(0, F - 2 * m)}
              height={Math.max(0, D - 7.5)}
            />
            {m > 0 && (
              <>
                <line className="puerta-cota" x1={0} x2={m} y1={T + D / 2} y2={T + D / 2} />
                <text x={-6} y={T + D / 2 + 3} textAnchor="end" className="puerta-cota-texto">
                  {num(m)}
                </text>
                <line className="puerta-cota" x1={F - m} x2={F} y1={T + D / 2} y2={T + D / 2} />
                <text x={F + 6} y={T + D / 2 + 3} textAnchor="start" className="puerta-cota-texto">
                  {num(m)}
                </text>
              </>
            )}
            {F - 2 * m > 12 && (
              <g>
                <line
                  className="puerta-cota"
                  x1={m + 2}
                  x2={F - m - 2}
                  y1={T + D - 8}
                  y2={T + D - 8}
                />
                <line className="puerta-cota" x1={m + 2} x2={m + 2} y1={T + D - 12} y2={T + D - 4} />
                <line
                  className="puerta-cota"
                  x1={F - m - 2}
                  x2={F - m - 2}
                  y1={T + D - 12}
                  y2={T + D - 4}
                />
                <text x={F / 2} y={T + D - 11} textAnchor="middle" className="puerta-cota-texto">
                  {num(F - 2 * m + 4)}
                </text>
              </g>
            )}
          </g>
        )}

        {/* Ventanas individuales en apilable y autorreparable */}
        {!enr &&
          p.ventanas.map((v, i) => {
            const vy = H - v.y - v.alto;
            return (
              <g key={`ventana-${i}`}>
                <rect
                  className="puerta-cristal"
                  x={v.x}
                  y={vy}
                  width={v.ancho}
                  height={v.alto}
                  rx={v.radio}
                />
                <line className="puerta-cota" x1={v.x} x2={v.x + v.ancho} y1={vy + v.alto / 2} y2={vy + v.alto / 2} />
                <text x={v.x + v.ancho / 2} y={vy + v.alto / 2 - 3} textAnchor="middle" className="puerta-cota-texto">
                  {num(v.ancho)}
                </text>
                <line className="puerta-cota" x1={v.x + v.ancho / 2} x2={v.x + v.ancho / 2} y1={vy} y2={vy + v.alto} />
                <text x={v.x + v.ancho / 2 + 4} y={vy + v.alto / 2 + 10} className="puerta-cota-texto">
                  {num(v.alto)}
                </text>
              </g>
            );
          })}

        {/* Bandas de entrada de tubo (enrollable y apilable) y sus cotas de alto a la izquierda */}
        {bandasIzquierda.map((b, i) => (
          <g key={`banda-${i}`}>
            <rect
              className="puerta-entrada-alzado"
              x={0}
              y={b.y - b.alto / 2}
              width={F}
              height={b.alto}
            />
            <line className="puerta-tubo" x1={0} x2={F} y1={b.y} y2={b.y} />
            <line className="puerta-cota" x1={-12} x2={-12} y1={b.y - b.alto / 2} y2={b.y + b.alto / 2} />
            <line className="puerta-cota" x1={-16} x2={-8} y1={b.y - b.alto / 2} y2={b.y - b.alto / 2} />
            <line className="puerta-cota" x1={-16} x2={-8} y1={b.y + b.alto / 2} y2={b.y + b.alto / 2} />
            <text x={-18} y={b.y + 3} textAnchor="end" className="puerta-cota-texto">
              {num(b.alto)}
            </text>
          </g>
        ))}

        {/* Huecos de cutter en las entradas */}
        {!auto &&
          p.entradas.flatMap((e, i) => {
            const yEje = H - (ple ? tubos[i] ?? e.altura : e.altura);
            const altoE = enr ? 7.5 : e.alto || (e.diametro === 42 ? 13.5 : 12);
            return e.huecos.map((h, j) => (
              <rect
                key={`hueco-${i}-${j}`}
                className="puerta-hueco-alzado"
                x={h.x - (ple && F > 600 ? 1 : 0)}
                y={yEje + altoE / 2 - h.y - h.alto}
                width={h.ancho}
                height={h.alto}
                rx={h.radio}
              />
            ));
          })}

        {/* Saco en el bajo de la puerta terminada y su cota */}
        <rect className="puerta-saco" x={0} y={H - hSaco} width={F} height={hSaco} />
        <line className="puerta-cota" x1={F + 12} x2={F + 12} y1={H - hSaco} y2={H} />
        <line className="puerta-cota" x1={F + 8} x2={F + 16} y1={H - hSaco} y2={H - hSaco} />
        <line className="puerta-cota" x1={F + 8} x2={F + 16} y1={H} y2={H} />
        <text x={F + 18} y={H - hSaco / 2 + 3} className="puerta-cota-texto">
          {num(hSaco)}
        </text>

        {/* Bolsillo opcional */}
        {resultado.bolsillo && (
          <g>
            <rect
              className="puerta-bolsillo"
              x={resultado.bolsillo.x}
              y={H - resultado.bolsillo.y - resultado.bolsillo.alto}
              width={resultado.bolsillo.ancho}
              height={resultado.bolsillo.alto}
            />
            <path
              className="puerta-bolsillo-marca"
              d={`M ${resultado.bolsillo.x} ${H - resultado.bolsillo.y - resultado.bolsillo.alto + 3} V ${H - resultado.bolsillo.y - resultado.bolsillo.alto} H ${resultado.bolsillo.x + 3} M ${resultado.bolsillo.x + resultado.bolsillo.ancho - 3} ${H - resultado.bolsillo.y - resultado.bolsillo.alto} H ${resultado.bolsillo.x + resultado.bolsillo.ancho} V ${H - resultado.bolsillo.y - resultado.bolsillo.alto + 3}`}
            />
          </g>
        )}

        {/* Líneas de empate */}
        {resultado.uniones.map((u, i) => (
          <g key={`union-${i}`}>
            <line className="puerta-empate" x1={0} x2={F} y1={H - u.altura} y2={H - u.altura} />
            <text x={F - 4} y={H - u.altura - 4} textAnchor="end" className="puerta-cota-texto">
              {u.tubo ? `EMPATE · TUBO ${u.tubo}` : `EMPATE ${num(u.solape)} CM`}
            </text>
          </g>
        ))}

        {/* Textos de taller colocados en huecos libres */}
        {textosTaller.map(t => {
          const cx = t.x + t.ancho / 2;
          return (
            <g key={t.id} className="puerta-texto-taller">
              {t.guia && (
                <line
                  className="puerta-linea-guia"
                  x1={t.x < 0 ? t.x + t.ancho : cx}
                  y1={t.y + t.alto / 2}
                  x2={t.ancla[0]}
                  y2={t.ancla[1]}
                />
              )}
              <text
                x={cx}
                y={t.y + t.tamano}
                textAnchor="middle"
                style={{ fontSize: `${t.tamano}px` }}
                className={t.id === 'saco' ? 'puerta-saco-texto' : undefined}
              >
                {t.lineas.map((linea, idx) => (
                  <tspan key={idx} x={cx} dy={idx === 0 ? 0 : t.tamano * 1.2}>
                    {linea}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}

        {/* Cota superior del frente */}
        <line className="puerta-cota" x1={0} x2={F} y1={-34} y2={-34} />
        <line className="puerta-cota" x1={0} x2={0} y1={-40} y2={-28} />
        <line className="puerta-cota" x1={F} x2={F} y1={-40} y2={-28} />
        <text x={F / 2} y={-41} textAnchor="middle">
          {num(p.frente || F)} cm
        </text>

        {/* Cadena derecha de pasos verticales */}
        {hitosDerecha.slice(1).map((y, i) => {
          const desde = hitosDerecha[i];
          const tramo = y - desde;
          const esD = enr && T > 0 && Math.abs(desde - (H - T - D)) < 0.05 && Math.abs(y - (H - T)) < 0.05;
          const esT = enr && T > 0 && !tuboParteT && Math.abs(desde - (H - T)) < 0.05 && Math.abs(y - H) < 0.05;
          const etiqueta = esD ? `D ${num(tramo)}` : esT ? `T ${num(tramo)}` : num(tramo);
          return (
            <g key={`cota-der-${i}`}>
              <line className="puerta-cota" x1={xCadena} x2={xCadena} y1={H - desde} y2={H - y} />
              <line className="puerta-cota" x1={xCadena - 5} x2={xCadena + 5} y1={H - desde} y2={H - desde} />
              <line className="puerta-cota" x1={xCadena - 5} x2={xCadena + 5} y1={H - y} y2={H - y} />
              <text x={xCadena + 7} y={H - (y + desde) / 2 + 3} className="puerta-cota-texto">
                {etiqueta}
              </text>
            </g>
          );
        })}

        {/* Cota T explícita cuando un tubo superior divide T */}
        {tuboParteT && (
          <g>
            <line className="puerta-cota" x1={xCotaT} x2={xCotaT} y1={0} y2={T} />
            <line className="puerta-cota" x1={xCotaT - 5} x2={xCotaT + 5} y1={0} y2={0} />
            <line className="puerta-cota" x1={xCotaT - 5} x2={xCotaT + 5} y1={T} y2={T} />
            <text x={xCotaT + 7} y={T / 2 + 3} className="puerta-cota-texto">
              T {num(T)}
            </text>
          </g>
        )}

        {/* ÚNICA cota de alto total a la derecha */}
        <line className="puerta-cota" x1={xAltoTotal} x2={xAltoTotal} y1={0} y2={H} />
        <line className="puerta-cota" x1={xAltoTotal - 6} x2={xAltoTotal + 6} y1={0} y2={0} />
        <line className="puerta-cota" x1={xAltoTotal - 6} x2={xAltoTotal + 6} y1={H} y2={H} />
        <text
          x={xAltoTotal + 14}
          y={H / 2}
          transform={`rotate(-90 ${xAltoTotal + 14} ${H / 2})`}
          textAnchor="middle"
        >
          {num(p.alto || H)} cm
        </text>

        {/* Pieza desplegada del saco con su pestaña debajo del alzado */}
        <g className="puerta-saco-desplegado" aria-label="Saco desplegado">
          <polygon
            className="puerta-saco-pieza"
            points={
              pestanaSaco > 0
                ? `0,${yDesplegado} ${wSaco},${yDesplegado} ${wSaco},${yDesplegado + hCorteSaco} 0,${yDesplegado + hCorteSaco} 0,${yDesplegado + altoPestana} ${-pestanaSaco},${yDesplegado + altoPestana} ${-pestanaSaco},${yDesplegado}`
                : `0,${yDesplegado} ${wSaco},${yDesplegado} ${wSaco},${yDesplegado + hCorteSaco} 0,${yDesplegado + hCorteSaco}`
            }
          />
          <line
            className="puerta-cota"
            x1={0}
            x2={wSaco}
            y1={yDesplegado + hCorteSaco / 2}
            y2={yDesplegado + hCorteSaco / 2}
            strokeDasharray="5 3"
          />
          {enr && p.enrollable.sacoPartido && (
            <line
              className="puerta-empate"
              x1={wSaco / 2}
              x2={wSaco / 2}
              y1={yDesplegado}
              y2={yDesplegado + hCorteSaco}
            />
          )}
          {pestanaSaco > 0 && (
            <>
              <line
                className="puerta-cota"
                x1={-pestanaSaco}
                x2={0}
                y1={yDesplegado - 6}
                y2={yDesplegado - 6}
              />
              <text x={-pestanaSaco / 2} y={yDesplegado - 9} textAnchor="middle" className="puerta-cota-texto">
                {num(pestanaSaco)}
              </text>
            </>
          )}
          <line
            className="puerta-cota"
            x1={wSaco + 12}
            x2={wSaco + 12}
            y1={yDesplegado}
            y2={yDesplegado + hCorteSaco}
          />
          <line className="puerta-cota" x1={wSaco + 8} x2={wSaco + 16} y1={yDesplegado} y2={yDesplegado} />
          <line
            className="puerta-cota"
            x1={wSaco + 8}
            x2={wSaco + 16}
            y1={yDesplegado + hCorteSaco}
            y2={yDesplegado + hCorteSaco}
          />
          <text x={wSaco + 18} y={yDesplegado + hCorteSaco / 2 + 3} className="puerta-cota-texto">
            {num(hCorteSaco)}
          </text>
          <text x={wSaco / 2} y={yDesplegado - 7} textAnchor="middle" className="puerta-cota-texto">
            {enr
              ? 'COSER VELCRO REVÉS DE 3 BRAVO'
              : ple
                ? 'COSER VELCRO REVÉS DE 5 BRAVO'
                : 'VELCRO BRAVO REVÉS DE 3'}
          </text>
          <text
            x={wSaco / 2}
            y={yDesplegado + hCorteSaco / 2 - 2}
            textAnchor="middle"
            className="puerta-cota-texto"
          >
            SACO 900 GR NEGRO · {num(wSaco + pestanaSaco)} × {num(hCorteSaco)} CM
          </text>
          <text
            x={wSaco / 2}
            y={yDesplegado + hCorteSaco + 12}
            textAnchor="middle"
            className="puerta-cota-texto"
          >
            {enr
              ? 'COSER VELCRO DERECHO DE 3 SUAVE · CACHOS +1 CM PARA ESCUADRAR'
              : ple
                ? 'COSER VELCRO DERECHO DE 5 SUAVE'
                : 'VELCRO SUAVE REVÉS DE 3'}
          </text>
        </g>
      </svg>
      <small>Compara tubos, huecos, ventanal y textos de taller con el dibujo del cliente.</small>
      {p.observaciones.trim() && (
        <p className="puerta-observaciones-plano" aria-label="Observaciones particulares del pedido">
          <strong>Observaciones del pedido:</strong> {p.observaciones}
        </p>
      )}
    </section>
  );
}
