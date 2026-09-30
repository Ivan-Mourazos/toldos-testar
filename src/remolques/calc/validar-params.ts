import { DEFAULT_PARAMS, type CalcParams, type ClienteBaqueton, type Recogida } from "./params.ts";

const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const CAMPOS_NUMERICOS = [
  "demasiaAlto", "demasiaContornoNormal", "demasiaContornoEnfundar", "demasiaLonaHecha",
  "ajusteContornoBase", "ajusteContornoCurva", "pasoOllaosDefecto", "primerOllao",
  "maxPosicionesOllaos", "baquetonDemasiaLargoCostura", "baquetonDemasiaAnchoCostura",
  "baquetonDemasiaCostura", "baquetonDemasiaFinal",
] as const;

/** Recogidas que el código añadió después de que hubiera Parámetros guardados. */
const RECOGIDAS_NUEVAS = ["GANCHOS CORAZON"];

/** Marcas que el código añadió a una recogida que ya existía, con el valor que le da. */
const MARCAS_NUEVAS: Array<{ nombre: string; marca: "panoTraseroConAnchoDelante"; valor: boolean }> = [
  { nombre: "PUENTES HIJOS DE PEDRO LOPEZ", marca: "panoTraseroConAnchoDelante", valor: true },
];

/** Pone a una recogida guardada las marcas nuevas que no trae; si ya las trae (sí o no), manda la guardada. */
function conMarcasNuevas(recogida: Recogida): Recogida {
  const faltan = MARCAS_NUEVAS.filter(
    (m) => recogida?.nombre === m.nombre && recogida[m.marca] === undefined,
  );
  return faltan.length === 0
    ? recogida
    : { ...recogida, ...Object.fromEntries(faltan.map((m) => [m.marca, m.valor])) };
}

/** Lectura tolerante: completa con DEFAULT_PARAMS lo que falte en datos guardados antiguos. */
export function normalizarParams(bruto: unknown): CalcParams {
  const p = (typeof bruto === "object" && bruto !== null ? bruto : {}) as Record<string, unknown>;
  const resultado: CalcParams = { ...DEFAULT_PARAMS };
  for (const campo of CAMPOS_NUMERICOS) {
    if (esNumero(p[campo])) resultado[campo] = p[campo];
  }
  if (Array.isArray(p.recogidas) && p.recogidas.length > 0) {
    const guardadas = p.recogidas as Recogida[];
    // Unos Parámetros guardados antes de que existiera una recogida no la traen: se añade la del
    // código para que salga en el formulario. Las guardadas no se tocan, y las que no son nuevas
    // tampoco se reponen (si alguien quitó una, fue a propósito).
    const faltan = DEFAULT_PARAMS.recogidas.filter(
      (r) => RECOGIDAS_NUEVAS.includes(r.nombre) && !guardadas.some((g) => g?.nombre === r.nombre),
    );
    // Igual con una marca nueva de una recogida que ya estaba (el paño trasero de HPL, 30/09/2026):
    // se le pone la del código solo si no la trae, y sus medidas guardadas no se tocan.
    resultado.recogidas = [...guardadas.map(conMarcasNuevas), ...faltan];
  }
  if (Array.isArray(p.clientesBaqueton) && p.clientesBaqueton.length > 0) {
    resultado.clientesBaqueton = p.clientesBaqueton as ClienteBaqueton[];
  }
  if (Array.isArray(p.tecnicos) && p.tecnicos.length > 0) {
    resultado.tecnicos = (p.tecnicos as unknown[]).filter(
      (t): t is string => typeof t === "string",
    );
  }
  return resultado;
}

/** Validación estricta antes de persistir: todo presente, numérico y coherente. */
export function validarParams(
  bruto: unknown,
): { ok: true; params: CalcParams } | { ok: false; errores: string[] } {
  if (typeof bruto !== "object" || bruto === null) {
    return { ok: false, errores: ["El cuerpo debe ser un objeto de parámetros"] };
  }
  const p = bruto as Record<string, unknown>;
  const errores: string[] = [];
  for (const campo of CAMPOS_NUMERICOS) {
    if (!esNumero(p[campo])) errores.push(`«${campo}» debe ser un número`);
  }
  if (esNumero(p.pasoOllaosDefecto) && p.pasoOllaosDefecto <= 0) {
    errores.push("«pasoOllaosDefecto» debe ser mayor que 0");
  }
  if (esNumero(p.maxPosicionesOllaos) && p.maxPosicionesOllaos < 1) {
    errores.push("«maxPosicionesOllaos» debe ser al menos 1");
  }
  const tecnicos = p.tecnicos;
  if (!Array.isArray(tecnicos) || tecnicos.length === 0) {
    errores.push("«tecnicos» debe tener al menos un técnico");
  } else if (tecnicos.some((t) => typeof t !== "string" || t.trim() === "")) {
    errores.push("cada técnico debe tener nombre");
  }
  const recogidas = p.recogidas;
  if (!Array.isArray(recogidas) || recogidas.length === 0) {
    errores.push("«recogidas» debe tener al menos una entrada");
  } else {
    if (!recogidas.some((r) => (r as Recogida)?.nombre === "NO")) {
      errores.push("«recogidas» debe incluir la entrada «NO» (es el fallback)");
    }
    recogidas.forEach((r, i) => {
      const rec = r as Partial<Recogida> | null;
      if (typeof rec?.nombre !== "string" || rec.nombre.trim() === "") {
        errores.push(`recogida ${i + 1}: falta el nombre`);
      }
      for (const campo of ["delante", "atras", "lateralSoloAtras", "lateralSoloDelante"] as const) {
        if (!esNumero(rec?.[campo])) {
          errores.push(`recogida «${rec?.nombre ?? i + 1}»: «${campo}» debe ser un número`);
        }
      }
      if (rec?.panoTraseroConAnchoDelante !== undefined && typeof rec.panoTraseroConAnchoDelante !== "boolean") {
        errores.push(`recogida «${rec?.nombre ?? i + 1}»: «panoTraseroConAnchoDelante» debe ser sí o no`);
      }
    });
  }
  const clientes = p.clientesBaqueton;
  if (!Array.isArray(clientes) || clientes.length === 0) {
    errores.push("«clientesBaqueton» debe tener al menos una entrada");
  } else if (!clientes.some((c) => (c as ClienteBaqueton)?.nombre === "GENERAL")) {
    errores.push("«clientesBaqueton» debe incluir la entrada «GENERAL» (es el fallback)");
  }
  return errores.length > 0 ? { ok: false, errores } : { ok: true, params: bruto as CalcParams };
}
