import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import './hoja.css';
import type { DatosHojaPedido } from '../../remolques/hoja/tipos.ts';
import { crearCapturador } from '../remolques/render/captura';
import { cargarDatosHoja } from './cargarHoja';
import { HojaPedido } from './HojaPedido';
import { prepararHoja, type HojaPreparada } from './prepararHoja';

// Hoja de taller de remolques (fase 4): página interna, sin la aplicación alrededor, que Chromium
// abre en el servidor para hacer el PDF. Avisa con window.hojaLista cuando todo está pintado, o
// deja el motivo en window.hojaError. Sin StrictMode: los datos se piden una sola vez.
const raiz = createRoot(document.getElementById('hoja')!);
const lista = () => { window.hojaLista = true; };
const fallar = (mensaje: string) => {
  if (window.hojaError) return;
  window.hojaError = mensaje;
  raiz.render(<p className="hoja-error">{mensaje}</p>);
};

function pintar(datos: DatosHojaPedido) {
  const capturador = crearCapturador();
  let hojas: HojaPreparada[];
  try {
    hojas = prepararHoja(datos, capturador);
  } finally {
    capturador.liberar();
  }
  raiz.render(<HojaPedido hojas={hojas} onLista={lista} onError={fallar} />);
}

function cargar(): Promise<DatosHojaPedido> {
  // Solo en desarrollo, y con un `if` para que el build deje fuera la muestra y su fixture.
  if (import.meta.env.DEV) {
    const muestra = new URLSearchParams(window.location.search).get('muestra');
    if (muestra) return import('./muestraDev').then(({ datosMuestra }) => datosMuestra(muestra));
  }
  return cargarDatosHoja(window.location.search);
}

cargar()
  .then(pintar)
  .catch((error: unknown) => fallar(`No se pudo preparar la hoja: ${error instanceof Error ? error.message : String(error)}`));
