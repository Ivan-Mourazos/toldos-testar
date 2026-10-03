import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import './hojaTelas.css';
import { cargarHojaTelas } from './cargarHojaTelas';
import { HojaTelas } from './HojaTelas';
import type { HojaTelasDatos } from './tipos';

// Página de telas del planteamiento de toldos: página interna, sin la aplicación alrededor, que
// Chromium abre en el servidor para hacer el PDF. Avisa con window.hojaLista cuando todo está
// pintado, o deja el motivo en window.hojaError. Sin StrictMode: los datos se piden una sola vez.
const texto = (error: unknown) => (error instanceof Error ? error.message : String(error));
let raiz: ReturnType<typeof createRoot> | null = null;
const lista = () => { if (!window.hojaError) window.hojaLista = true; };
const fallar = (mensaje: string) => {
  if (window.hojaError) return;
  window.hojaError = mensaje;
  window.hojaLista = false;
  raiz?.render(<p className="hoja-error">{mensaje}</p>);
};

// Un fallo al pintar o fuera de React no puede quedarse en un «tiempo agotado» del servidor.
raiz = createRoot(document.getElementById('hoja')!, {
  onUncaughtError: (error) => fallar(`No se pudo pintar la hoja: ${texto(error)}`),
});
window.addEventListener('error', (evento) => fallar(`Error en la hoja: ${evento.message}`));
window.addEventListener('unhandledrejection', (evento) => fallar(`Error en la hoja: ${texto(evento.reason)}`));

function cargar(): Promise<HojaTelasDatos> {
  // Solo con el servidor de desarrollo (MODE y no DEV, como en la hoja de remolques): en un build
  // la rama y su import desaparecen.
  if (import.meta.env.MODE === 'development') {
    const muestra = new URLSearchParams(window.location.search).get('muestra');
    if (muestra) return import('./muestraDev').then(({ datosMuestra }) => datosMuestra(muestra));
  }
  return cargarHojaTelas(window.location.search);
}

cargar()
  .then((datos) => raiz?.render(<HojaTelas datos={datos} onLista={lista} onError={fallar} />))
  .catch((error: unknown) => fallar(`No se pudo preparar la hoja: ${texto(error)}`));
