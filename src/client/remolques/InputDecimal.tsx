import React, { useState } from 'react';
import { escrituraNumeroValida, formatearNumeroEs, leerNumeroEs } from './numeroEs';

type PropsInput = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'>;

/**
 * Casilla numérica con coma decimal (2,5), como el resto de la web.
 *
 * Un `type="number"` enseña el separador según el idioma del navegador, y el mismo pedido salía
 * con punto o con coma según el equipo. Aquí es siempre coma y se acepta también el punto. La
 * casilla guarda lo que se va escribiendo (por ejemplo «12,») para que no se pierda la coma a
 * medias, y se reescribe en formato normal al salir o cuando el valor cambia desde fuera.
 *
 * `value` sin valor (`undefined` o `null`) se ve vacío; `onValor(null)` avisa de que se ha vaciado.
 * Lo que no es una escritura de número (letras, signos) se ignora.
 */
export function InputDecimal({ value, onValor, onBlur, ...resto }: PropsInput & {
  value: number | null | undefined;
  onValor: (valor: number | null) => void;
}) {
  const [texto, setTexto] = useState(() => (value == null ? '' : formatearNumeroEs(value)));

  // Si el valor cambia por otro lado (importar de RPS, «Usar calculado», restaurar…), la casilla
  // lo sigue; si ya coincide con lo escrito («12,» frente a 12) no se toca, para no comerse la coma.
  // Se ajusta al pintar (no en un efecto) para no dibujar antes el valor viejo.
  const [valorVisto, setValorVisto] = useState(value);
  if (valorVisto !== value) {
    setValorVisto(value);
    if ((leerNumeroEs(texto) ?? 0) !== (value ?? 0)) setTexto(value == null ? '' : formatearNumeroEs(value));
  }

  return (
    <input
      {...resto}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={texto}
      onChange={(evento) => {
        const nuevo = evento.target.value;
        if (!escrituraNumeroValida(nuevo)) return;
        setTexto(nuevo);
        onValor(leerNumeroEs(nuevo));
      }}
      onBlur={(evento) => {
        setTexto(value == null ? '' : formatearNumeroEs(value));
        onBlur?.(evento);
      }}
    />
  );
}
