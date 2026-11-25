import React, { useId } from 'react';
import { SelectField } from '../components/SelectField';
import { calcularPuerta } from '../../puertas/calcular.ts';
import { fichaDePuerta, tipoDePuerta } from '../../puertas/clientes.ts';
import { cambiarTipoDelCliente } from '../../puertas/nuevaPuertaCliente.ts';
import { medidasSacoArena, REGLAS_SACO_ARENA } from '../../puertas/sacoArena.ts';
import type { Puerta } from '../../puertas/tipos.ts';
import { medidaPuerta as mm, textoMedidasMm } from './medidasPuertas';
import { NumeroPuerta } from './NumeroPuerta';

/** Cota SVG plana (horizontal o vertical) agarrada a su pieza. */
function CotaPlana({
  x1, y1, x2, y2, linea, texto, lado = 'arriba',
}: {
  x1: number; y1: number; x2: number; y2: number; linea: number; texto: string;
  lado?: 'arriba' | 'abajo' | 'izquierda' | 'derecha';
}) {
  const vertical = Math.abs(x1 - x2) < 1e-6;
  const marca = 3.5;
  if (!vertical) {
    const dir = Math.sign(linea - y1) || (lado === 'abajo' ? 1 : -1);
    const ty = lado === 'abajo' ? linea + 12 : linea - 5;
    return (
      <g>
        {Math.abs(linea - y1) > 2 && (
          <>
            <line className="puerta-cota puerta-cota-aux" x1={x1} y1={y1 + dir * 2} x2={x1} y2={linea + dir * 3} />
            <line className="puerta-cota puerta-cota-aux" x1={x2} y1={y2 + dir * 2} x2={x2} y2={linea + dir * 3} />
          </>
        )}
        <line className="puerta-cota" x1={x1} y1={linea} x2={x2} y2={linea} />
        <line className="puerta-cota" x1={x1} y1={linea - marca} x2={x1} y2={linea + marca} />
        <line className="puerta-cota" x1={x2} y1={linea - marca} x2={x2} y2={linea + marca} />
        <text className="puerta-cota-texto" x={(x1 + x2) / 2} y={ty} textAnchor="middle" style={{ fontSize: '11px' }}>{texto}</text>
      </g>
    );
  }
  const dir = Math.sign(linea - x1) || (lado === 'derecha' ? 1 : -1);
  const tx = lado === 'derecha' ? linea + 6 : linea - 6;
  const ancla = lado === 'derecha' ? 'start' : 'end';
  return (
    <g>
      {Math.abs(linea - x1) > 2 && (
        <>
          <line className="puerta-cota puerta-cota-aux" x1={x1 + dir * 2} y1={y1} x2={linea + dir * 3} y2={y1} />
          <line className="puerta-cota puerta-cota-aux" x1={x2 + dir * 2} y1={y2} x2={linea + dir * 3} y2={y2} />
        </>
      )}
      <line className="puerta-cota" x1={linea} y1={y1} x2={linea} y2={y2} />
      <line className="puerta-cota" x1={linea - marca} y1={y1} x2={linea + marca} y2={y1} />
      <line className="puerta-cota" x1={linea - marca} y1={y2} x2={linea + marca} y2={y2} />
      <text className="puerta-cota-texto" x={tx} y={(y1 + y2) / 2 + 4} textAnchor={ancla} style={{ fontSize: '11px' }}>{texto}</text>
    </g>
  );
}

