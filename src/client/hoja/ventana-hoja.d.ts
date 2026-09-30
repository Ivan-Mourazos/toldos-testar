export {};

declare global {
  interface Window {
    /** La hoja de taller está pintada entera (fuentes, logo y dibujos): Chromium ya puede imprimirla. */
    hojaLista?: boolean;
    /** Por qué no se ha podido pintar la hoja; el servidor lo devuelve tal cual. */
    hojaError?: string;
  }
}
