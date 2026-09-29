import React from 'react';
import type { LonaResult } from '../../remolques/calc/lona.ts';
import type { BaquetonResult } from '../../remolques/calc/baqueton.ts';

// Resultados del cálculo, los de `Resultados.tsx` de la web de remolques: tarjetas de datos,
// tabla del reparto de ollaos (o su editor cuando van «según se indica») y notas. Los
// números salen de `calcLona` / `calcBaqueton`; aquí solo se dan formato.

export interface RepartoOllaos {
  laterales: number[];
  atras: number[];
  delante: number[];
}

type ClaveReparto = keyof RepartoOllaos;
type ModoOllaos = 'REPARTIDOS' | 'SEGUN SE INDICA' | '';

const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });

const filas: Array<{ clave: ClaveReparto; nombre: string }> = [
  { clave: 'laterales', nombre: 'LATERALES · ATRÁS A ADELANTE' },
  { clave: 'atras', nombre: 'ATRÁS · IZQUIERDA A DERECHA' },
  { clave: 'delante', nombre: 'DELANTE · IZQUIERDA A DERECHA' },
];
const HUECOS = Array.from({ length: 12 }, (_, i) => i);

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rem-dato">
      <span>{label}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function TablaReparto({ reparto }: { reparto: RepartoOllaos }) {
  return (
    <div className="rem-tabla-caja scroll-thin">
      <table className="rem-tabla">
        <thead>
          <tr>
            <th scope="col">Reparto de ollaos</th>
            {HUECOS.map((i) => <th key={i} scope="col">{i + 1}</th>)}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ clave, nombre }) => {
            const posiciones = reparto[clave];
            return (
              <tr key={clave}>
                <th scope="row">{nombre}</th>
                {HUECOS.map((i) => <td key={i}>{posiciones[i] != null ? fmt(posiciones[i]) : '–'}</td>)}
                <td className="rem-tabla-total">{posiciones.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditorOllaos({ reparto, error, onChange }: {
  reparto: RepartoOllaos;
  error?: string;
  onChange: (reparto: RepartoOllaos) => void;
}) {
  const cambiar = (clave: ClaveReparto, indice: number, texto: string) => {
    const siguiente = [...reparto[clave]];
    if (texto === '') {
      if (indice < siguiente.length) siguiente.splice(indice, 1);
    } else {
      const valor = Number(texto);
      if (!Number.isFinite(valor) || valor <= 0 || indice > siguiente.length) return;
      siguiente[indice] = valor;
    }
    onChange({ ...reparto, [clave]: siguiente.slice(0, 12) });
  };

  return (
    <div className={`rem-ollaos-editor${error ? ' is-invalido' : ''}`}>
      <header>
        <h4>Ollaos a medida</h4>
        <span>Posiciones desde el origen · cm</span>
      </header>
      {filas.map(({ clave, nombre }) => {
        const posiciones = reparto[clave];
        return (
          <section key={clave} className="rem-ollaos-fila">
            <div className="rem-ollaos-nombre">
              <p>{nombre}</p>
              <span>{posiciones.length} {posiciones.length === 1 ? 'ollao' : 'ollaos'}</span>
            </div>
            <div className="rem-ollaos-casillas">
              {HUECOS.map((indice) => (
                <label key={indice}>
                  <span>{indice + 1}</span>
                  <input
                    data-campo={clave === 'laterales' && indice === 0 ? 'ollaosManuales' : undefined}
                    aria-invalid={Boolean(error && posiciones.length === 0)}
                    aria-label={`${nombre}, ollao ${indice + 1}`}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    disabled={indice > posiciones.length}
                    value={posiciones[indice] ?? ''}
                    onChange={(evento) => cambiar(clave, indice, evento.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>
        );
      })}
      {error && <p role="alert" className="rem-error rem-ollaos-error">{error}</p>}
    </div>
  );
}

function Ollaos({ modo, reparto, primerOllao, error, onChange }: {
  modo: ModoOllaos;
  reparto: RepartoOllaos;
  primerOllao: number;
  error?: string;
  onChange: (reparto: RepartoOllaos) => void;
}) {
  // Sin modo elegido no hay reparto que enseñar: una tabla vacía se leería como «este remolque
  // no lleva ollaos», que es justo lo que nadie ha dicho.
  if (modo === '') {
    return <p className="rem-vacio-resultado">Elige cómo van repartidos los ollaos para verlos aquí.</p>;
  }
  return (
    <div className="rem-ollaos">
      {modo === 'SEGUN SE INDICA'
        ? <EditorOllaos reparto={reparto} error={error} onChange={onChange} />
        : <TablaReparto reparto={reparto} />}
      {modo === 'REPARTIDOS' && (
        <p className="rem-pie-ollaos">Primer y último ollao a {fmt(primerOllao)} cm del borde.</p>
      )}
    </div>
  );
}

function Notas({ notas }: { notas: string[] }) {
  if (notas.length === 0) return null;
  return (
    <ul className="rem-notas">
      {notas.map((n) => <li key={n}>{n}</li>)}
    </ul>
  );
}

type PropsComunes = {
  modoOllaos: ModoOllaos;
  primerOllao: number;
  errorOllaos?: string;
  onOllaosChange: (reparto: RepartoOllaos) => void;
};

export function ResultadosLona({ res, modoOllaos, primerOllao, errorOllaos, onOllaosChange }: PropsComunes & { res: LonaResult }) {
  return (
    <div className="rem-resultados" aria-label="Resultados de la lona" role="group">
      <div className="rem-datos">
        <Dato
          label="Lona hecha"
          valor={res.lonaHecha.anchoAtras != null && res.lonaHecha.anchoAtras !== res.lonaHecha.ancho
            ? `${fmt(res.lonaHecha.largo)} × ${fmt(res.lonaHecha.ancho)} del. / ${fmt(res.lonaHecha.anchoAtras)} tras.`
            : `${fmt(res.lonaHecha.largo)} × ${fmt(res.lonaHecha.ancho)}`}
        />
        <Dato label={`Contorno corte (+${fmt(res.ajusteContorno)})`} valor={res.contornoAjustado ? fmt(res.contornoAjustado) : '—'} />
        <Dato label="Paño delantero" valor={`${fmt(res.panoDelantero.ancho)} × ${fmt(res.panoDelantero.alto)}`} />
        <Dato label="Paño trasero" valor={`${fmt(res.panoTrasero.ancho)} × ${fmt(res.panoTrasero.alto)}`} />
        <Dato label="Paño contorno" valor={res.panoContorno ? `${fmt(res.panoContorno.ancho)} × ${fmt(res.panoContorno.alto)}` : '—'} />
        <Dato label="Recoge delante" valor={res.recogeDelanteTexto} />
        <Dato label="Recoge atrás" valor={res.recogeAtrasTexto} />
        <Dato label="Metros de tela" valor={res.metrosTela > 0 ? `${fmt(res.metrosTela)} m` : '—'} />
      </div>
      <Ollaos modo={modoOllaos} reparto={res.reparto} primerOllao={primerOllao} error={errorOllaos} onChange={onOllaosChange} />
      <Notas notas={res.notas} />
    </div>
  );
}

export function ResultadosBaqueton({ res, modoOllaos, primerOllao, errorOllaos, onOllaosChange }: PropsComunes & { res: BaquetonResult }) {
  return (
    <div className="rem-resultados" aria-label="Resultados del baquetón" role="group">
      <div className="rem-datos">
        <Dato label="Paño único" valor={`${fmt(res.panoUnico.largo)} × ${fmt(res.panoUnico.ancho)}`} />
        <Dato label="Remolque hecho" valor={`${fmt(res.remolqueHecho.largo)} × ${fmt(res.remolqueHecho.ancho)}`} />
        <Dato label="Baquetón + costura" valor={fmt(res.baquetonCostura)} />
        <Dato label="Esquinas del./tras." valor={`${fmt(res.esquinaDelante)} / ${fmt(res.esquinaDetras)}`} />
        <Dato label="Delante" valor={res.baquetonDelantero != null ? `${fmt(res.baquetonDelantero)} · NO EN LÍNEA` : 'EN LÍNEA'} />
        <Dato label="Detrás" valor={res.baquetonTrasero != null ? `${fmt(res.baquetonTrasero)} · NO EN LÍNEA` : 'EN LÍNEA'} />
        <Dato label="Superficie" valor={`${fmt(res.superficieM2)} m²/ud`} />
        <Dato label="Metros de tela" valor={res.metrosTela > 0 ? `${fmt(res.metrosTela)} m` : '—'} />
      </div>
      <Ollaos modo={modoOllaos} reparto={res.reparto} primerOllao={primerOllao} error={errorOllaos} onChange={onOllaosChange} />
      <Notas notas={res.notas} />
    </div>
  );
}
