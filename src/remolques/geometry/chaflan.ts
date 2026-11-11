/**
 * La esquina achaflanada del TIPO 04, con las dos aristas curvadas.
 *
 * `chaflan` es la cara entre los dos **vértices virtuales**: donde se
 * cortarían las rectas si no hubiera curvas. Es lo que acota el CAD de oficina
 * técnica y lo único independiente de los radios — la cuerda entre tangencias
 * cambia al cambiar un radio, así que no sirve como parámetro.
 *
 * De aquí beben `perfil.ts` y `contorno.ts`, para no repetir la cuenta en dos
 * sitios como le pasa hoy al TIPO 03.
 */

/** Giro de cada esquina del chaflán histórico definido por su cara. */
export const GIRO_CHAFLAN = Math.PI / 4;

const TANGENTE_MEDIA = Math.tan(GIRO_CHAFLAN / 2);

/** Ausente conserva el chaflán histórico, definido por su cara a 45°. */
export interface DefinicionChaflan {
  modoChaflan?: "cara" | "plano-aguas";
  /** Tramo plano real entre las tangencias superiores, medido en el remolque. */
  anchoPlanoSuperior?: number;
  /**
   * Cuánto se desplaza hacia fuera el contorno del remolque exacto (Iván, 11/11/2026: «se hace
   * el remolque de la medida exacta, con la de 37, y después el desfase a todo el contorno»).
   * Con él, `ancho` y `alto` son los del contorno desplazado y los radios y el plano, los del
   * remolque. Medio centímetro da la lona hecha (el centímetro de más en el ancho); el paño suma
   * después su centímetro, como siempre. Ausente o cero: el remolque tal cual.
   */
  desfaseChaflan?: number;
  /**
   * En qué raya están medidos los radios, como desplazamiento desde el remolque (Iván, 11/11/2026:
   * «debe quedar el radio que yo marco en la lona terminada»): con medio centímetro, el radio
   * marcado es el del terminado, el remolque lleva medio menos y el corte, uno más. Cero: radios
   * del remolque.
   */
  radiosEnDesfase?: number;
}

export interface EsquinaChaflan {
  entrada: number;
  caida: number;
  anguloPendiente: number;
  giroAbajo: number;
  giroArriba: number;
  /** Campo histórico: caída por la pared; solo a 45° coincide con la entrada. */
  pata: number;
  /** Cara entre vértices virtuales, ya efectiva tras acotar la pata. */
  cara: number;
  /**
   * Radio de abajo ya acotado (pared, techo y reparto con el de arriba si
   * entre los dos se comían la cara) — no el valor de entrada. Dibuja el
   * arco con este radio: con el de entrada sin acotar, el arco no sería
   * tangente a las rectas que une.
   */
  radioAbajo: number;
  /** Igual que `radioAbajo`, pero acotado al techo en vez de a la pared. */
  radioArriba: number;
  /** Lo que cada arco consume sobre las rectas que une. */
  tangenteAbajo: number;
  tangenteArriba: number;
  /** Tramo recto que queda del chaflán entre los dos arcos. */
  caraRecta: number;
}

/**
 * La esquina del contorno desplazado `d` hacia fuera, con el origen en su propia pared y su
 * techo. Los tramos rectos se apartan `d` en perpendicular, los arcos crecen `d` con el mismo
 * centro y la pendiente no cambia: el plano entre curvas mide lo mismo. Una arista viva
 * (radio 0) sigue viva; su vértice se corre por la bisectriz.
 */
export function desplazarEsquina(e: EsquinaChaflan, d: number): EsquinaChaflan {
  if (!(d > 0)) return e;
  const radioAbajo = e.radioAbajo > 0 ? e.radioAbajo + d : 0;
  const radioArriba = e.radioArriba > 0 ? e.radioArriba + d : 0;
  const entrada = e.entrada + d - d * Math.tan(e.giroArriba / 2);
  const caida = e.caida + d - d * Math.tan(e.giroAbajo / 2);
  const cara = Math.hypot(entrada, caida);
  const tangenteAbajo = radioAbajo * Math.tan(e.giroAbajo / 2);
  const tangenteArriba = radioArriba * Math.tan(e.giroArriba / 2);
  return { ...e, entrada, caida, pata: caida, cara, radioAbajo, radioArriba, tangenteAbajo, tangenteArriba,
    caraRecta: Math.max(cara - tangenteAbajo - tangenteArriba, 0) };
}

