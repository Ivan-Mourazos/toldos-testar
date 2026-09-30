// Medidas del render, en cm, sacadas de lo que hace el taller (docs/remolques/cierres-y-acabados.md).

/** Aro de latón niquelado del ollao. */
export const DIAMETRO_OLLAO = 2;
/** Del centro del ollao al borde de abajo de la lona. */
export const OLLAO_AL_BORDE = 2.5;
/** Del borde de abajo de la lona (o del faldón) al gancho del cajón. */
export const GANCHO_BAJO_BORDE = 8;
/** Cuerda elástica perimetral de 6 mm. */
export const DIAMETRO_GOMA = 0.6;
/** Alto del cajón genérico; el del baquetón crece para que quepa el faldón. */
export const ALTO_CAJON = 40;
export const CAJON_BAJO_FALDON = 25;
/** Dobladillo de la bastilla de enfundar. */
export const BASTILLA = 5;
export const CREMALLERA_A_ESQUINA = 5;
export const CREMALLERA_BAJO_CIMA = 4;
export const ANCHO_VELCRO = 3;
/** Separación a lo alto de los puentes, y margen arriba y abajo. */
export const PASO_CIERRE = 20;
export const MARGEN_CIERRE = 10;
/** Recogida con goma, como en las fotos del taller (tmp/fotos-remolques/lona_camion_arquillada_tir_2.jpg,
 *  IMG_3934.PNG e IMG_3930.jpg): la oreja lleva 2 o 3 ollaos en su borde libre, en la parte baja de la
 *  pared, y de cada uno baja una goma larga en diagonal, cruzando la esquina, hasta un gancho del cajón
 *  en la cara del paño. Hasta 80 cm de pared, dos ollaos; si es más alta, tres. */
export const GOMA_ALTO_DOS_OLLAOS = 80;
/** Alturas de los ollaos de la oreja, en fracción del alto de la pared, de abajo arriba. */
export const GOMA_ALTURAS_DOS = [0.25, 0.5];
export const GOMA_ALTURAS_TRES = [0.2, 0.4, 0.6];
/** Iván, 30/09/2026: si es bastante alto se juntan en el gancho del centro; si es más bajo, van a
 *  los ganchos más cercanos. Desde esta pared (cm) todas las gomas de la esquina van al gancho del
 *  centro de la cara del paño, que comparten las dos esquinas de esa cara. */
export const ALTO_GOMA_AL_CENTRO = 100;
/** Si la goma perimetral ya tiene un gancho en la misma cara a menos de esto (cm) del que tocaría a
 *  la goma de la esquina, la goma acaba en ese y no se pone otro: dos ganchos casi juntos no los pone
 *  el taller. Vale también para los ganchos del pedido («Según ganchos»). */
export const GANCHO_COMPARTIDO = 8;
/** Pared más baja: distancia de cada gancho a la esquina, a lo ancho del paño, del más cercano al más lejano. */
export const GOMA_GANCHO_A_ESQUINA = [30, 45, 60];
/** Con la pared baja, los ganchos cercanos nunca llegan al centro del paño: se quedan a esta distancia de él. */
export const GOMA_GANCHO_ANTES_DEL_CENTRO = 5;
/** Del borde libre de la oreja al centro de su ollao. */
export const OLLAO_EN_OREJA = 2.5;
/** Demasía del paño sin recogida, si Parámetros no trae «NO». */
export const DEMASIA_SIN_RECOGIDA = 3;
/** Margen de la ventana a la cubierta, el mismo que usa el dibujo técnico. */
export const MARGEN_VENTANA = 5;
/** Las cotas van a esta distancia de la lona y las etiquetas a esta del ollao o gancho. */
export const SEPARACION_COTA = 15;
export const SEPARACION_ETIQUETA = 6;
