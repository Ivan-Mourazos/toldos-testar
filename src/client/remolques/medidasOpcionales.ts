import { detrasDistinto, type LonaInput } from '../../remolques/calc/lona.ts';
import type { TipoPerfil } from '../../remolques/calc/params.ts';

// Las medidas que solo algunos remolques llevan (las de detrás y los radios opcionales) van tras
// un Sí / No en el formulario. Aquí está lo que decide si arranca en Sí y qué se borra al pasar a
// No, para que nunca se calcule con un dato que no se ve.

/** El elemento ya trae medidas de detrás propias (de RPS, de un borrador o guardado): «Detrás distinto» arranca en Sí. */
export const tieneDetras = (input: LonaInput): boolean =>
  detrasDistinto(input) || (input.contornoAtras ?? 0) > 0;

/** Hay algo escrito detrás, aunque sea igual que delante: al quitarlo se pregunta. */
export const hayValoresDetras = (input: LonaInput): boolean =>
  (input.anchoAtras ?? 0) > 0 || input.altoAtras > 0 || (input.contornoAtras ?? 0) > 0;

/** «Detrás distinto» en No: detrás queda igual que delante (cero = igual). */
export const sinDetras = (input: LonaInput): LonaInput =>
  ({ ...input, anchoAtras: 0, altoAtras: 0, contornoAtras: undefined });

/**
 * Con «Detrás distinto» en No, cambiar el ancho o el alto de delante deja el de detrás en «igual».
 * Un alto de detrás que venía igual que el de delante (RPS lo trae así) no puede quedarse
 * escondido con el valor viejo y volver el remolque distinto detrás sin que nadie lo vea.
 */
export function conMedidaDelante(
  input: LonaInput, campo: 'ancho' | 'altoDelante', valor: number, detrasVisible: boolean,
): LonaInput {
  if (detrasVisible) return { ...input, [campo]: valor };
  return campo === 'ancho'
    ? { ...input, ancho: valor, anchoAtras: 0 }
    : { ...input, altoDelante: valor, altoAtras: 0 };
}

type CampoRadio = 'radioCumbrera' | 'radioHombro' | 'radioChaflanAbajo' | 'radioChaflanArriba';

/** Radios que un perfil puede llevar o no (el del TIPO 05 no es opcional: sin él no hay contorno). */
export function radiosOpcionales(tipo: TipoPerfil | ''): CampoRadio[] {
  if (tipo === 'TIPO 03') return ['radioCumbrera', 'radioHombro'];
  if (tipo === 'TIPO 04') return ['radioChaflanAbajo', 'radioChaflanArriba'];
  return [];
}

/** El perfil elegido ya lleva algún radio: «Con radios» arranca en Sí. */
export const tieneRadios = (input: LonaInput): boolean =>
  radiosOpcionales(input.tipoPerfil).some((campo) => (input[campo] ?? 0) > 0);

/** «Con radios» en No: las aristas del perfil elegido quedan vivas. */
export const sinRadios = (input: LonaInput): LonaInput => ({
  ...input,
  ...Object.fromEntries(radiosOpcionales(input.tipoPerfil).map((campo) => [campo, 0])),
});