export function VistaSacoArena({ puerta: p }: { puerta: Puerta }) {
  const m = medidasSacoArena(p);
  const completo = p.frente > 0 && p.alto > 0;
  const soldadura = REGLAS_SACO_ARENA.soldadura;
  const doblado = m.anchoCorte - soldadura;
  const juntas = p.rollo <= 0 || 2 * m.anchoCorte <= p.rollo;
  const materialTxt = `${p.material.trim() || REGLAS_SACO_ARENA.material} ${p.color.trim() || REGLAS_SACO_ARENA.color}`.trim();

  // Geometría plana proporcionada (sin gradientes ni 3D, estilo GENERAL como el DWG de referencia).
  const x0 = 92;
  const wEntero = 410;
  const hBanda = Math.max(22, Math.min(34, Math.round(24 * (m.anchoCorte / 21))));
  const pxSol = Math.max(4, Math.round(hBanda * (soldadura / Math.max(1, m.anchoCorte))));
  const pxIni = Math.max(6, Math.round(wEntero * (REGLAS_SACO_ARENA.inicioLargo / Math.max(1, m.largoCorte))));
  const pxFin = Math.max(12, Math.round(wEntero * ((REGLAS_SACO_ARENA.aumentoLargo - REGLAS_SACO_ARENA.inicioLargo) / Math.max(1, m.largoCorte))));
  const wMitad = Math.round(wEntero * (m.largoMitad / Math.max(1, m.largoCorte)));

  const yConf = 44;
  const yEsquema = yConf + hBanda + 32;
  const yCorte = yEsquema + 122;
  const yMitad = yCorte + hBanda + 50;

  return (
    <section className="puerta-alzado panel panel-vidrio" aria-label="Medidas del saco confeccionado">
      <header>
        <h2>Saco confeccionado</h2>
        <span>OF {p.of || 'SIN OF'} · ×{p.cantidad}</span>
      </header>
      <p>Medidas en mm · vista plana de confección y corte</p>
      {completo ? (
        <>
          <table className="puerta-saco-tabla">
            <thead>
              <tr><th>Preparación</th><th>Medidas (mm)</th></tr>
            </thead>
            <tbody>
              <tr><td>Doblado · marca de rotulador</td><td>{mm(doblado)} + {mm(soldadura)} para pisar</td></tr>
              <tr><td>Al corte · sin empate</td><td>{mm(m.anchoCorte)} × {mm(m.largoCorte)}</td></tr>
              <tr><td>Para empatar · 2 piezas</td><td>{mm(m.anchoCorte)} × {mm(m.largoMitad)}</td></tr>
            </tbody>
          </table>

          <svg
            role="img"
            aria-label={`Saco confeccionado ${mm(m.largo)} por ${mm(m.aplastado)} milímetros, confección y opciones de corte`}
            viewBox="0 0 560 420"
            className="puerta-saco-svg"
          >
            {/* 1. Pieza de confección (como la parte superior del DWG AR2604808/AR2604933) */}
            <text x={x0 + wEntero / 2} y="16" textAnchor="middle" className="puerta-texto-cabecera" style={{ fontSize: '11.5px' }}>
              {`CONFECCIÓN · ${materialTxt} (NEGRO HACIA EL EXTERIOR)`}
            </text>
            <rect className="puerta-lona" x={x0} y={yConf} width={wEntero} height={hBanda} />
            {/* Marcas de rotulador: línea superior de 30 mm para pisar y topes verticales del largo pedido */}
            <line className="puerta-rotulador" x1={x0 + pxIni} y1={yConf + pxSol} x2={x0 + wEntero - pxFin} y2={yConf + pxSol} />
            <line className="puerta-rotulador" x1={x0 + pxIni} y1={yConf + pxSol} x2={x0 + pxIni} y2={yConf + hBanda} />
            <line className="puerta-rotulador" x1={x0 + wEntero - pxFin} y1={yConf + pxSol} x2={x0 + wEntero - pxFin} y2={yConf + hBanda} />
            <CotaPlana x1={x0 + pxIni} y1={yConf} x2={x0 + wEntero - pxFin} y2={yConf} linea={yConf - 11} texto={mm(m.largo)} lado="arriba" />
            <CotaPlana x1={x0} y1={yConf + pxSol} x2={x0} y2={yConf + hBanda} linea={x0 - 16} texto={mm(doblado)} lado="izquierda" />
            <text className="puerta-cota-texto" x={x0 - 60} y={yConf + hBanda / 2 + 4} textAnchor="middle" transform={`rotate(-90 ${x0 - 60} ${yConf + hBanda / 2})`} style={{ fontSize: '10px' }}>
              PISAR {mm(soldadura)} mm
            </text>
            <text x={x0 + wEntero / 2} y={yConf + hBanda + 18} textAnchor="middle" style={{ fontSize: '11px' }}>
              SOLDAR {mm(soldadura)} mm PARA CERRAR EL CILINDRO
            </text>

            {/* 2. Esquema plano de líneas del saco cerrado (estilo GENERAL, sin 3D ni gradientes) */}
            <g transform={`translate(180, ${yEsquema})`}>
              {/* Contorno del cilindro plano inclinado */}
              <polygon className="puerta-lona" points="20,42 180,4 188,24 28,62" />
              {/* Boca aplastada a la izquierda y extremo redondo a la derecha (solo línea) */}
              <polygon className="puerta-pano" points="8,40 22,36 28,62 14,66" />
              <ellipse cx="184" cy="14" rx="5" ry="11" transform="rotate(-13 184 14)" className="puerta-pano" />
              <line className="puerta-tubo" x1="18" y1="51" x2="182" y2="13" />
              <text x="98" y="14" textAnchor="middle" transform="rotate(-13 98 14)" style={{ fontSize: '11px' }}>
                LARGO {mm(m.largo)} mm
              </text>
              <text x="18" y="80" textAnchor="middle" style={{ fontSize: '11px' }}>
                APLASTADO {mm(m.aplastado)} mm
              </text>
            </g>

            {/* Separador entre confección y opciones de corte */}
            <line className="puerta-cota" x1="24" y1={yCorte - 32} x2="536" y2={yCorte - 32} strokeDasharray="4 4" />

            {/* 3a. Opción de corte sin empate */}
            <text x={x0} y={yCorte - 16} style={{ fontSize: '11px', fontWeight: 600 }}>
              AL CORTE · SIN EMPATE
            </text>
            <rect className="puerta-saco-pieza" x={x0} y={yCorte} width={wEntero} height={hBanda} />
            <line className="puerta-rotulador" x1={x0 + pxIni} y1={yCorte + pxSol} x2={x0 + wEntero - pxFin} y2={yCorte + pxSol} />
            <line className="puerta-rotulador" x1={x0 + pxIni} y1={yCorte + pxSol} x2={x0 + pxIni} y2={yCorte + hBanda} />
            <line className="puerta-rotulador" x1={x0 + wEntero - pxFin} y1={yCorte + pxSol} x2={x0 + wEntero - pxFin} y2={yCorte + hBanda} />
            <CotaPlana x1={x0} y1={yCorte} x2={x0 + wEntero} y2={yCorte} linea={yCorte - 10} texto={mm(m.largoCorte)} lado="arriba" />
            <CotaPlana x1={x0 + wEntero} y1={yCorte} x2={x0 + wEntero} y2={yCorte + hBanda} linea={x0 + wEntero + 14} texto={mm(m.anchoCorte)} lado="derecha" />

            {/* 3b. Opción de corte para empatar (2 mitades) */}
            <text x={x0} y={yMitad - 10} style={{ fontSize: '11px', fontWeight: 600 }}>
              PARA EMPATAR · 2 PIEZAS (EMPATE {mm(REGLAS_SACO_ARENA.empate)} mm)
            </text>
            {juntas ? (
              <>
                <rect className="puerta-saco-pieza" x={x0} y={yMitad} width={wMitad} height={hBanda} />
                <line className="puerta-rotulador" x1={x0 + pxIni} y1={yMitad + pxSol} x2={x0 + wMitad} y2={yMitad + pxSol} />
                <line className="puerta-rotulador" x1={x0 + pxIni} y1={yMitad + pxSol} x2={x0 + pxIni} y2={yMitad + hBanda} />
                <text className="puerta-texto-rotulador" x={x0 + wMitad - 12} y={yMitad + hBanda * 0.72} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 600 }}>1</text>

                <rect className="puerta-saco-pieza" x={x0} y={yMitad + hBanda} width={wMitad} height={hBanda} />
                <line className="puerta-rotulador" x1={x0} y1={yMitad + hBanda + pxSol} x2={x0 + wMitad - pxFin} y2={yMitad + hBanda + pxSol} />
                <line className="puerta-rotulador" x1={x0 + wMitad - pxFin} y1={yMitad + hBanda + pxSol} x2={x0 + wMitad - pxFin} y2={yMitad + 2 * hBanda} />
                <text className="puerta-texto-rotulador" x={x0 + 12} y={yMitad + hBanda + hBanda * 0.72} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 600 }}>1</text>

                <CotaPlana x1={x0} y1={yMitad + 2 * hBanda} x2={x0 + wMitad} y2={yMitad + 2 * hBanda} linea={yMitad + 2 * hBanda + 12} texto={mm(m.largoMitad)} lado="abajo" />
                <CotaPlana x1={x0 + wMitad} y1={yMitad} x2={x0 + wMitad} y2={yMitad + 2 * hBanda} linea={x0 + wMitad + 14} texto={mm(2 * m.anchoCorte)} lado="derecha" />
                <text x={x0 + wMitad + 60} y={yMitad + hBanda - 2} style={{ fontSize: '11px' }}>MARCAR POR LADO NEGRO</text>
                <text className="puerta-cota-texto" x={x0 + wMitad + 60} y={yMitad + hBanda + 14} style={{ fontSize: '10.5px' }}>
                  2 × {mm(m.anchoCorte)} × {mm(m.largoMitad)} mm
                </text>
              </>
            ) : (
              <>
                <rect className="puerta-saco-pieza" x={x0} y={yMitad} width={wMitad - 6} height={hBanda} />
                <line className="puerta-rotulador" x1={x0 + pxIni} y1={yMitad + pxSol} x2={x0 + wMitad - 6} y2={yMitad + pxSol} />
                <text className="puerta-texto-rotulador" x={x0 + wMitad - 16} y={yMitad + hBanda * 0.72} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 600 }}>1</text>
                <rect className="puerta-saco-pieza" x={x0 + wMitad + 8} y={yMitad} width={wMitad - 6} height={hBanda} />
                <line className="puerta-rotulador" x1={x0 + wMitad + 8} y1={yMitad + pxSol} x2={x0 + 2 * wMitad + 2 - pxFin} y2={yMitad + pxSol} />
                <text className="puerta-texto-rotulador" x={x0 + wMitad + 18} y={yMitad + hBanda * 0.72} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 600 }}>1</text>
                <CotaPlana x1={x0} y1={yMitad + hBanda} x2={x0 + wMitad - 6} y2={yMitad + hBanda} linea={yMitad + hBanda + 12} texto={mm(m.largoMitad)} lado="abajo" />
                <CotaPlana x1={x0 + 2 * wMitad + 2} y1={yMitad} x2={x0 + 2 * wMitad + 2} y2={yMitad + hBanda} linea={x0 + 2 * wMitad + 14} texto={mm(m.anchoCorte)} lado="derecha" />
              </>
            )}
          </svg>

          <p className="puerta-ayuda">Soldar {mm(soldadura)} mm para cerrar el cilindro. Negro hacia el exterior.</p>
          <p className="puerta-ayuda">El corte incluye las dos opciones. El técnico de la máquina elige una.</p>
        </>
      ) : (
        <p>Completa el largo y el aplastado para ver las medidas del saco y sus dos opciones de corte.</p>
      )}
    </section>
  );
}