export function esquinaChaflan({
  ancho, alto, chaflan = 0, radioAbajo = 0, radioArriba = 0, modoChaflan, anchoPlanoSuperior, aguas, desfaseChaflan = 0,
  radiosEnDesfase = 0,
}: {
  ancho: number; alto: number; chaflan?: number; aguas?: number;
  radioAbajo?: number; radioArriba?: number;
} & DefinicionChaflan): EsquinaChaflan | null {
  if (modoChaflan === "plano-aguas" && desfaseChaflan > 0) {
    // Primero el remolque exacto y después su contorno desplazado.
    // Los radios marcados son los de la raya `radiosEnDesfase`; el remolque lleva esa medida menos
    // (una arista viva sigue viva).
    const delRemolque = (radio: number) => (radio > 0 ? Math.max(radio - radiosEnDesfase, 0) : 0);
    const remolque = esquinaChaflan({ ancho: ancho - 2 * desfaseChaflan, alto: alto - desfaseChaflan,
      modoChaflan, anchoPlanoSuperior, aguas, radioAbajo: delRemolque(radioAbajo), radioArriba: delRemolque(radioArriba) });
    return remolque && desplazarEsquina(remolque, desfaseChaflan);
  }
  if (modoChaflan === "plano-aguas") {
    if (![ancho, alto, anchoPlanoSuperior, aguas, radioAbajo, radioArriba].every(Number.isFinite)
      || !(anchoPlanoSuperior! > 0 && anchoPlanoSuperior! < ancho)
      || !(aguas! > 0 && aguas! < alto) || radioAbajo < 0 || radioArriba < 0) return null;
    const caida = aguas!;
    const hastaPlano = (ancho - anchoPlanoSuperior!) / 2;
    // El plano se mide entre tangencias, no entre vértices. Con t = tan(θ/2):
    // (2r − aguas)t² − 2·hastaPlano·t + aguas = 0. La raíz pequeña mantiene
    // la pendiente hacia fuera; la otra solución deja la tangencia fuera del tramo.
    const discriminante = hastaPlano ** 2 - caida * (2 * radioArriba - caida);
    if (discriminante < 0) return null;
    const t = caida / (hastaPlano + Math.sqrt(discriminante));
    if (!(t > 0 && t < 1)) return null;
    const anguloPendiente = 2 * Math.atan(t);
    const entrada = hastaPlano - radioArriba * t;
    const cara = Math.hypot(entrada, caida);
    const giroAbajo = Math.PI / 2 - anguloPendiente;
    const giroArriba = anguloPendiente;
    const tangenteAbajo = radioAbajo * Math.tan(giroAbajo / 2);
    const tangenteArriba = radioArriba * t;
    if (!(entrada > 0) || tangenteAbajo > alto - caida
      || tangenteAbajo + tangenteArriba > cara + 1e-9) return null;
    return { pata: caida, entrada, caida, anguloPendiente, giroAbajo, giroArriba,
      cara, radioAbajo, radioArriba, tangenteAbajo, tangenteArriba,
      caraRecta: Math.max(cara - tangenteAbajo - tangenteArriba, 0) };
  }
  if (!(chaflan > 0) || !(ancho > 0) || !(alto > 0)) return null;

  // La pata se acota a la pieza y la cara se recalcula desde ella: usar el
  // chaflán crudo daría un contorno más largo que el remolque.
  const pata = Math.min(chaflan / Math.SQRT2, ancho / 2, alto);
  const cara = pata * Math.SQRT2;

  // Cada arco necesita su tangente en la recta que toca.
  //
  // Solo se neutraliza el NaN, que es el único que envenena el resultado:
  // Math.max(NaN, 0) es NaN y llegaría hasta caraRecta. Un radio infinito no
  // hace falta tocarlo y no conviene: el Math.min siguiente lo acota al límite
  // de la pared o del techo y sale una esquina redondeada válida, mientras que
  // tratarlo como no finito daría una arista viva en silencio. Y −Infinity ya
  // lo resuelve el Math.max.
  let rAbajo = Number.isNaN(radioAbajo) ? 0 : Math.max(radioAbajo, 0);
  rAbajo = Math.min(rAbajo, (alto - pata) / TANGENTE_MEDIA);
  let rArriba = Number.isNaN(radioArriba) ? 0 : Math.max(radioArriba, 0);
  rArriba = Math.min(rArriba, (ancho / 2 - pata) / TANGENTE_MEDIA);

  // Y entre los dos no pueden comerse la cara del chaflán.
  const ocupado = (rAbajo + rArriba) * TANGENTE_MEDIA;
  if (ocupado > cara) {
    const factor = cara / ocupado;
    rAbajo *= factor;
    rArriba *= factor;
  }

  const tangenteAbajo = rAbajo * TANGENTE_MEDIA;
  const tangenteArriba = rArriba * TANGENTE_MEDIA;
  return {
    pata, entrada: pata, caida: pata, anguloPendiente: GIRO_CHAFLAN,
    giroAbajo: GIRO_CHAFLAN, giroArriba: GIRO_CHAFLAN,
    cara,
    radioAbajo: rAbajo,
    radioArriba: rArriba,
    tangenteAbajo,
    tangenteArriba,
    caraRecta: Math.max(cara - tangenteAbajo - tangenteArriba, 0),
  };
}

