import React, { useState } from 'react';
import { cotaDelVentanalTgm, marcasDesdeCotasTgm, tramoVentanalDesdeCota } from '../../puertas/tgm.ts';
import type { Puerta } from '../../puertas/tipos.ts';
import { NumeroPuerta as Numero } from './NumeroPuerta';
import { numeroPuerta } from './medidasPuertas';

type Tgm = NonNullable<Puerta['tgm']>;
const positivo = (x: number | null): x is number => x !== null && Number.isFinite(x) && x > 0;

/** Tramos de la hoja del cliente: una casilla por tramo, de abajo arriba; el dibujo cambia al escribir. */
export function TramosHoja({ p, medidas, entradas }: {
  p: Puerta;
  medidas: (cambio: Partial<Tgm>) => void;
  entradas: number;
}) {
  const t = p.tgm!;
  // Se guardan en cm (como la hoja); en pantalla van en mm como el resto de Puertas.
  const [tramos, setTramos] = useState<Array<number | null>>(t.cotasHoja ?? []);
  const ventanal = cotaDelVentanalTgm(p);
  const completos = tramos.every(positivo);
  const caben = !completos || marcasDesdeCotasTgm(p, tramos as number[]) !== null;
  const faltanMedidas = !(p.frente > 0 && p.alto > 0 && t.anchoEt > 0);

  function poner(siguientes: Array<number | null>) {
    setTramos(siguientes);
    if (siguientes.every(positivo)) {
      const v = cotaDelVentanalTgm(p);
      medidas({ cotasHoja: siguientes, ...(v !== null && v >= siguientes.length ? { ventanal: undefined } : {}) });
    }
  }

  function numero(n: number | null) {
    const cuantos = Math.max(0, Math.min(30, Math.trunc(n ?? 0)));
    poner(Array.from({ length: cuantos }, (_, i) => tramos[i] ?? null));
  }

  function marcarVentanal(indice: number, marcado: boolean) {
    const tramo = tramoVentanalDesdeCota(p, indice);
    medidas({ ventanal: marcado && tramo !== null ? { tramo } : undefined });
  }

  const suma = completos ? tramos.reduce<number>((s, x) => s + (x ?? 0), 0) : null;
  return <>
    <Numero titulo="Número de tramos" unidad="cantidad" valor={t.cotasHoja === null && !tramos.length ? null : tramos.length} cambiar={numero} />
    <p className="puerta-ayuda puerta-campo-ancho">
      De centro a centro de los tubos, de abajo arriba. Con un solo tubo, pon 0 tramos.
      {ventanal !== null && ' En el tramo del ventanal, suma el ancho de una E.T. al plástico visible.'}
    </p>
    {tramos.map((valor, i) => {
      const sinVentanal = tramoVentanalDesdeCota(p, i) === null;
      return <div key={i} className="puerta-tramo-hoja puerta-campo-ancho">
        <Numero titulo={`Tramo ${i + 1}${i === 0 ? ' · abajo' : i === tramos.length - 1 ? ' · arriba' : ''} (mm)`} valor={valor}
          cambiar={v => poner(tramos.map((x, j) => (j === i ? v : x)))} />
        <label className="puerta-casilla" title={sinVentanal ? 'Sin saco, el tramo de abajo va desde el tubo del cierre: no lleva ventanal.' : undefined}>
          <input type="checkbox" checked={ventanal === i} disabled={sinVentanal} onChange={e => marcarVentanal(i, e.target.checked)} />
          Ventanal
        </label>
      </div>;
    })}
    {tramos.length > 0 && <p role="status" className="puerta-ayuda puerta-campo-ancho">
      {!completos ? 'Completa todos los tramos para colocar las E.T. en el dibujo.'
        : faltanMedidas ? 'Pon el frente, el alto terminado y el ancho de E.T. para colocar los tramos.'
          : `Suma ${numeroPuerta((suma ?? 0) * 10)} mm · lleva ${entradas} E.T.`}
    </p>}
    {completos && !faltanMedidas && !caben && <p role="status" className="simulador-enrolle__error puerta-campo-ancho">
      Los tramos no caben en el alto terminado. Revisa el alto, el ancho de la E.T. y el saco.
    </p>}
  </>;
}