export function ConfigurarSacoArena({ p, cambiar, corte, derecha, vistas }: {
  p: Puerta; cambiar: (p: Puerta) => void; corte?: React.ReactNode; derecha: 'alzado' | 'corte'; vistas?: React.ReactNode;
}) {
  const prefijo = useId();
  const ficha = fichaDePuerta(p);
  const r = calcularPuerta(p);
  const set = <K extends keyof Puerta>(k: K, v: Puerta[K]) => cambiar({ ...p, [k]: v, confirmada: false });

  return (
    <div className="puerta-config-alzado">
      <section className="puerta-config panel panel-vidrio" aria-label="Configurador de saco confeccionado">
        <header><h2>Configurador</h2><span>Portanova · medidas en mm</span></header>
        <fieldset>
          <legend>Saco confeccionado</legend>
          <div className="puerta-campos">
            <div className="field puerta-campo">
              <label htmlFor={`${prefijo}-of`}>OF</label>
              <input id={`${prefijo}-of`} name="of" required value={p.of} placeholder="SIN OF" spellCheck={false} onChange={e => set('of', e.target.value)} />
            </div>
            <NumeroPuerta titulo="Cantidad de sacos iguales" unidad="cantidad" valor={p.cantidad || null} cambiar={v => set('cantidad', v ?? 0)} />
            <SelectField
              label="Tipo de producto"
              value={tipoDePuerta(p).id}
              options={ficha.tipos.map(t => t.id)}
              optionLabel={v => ficha.tipos.find(t => t.id === v)?.nombre ?? ''}
              onChange={v => cambiar(cambiarTipoDelCliente(p, v))}
            />
            <NumeroPuerta titulo="Largo (mm)" valor={p.frente || null} cambiar={v => set('frente', v ?? 0)} />
            <NumeroPuerta titulo="Aplastado (mm)" valor={p.alto || null} cambiar={v => set('alto', v ?? 0)} />
          </div>
        </fieldset>
        <fieldset>
          <legend>Material y restos</legend>
          <div className="puerta-campos">
            <div className="field puerta-campo">
              <label htmlFor={`${prefijo}-material`}>Material</label>
              <input id={`${prefijo}-material`} name="material" required value={p.material} onChange={e => set('material', e.target.value)} />
            </div>
            <div className="field puerta-campo">
              <label htmlFor={`${prefijo}-color`}>Color</label>
              <input id={`${prefijo}-color`} name="color" required value={p.color} onChange={e => set('color', e.target.value)} />
            </div>
            <NumeroPuerta titulo="Ancho del rollo de restos (mm)" valor={p.rollo || null} cambiar={v => set('rollo', v ?? 0)} />
          </div>
          <p className="puerta-ayuda">Cara negra hacia fuera. Marcar por el lado negro.</p>
        </fieldset>
        <div className="puerta-confirmaciones">
          <label className="puerta-casilla">
            <input type="checkbox" name="confirmada" checked={p.confirmada} onChange={e => cambiar({ ...p, confirmada: e.target.checked, ventanasConfirmadas: true })} />
            Confirmado con el pedido: largo, aplastado, material y negro hacia fuera
          </label>
        </div>
      </section>
      <div className="puerta-derecha">
        <div className="puerta-dibujo">{vistas}{derecha === 'corte' && corte ? corte : <VistaSacoArena puerta={p} />}</div>
        <section className="puerta-avisos panel panel-vidrio" aria-label="Comprobaciones del saco">
          <h2>Qué falta o revisar</h2>
          {r.avisos.length
            ? <ul>{r.avisos.map(a => <li key={a.codigo} className={a.nivel === 'error' ? 'es-error' : ''}>{textoMedidasMm(a.texto)}</li>)}</ul>
            : <p>Todo listo: medidas confirmadas.</p>}
        </section>
      </div>
    </div>
  );
}
