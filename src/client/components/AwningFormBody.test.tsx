import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Awning } from '../types';
import { AwningFormBody } from './AwningFormBody';
import { TextField } from './TextField';

function anchos(model: string, etiquetas: string[]) {
  const markup = renderToStaticMarkup(<AwningFormBody reading={false} awning={{ model } as Awning}>
    {etiquetas.map(label => <TextField key={label} label={label} value="" onChange={() => undefined} />)}
  </AwningFormBody>);
  return Object.fromEntries([...markup.matchAll(/data-field="([^"]+)"[^>]*style="grid-column:span (\d+)"/g)].map(match => [match[1], Number(match[2])]));
}

describe('anchos de las opciones del formulario', () => {
  it('Iris comparte rotulación con telón y lacado y da sitio a las dos formas del cofre', () => {
    expect(anchos('IRIS', ['Rotulación tela', 'Tipo de guía', 'Fijación de la guía', 'Forma del cofre', 'Secur Wind Block', 'Telón', 'Lacado'])).toEqual({
      'Tipo de guía': 3, 'Fijación de la guía': 3, 'Forma del cofre': 4, 'Secur Wind Block': 2,
      Telón: 6, Lacado: 3, 'Rotulación tela': 3,
    });
  });

  it('Electra deja media fila para ventana y media para las tres opciones de confección', () => {
    expect(anchos('ELECTRA', ['Variante', 'Tipo de soporte', 'Lacado', 'Ventana', 'Confección'])).toEqual({
      Variante: 4, 'Tipo de soporte': 5, Lacado: 3, Ventana: 6, Confección: 6,
    });
  });

  it('el lacado de los cofres comparte fila con el accionamiento', () => {
    expect(anchos('CORAL BOX', ['Lacado', 'Dispositivo', 'Sensor', 'Posición motor'])).toEqual({
      Lacado: 3, Dispositivo: 3, Sensor: 3, 'Posición motor': 3,
    });
  });

  it('Cortina conserva juntos los remates sin dejar Abajo solo', () => {
    expect(anchos('CORTINA', ['Soporte', 'Lacado', 'Ventana', 'Laterales', 'Abajo'])).toEqual({
      Soporte: 5, Lacado: 3, Ventana: 4, Laterales: 6, Abajo: 6,
    });
  });

  it('Antica comparte configuración, altura del soporte y lacado', () => {
    expect(anchos('ANTICA', ['Configuración Antica', 'Altura soporte-brazo (cm)', 'Lacado'])).toEqual({
      'Configuración Antica': 6, 'Altura soporte-brazo (cm)': 3, Lacado: 3,
    });
  });
});