/**
 * Lo que una esquina redondeada recorta frente a la misma esquina viva.
 *
 * Solo toma el radio: en este módulo el giro es siempre de 45°, así que la
 * tangente es siempre `radio · tan(22,5°)`. Aceptarla como argumento aparte
 * permitiría pasar una tangente calculada para otro ángulo y obtener un
 * recorte de perímetro silenciosamente incorrecto — y esto alimenta el
 * contorno de corte.
 */
export function recorteEsquina(radio: number): number {
  return 2 * radio * TANGENTE_MEDIA - radio * GIRO_CHAFLAN;
}

/** La misma comprobación para formulario, dibujo y corte; no se ajustan radios a escondidas. */
export function errorChaflanConAguas(input: DefinicionChaflan & {
  ancho: number; anchoAtras?: number; altoDelante: number; altoAtras?: number; traseraPorArriba?: boolean;
  aguas?: number; radioChaflanAbajo?: number; radioChaflanArriba?: number;
}): { campo: string; mensaje: string } | null {
  const anchoAtras = (input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input.ancho;
  const altoAtras = (input.altoAtras ?? 0) > 0 && !input.traseraPorArriba ? input.altoAtras! : input.altoDelante;
  if (!Number.isFinite(input.anchoPlanoSuperior) || !(input.anchoPlanoSuperior! > 0)
    || input.anchoPlanoSuperior! >= Math.min(input.ancho, anchoAtras)) {
    return { campo: "anchoPlanoSuperior", mensaje: "Introduce un plano superior mayor que cero y menor que el ancho del remolque, delante y detrás." };
  }
  if (!Number.isFinite(input.aguas) || !(input.aguas! > 0 && input.aguas! < Math.min(input.altoDelante, altoAtras))) {
    return { campo: "aguas", mensaje: "Introduce unas aguas mayores que cero y menores que el alto del remolque." };
  }
  for (const [ancho, alto] of [[input.ancho, input.altoDelante], [anchoAtras, altoAtras]]) {
    if (!esquinaChaflan({ ancho, alto, modoChaflan: "plano-aguas", anchoPlanoSuperior: input.anchoPlanoSuperior,
      aguas: input.aguas, radioAbajo: input.radioChaflanAbajo, radioArriba: input.radioChaflanArriba })) {
      return { campo: "radioChaflanArriba", mensaje: "Los radios no caben con ese plano y esas aguas. Revisa los dos radios y las medidas." };
    }
  }
  return null;
}
