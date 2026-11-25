import React from 'react';
import { calcularAbrigo, materialesAbrigo } from '../../puertas/abrigo.ts';
import { fichaDePuerta } from '../../puertas/clientes.ts';
import { cambiarTipoDelCliente } from '../../puertas/nuevaPuertaCliente.ts';
import type { ParteAbrigo, PiezaPuerta, Puerta } from '../../puertas/tipos.ts';
import { SelectField } from '../components/SelectField';
import { NumeroPuerta } from './NumeroPuerta';
import { medidaPuerta, textoMedidasMm } from './medidasPuertas';

const nombres: Record<ParteAbrigo, string> = {
  frente: 'Frente A',
  laterales: 'Laterales B y C',
  perimetral: 'Lona perimetral',
  tiras: 'Tiras de resto',
};

/** Cota técnica plana en cm (etiquetada en mm) agarrada a la pieza. */
function CotaAbrigo({
  x1, y1, x2, y2, linea, valor, letra, lado,
}: {
  x1: number; y1: number; x2: number; y2: number; linea: number; valor: number; letra: number;
  lado?: 'arriba' | 'abajo' | 'izquierda' | 'derecha';
}) {
  const vertical = Math.abs(x1 - x2) < 1e-6;
  const marca = Math.max(1.8, letra * 0.28);
  const texto = medidaPuerta(valor);
  if (!vertical) {
    const dir = Math.sign(linea - y1) || (lado === 'abajo' ? 1 : -1);
    const ty = lado === 'abajo' ? linea + letra * 1.15 : linea - letra * 0.35;
    return (
      <g>
        {Math.abs(linea - y1) > 1.5 && (
          <>
            <line className="puerta-cota puerta-cota-aux" x1={x1} y1={y1 + dir * 1.5} x2={x1} y2={linea + dir * marca} />
            <line className="puerta-cota puerta-cota-aux" x1={x2} y1={y2 + dir * 1.5} x2={x2} y2={linea + dir * marca} />
          </>
        )}
        <line className="puerta-cota" x1={x1} y1={linea} x2={x2} y2={linea} />
        <line className="puerta-cota" x1={x1} y1={linea - marca} x2={x1} y2={linea + marca} />
        <line className="puerta-cota" x1={x2} y1={linea - marca} x2={x2} y2={linea + marca} />
        <text className="puerta-cota-texto" x={(x1 + x2) / 2} y={ty} textAnchor="middle" style={{ fontSize: `${letra}px` }}>{texto}</text>
      </g>
    );
  }
  const dir = Math.sign(linea - x1) || (lado === 'derecha' ? 1 : -1);
  const tx = lado === 'derecha' ? linea + letra * 0.45 : linea - letra * 0.45;
  const ancla = lado === 'derecha' ? 'start' : 'end';
  return (
    <g>
      {Math.abs(linea - x1) > 1.5 && (
        <>
          <line className="puerta-cota puerta-cota-aux" x1={x1 + dir * 1.5} y1={y1} x2={linea + dir * marca} y2={y1} />
          <line className="puerta-cota puerta-cota-aux" x1={x2 + dir * 1.5} y1={y2} x2={linea + dir * marca} y2={y2} />
        </>
      )}
      <line className="puerta-cota" x1={linea} y1={y1} x2={linea} y2={y2} />
      <line className="puerta-cota" x1={linea - marca} y1={y1} x2={linea + marca} y2={y1} />
      <line className="puerta-cota" x1={linea - marca} y1={y2} x2={linea + marca} y2={y2} />
      <text
        className="puerta-cota-texto"
        x={tx}
        y={(y1 + y2) / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(-90 ${tx} ${(y1 + y2) / 2})`}
        style={{ fontSize: `${letra}px` }}
        data-ancla={ancla}
      >
        {texto}
      </text>
    </g>
  );
}

/** Laterales B y C en vertical enfrentados, exactamente como el alzado del DWG (planoTaller.ts). */
function DibujoLaterales({ piezas, corto }: { piezas: PiezaPuerta[]; corto: number }) {
  const b = piezas.find(q => q.nombre === 'B') ?? piezas[0];
  const c = piezas.find(q => q.nombre === 'C') ?? piezas[1];
  const largo = b.ancho;
  const ancho = b.alto;
  const separacion = Math.max(ancho * 1.75, 92);
  const xB = 0;
  const xC = ancho + separacion;
  const anchoTotal = xC + ancho;
  const letra = Math.min(11, Math.max(7.5, largo / 34));
  const letraGrande = Math.min(24, Math.max(14, ancho * 0.42));
  const yBase = largo; // SVG y hacia abajo: 0 arriba (esquina larga), yBase abajo (pie)

  const renderLateral = (pieza: PiezaPuerta, x0: number, esB: boolean) => {
    // Misma transformación que alzadoAbrigo del DWG: [a, b] -> (x0 + b, yBase - a)
    const pts = pieza.contorno.map(([a, v]) => `${x0 + v},${yBase - a}`).join(' ');
    const marcas = pieza.circulosMarca ?? [];
    const franja = marcas.slice(0, 4);
    const ollao = marcas[4];
    const xExt = esB ? x0 : x0 + ancho;
    const xInt = esB ? x0 + ancho : x0;
    const yCortoTop = yBase - corto;
    const libre = Math.max(20, corto - 100);
    const yCentro = yBase - 100 - libre * 0.5;
    const rMarca = Math.max(1.2, ancho * 0.025);

    return (
      <g key={pieza.id}>
        <polygon className="puerta-lona" points={pts} />
        {/* Franja MARCA DERECHO y sus 4 puntos de rotulador */}
        {franja.length === 4 && (
          <>
            {franja.map((m, i) => (
              <circle key={i} cx={x0 + m.y} cy={yBase - m.x} r={rMarca} className="puerta-rotulador" fill="currentColor" />
            ))}
            <CotaAbrigo
              x1={x0 + franja[0].y} y1={yBase - franja[0].x}
              x2={x0 + franja[1].y} y2={yBase - franja[1].x}
              linea={x0 + franja[0].y + (esB ? 16 : -16)}
              valor={Math.abs(franja[1].x - franja[0].x)}
              letra={Math.min(letra, 8.5)}
              lado={esB ? 'derecha' : 'izquierda'}
            />
            <CotaAbrigo
              x1={x0 + Math.min(franja[0].y, franja[3].y)} y1={yBase - franja[0].x}
              x2={x0 + Math.max(franja[0].y, franja[3].y)} y2={yBase - franja[0].x}
              linea={yBase - 14}
              valor={Math.abs(franja[3].y - franja[0].y)}
              letra={Math.min(letra, 8)}
              lado="arriba"
            />
            <text
              x={x0 + ancho * (esB ? 0.24 : 0.76)}
              y={yBase - 56}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(-90 ${x0 + ancho * (esB ? 0.24 : 0.76)} ${yBase - 56})`}
              style={{ fontSize: `${Math.min(letra * 0.92, 8.2)}px` }}
            >
              MARCA DERECHO
            </text>
          </>
        )}
        {/* Ollao grande en esquina */}
        {ollao && (
          <circle cx={x0 + ollao.y} cy={yBase - ollao.x} r={Math.max(2.6, ancho * 0.055)} className="puerta-bolsillo-marca" />
        )}
        {/* Rótulos internos: letra, cantidad y OF */}
        <text x={x0 + ancho / 2} y={yBase - 100 - libre * 0.18} textAnchor="middle" style={{ fontSize: `${letraGrande}px`, fontWeight: 600 }}>
          {pieza.nombre}
        </text>
        <text x={x0 + ancho / 2} y={yCentro} textAnchor="middle" style={{ fontSize: `${letra * 1.45}px` }}>
          {`X ${pieza.cantidad}`}
        </text>
        <text
          x={x0 + ancho / 2}
          y={yBase - 100 - libre * 0.78}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-90 ${x0 + ancho / 2} ${yBase - 100 - libre * 0.78})`}
          style={{ fontSize: `${letra * 1.05}px` }}
        >
          {`OF: ${pieza.of}`}
        </text>
        {/* Cotas exteriores e interiores agarradas a los bordes */}
        <CotaAbrigo x1={xExt} y1={0} x2={xExt} y2={yBase} linea={xExt + (esB ? -22 : 22)} valor={largo} letra={letra} lado={esB ? 'izquierda' : 'derecha'} />
        <CotaAbrigo x1={xInt} y1={yCortoTop} x2={xInt} y2={yBase} linea={xInt + (esB ? 20 : -20)} valor={corto} letra={letra} lado={esB ? 'derecha' : 'izquierda'} />
        <CotaAbrigo x1={x0} y1={yBase} x2={x0 + ancho} y2={yBase} linea={yBase + 18} valor={ancho} letra={letra} lado="abajo" />
      </g>
    );
  };

  const yPico = -24;
  const yOllao = yBase - corto;
  return (
    <svg
      role="img"
      aria-label={`Laterales B y C del abrigo ${medidaPuerta(largo)} y ${medidaPuerta(corto)} por ${medidaPuerta(ancho)} milímetros`}
      viewBox={`${-44} ${-56} ${anchoTotal + 88} ${yBase + 94}`}
    >
      {renderLateral(b, xB, true)}
      {c && renderLateral(c, xC, false)}
      {/* Llamada común a los dos ollaos de la esquina, sin pisar nada */}
      <line className="puerta-linea-guia" x1={xB + ancho} y1={yOllao} x2={anchoTotal / 2} y2={yPico} />
      {c && <line className="puerta-linea-guia" x1={xC} y1={yOllao} x2={anchoTotal / 2} y2={yPico} />}
      <text x={anchoTotal / 2} y={yPico - 8} textAnchor="middle" className="puerta-texto-cabecera" style={{ fontSize: `${letra * 1.15}px` }}>
        OLLAO GRANDE EN ESQUINA
      </text>
    </svg>
  );
}

/** Frente A, Perimetral D o Tiras E con cotas reales en mm y rótulos como en el DWG. */
function DibujoRectangular({ pieza }: { pieza: PiezaPuerta }) {
  const w = pieza.ancho;
  const h = pieza.alto;
  const esTira = pieza.nombre === 'E';
  // Para tiras muy finas (30 mm) garantizamos una vista limpia donde el rótulo vaya encima sin distorsionar la cota.
  const hVista = esTira ? Math.max(h, w * 0.08) : h;
  const letra = Math.min(14, Math.max(7.5, Math.max(w, hVista) / 28));
  const margenIzq = Math.max(36, letra * 4.2);
  const margenArriba = esTira ? Math.max(30, letra * 3.2) : Math.max(24, letra * 2.5);
  const margenAbajo = Math.max(34, letra * 3.4);
  const margenDer = Math.max(18, letra * 1.8);
  const pts = pieza.contorno.map(([x, y]) => `${x},${h - y}`).join(' ');
  const tamGrande = Math.min(h * 0.34, w * 0.14, 28);
  const tamOf = Math.min(h * 0.24, w * 0.085, 20);

  return (
    <svg
      role="img"
      aria-label={`Pieza ${pieza.nombre} del abrigo ${medidaPuerta(w)} por ${medidaPuerta(h)} milímetros`}
      viewBox={`${-margenIzq} ${-margenArriba} ${w + margenIzq + margenDer} ${h + margenArriba + margenAbajo}`}
    >
      <polygon className="puerta-lona" points={pts} />
      {esTira ? (
        <text x={w / 2} y={-letra * 0.9} textAnchor="middle" className="puerta-texto-cabecera" style={{ fontSize: `${letra * 1.15}px` }}>
          {`E · X ${pieza.cantidad} · OF: ${pieza.of}`}
        </text>
      ) : (
        <>
          <text x={w / 2} y={h * 0.34} textAnchor="middle" style={{ fontSize: `${tamOf}px`, fontWeight: 600 }}>
            {`OF: ${pieza.of}`}
          </text>
          <text x={w * 0.32} y={h * 0.72} textAnchor="middle" style={{ fontSize: `${tamGrande}px`, fontWeight: 600 }}>
            {pieza.nombre}
          </text>
          <text x={w * 0.68} y={h * 0.72} textAnchor="middle" style={{ fontSize: `${tamGrande * 0.9}px` }}>
            {`X ${pieza.cantidad}`}
          </text>
          {pieza.abrigo?.nota && (
            <text x={w / 2} y={-letra * 0.7} textAnchor="middle" className="puerta-texto-cabecera" style={{ fontSize: `${letra}px` }}>
              {pieza.abrigo.nota}
            </text>
          )}
        </>
      )}
      <CotaAbrigo x1={0} y1={h} x2={w} y2={h} linea={h + Math.max(12, letra * 1.3)} valor={w} letra={letra} lado="abajo" />
      <CotaAbrigo x1={0} y1={0} x2={0} y2={h} linea={-Math.max(14, letra * 1.6)} valor={h} letra={letra} lado="izquierda" />
    </svg>
  );
}

export function VistaAbrigo({ p }: { p: Puerta }) {
  const parte = p.abrigo?.parte ?? 'frente';
  const piezas = calcularAbrigo(p).piezas;
  const esLaterales = parte === 'laterales' && piezas.length > 0;
  return (
    <section className="puerta-alzado panel panel-vidrio" aria-label={`Alzado de abrigo · ${nombres[parte]}`}>
      <header>
        <h2>{nombres[parte]}</h2>
        <span>{materialesAbrigo[parte]} · OF {p.of || 'SIN OF'}</span>
      </header>
      <p>Medidas terminadas · mm · vista plana</p>
      {piezas.length > 0 ? (
        esLaterales
          ? <DibujoLaterales piezas={piezas} corto={p.abrigo?.corto ?? 0} />
          : <DibujoRectangular pieza={piezas[0]} />
      ) : (
        <p>Completa las medidas de la hoja para ver la pieza.</p>
      )}
      {piezas.length > 0 && (
        <small>
          {esLaterales
            ? `Laterales B y C · ${medidaPuerta(piezas[0].ancho)} / ${medidaPuerta(p.abrigo?.corto ?? 0)} × ${medidaPuerta(piezas[0].alto)} mm · X ${piezas[0].cantidad} parejas`
            : `${piezas[0].nombre} · ${medidaPuerta(piezas[0].ancho)} × ${medidaPuerta(piezas[0].alto)} mm · X ${piezas[0].cantidad}`}
        </small>
      )}
    </section>
  );
}

export function ConfigurarAbrigo({ p, cambiar, vista, corte }: { p: Puerta; cambiar: (p: Puerta) => void; vista?: React.ReactNode; corte?: React.ReactNode }) {
  const parte = p.abrigo?.parte ?? 'frente';
  const ficha = fichaDePuerta(p);
  const editar = (c: Partial<Puerta>) => cambiar({ ...p, ...c, confirmada: false });
  const cambiarParte = (v: ParteAbrigo) => editar({
    abrigo: { parte: v, corto: 0 }, material: materialesAbrigo[v], color: '',
    rollo: v === 'perimetral' ? 250 : 160, frente: 0, alto: v === 'tiras' ? 3 : 0,
  });
  const avisos = calcularAbrigo(p).avisos;
  return (
    <div className="puerta-config-alzado">
      <section className="puerta-config panel panel-vidrio">
        <header><h2>Configurador</h2><span>Portanova · medidas en mm</span></header>
        <fieldset>
          <legend>Abrigo de carga</legend>
          <div className="puerta-campos">
            <SelectField label="Tipo de producto" value="abrigo" options={ficha.tipos.map(t => t.id)} optionLabel={v => ficha.tipos.find(t => t.id === v)?.nombre ?? v} onChange={v => cambiar(cambiarTipoDelCliente(p, v))} />
            <SelectField label="Pieza del abrigo" value={parte} options={Object.keys(nombres) as ParteAbrigo[]} optionLabel={v => nombres[v as ParteAbrigo]} onChange={v => cambiarParte(v as ParteAbrigo)} />
            <label className="field puerta-campo"><span>OF</span><input value={p.of} onChange={e => editar({ of: e.target.value })} /></label>
            <NumeroPuerta titulo={parte === 'laterales' ? 'Parejas de laterales' : 'Unidades'} unidad="cantidad" valor={p.cantidad || null} cambiar={v => editar({ cantidad: v ?? 0 })} />
            <NumeroPuerta titulo={parte === 'laterales' ? 'Borde largo (mm)' : 'Largo (mm)'} valor={p.frente || null} cambiar={v => editar({ frente: v ?? 0 })} />
            {parte === 'laterales' && <NumeroPuerta titulo="Borde corto (mm)" valor={p.abrigo?.corto || null} cambiar={v => editar({ abrigo: { parte, corto: v ?? 0 } })} />}
            <NumeroPuerta titulo="Ancho (mm)" valor={p.alto || null} cambiar={v => editar({ alto: v ?? 0 })} />
          </div>
          <p className="puerta-ayuda">{materialesAbrigo[parte]} · Consumo en ML según la OF.</p>
          {parte === 'laterales' && <p className="puerta-ayuda">Un ollao N14 y una arandela N30 por lateral.</p>}
        </fieldset>
        <div className="puerta-confirmaciones">
          <label className="puerta-casilla">
            <input type="checkbox" checked={p.confirmada} onChange={e => cambiar({ ...p, confirmada: e.target.checked })} />
            Medidas y cantidad confirmadas con el pedido
          </label>
        </div>
      </section>
      <div className="puerta-derecha">
        <div className="puerta-dibujo">{vista}{corte ?? <VistaAbrigo p={p} />}</div>
        {avisos.length > 0 && (
          <section className="puerta-avisos panel panel-vidrio">
            <h2>Qué falta o revisar</h2>
            <ul>{avisos.map(a => <li key={a.codigo} className={a.nivel === 'error' ? 'es-error' : ''}>{textoMedidasMm(a.texto)}</li>)}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
