import type { LonaInput } from "./lona.ts";

// Clientes que piden el alto sin las aguas (Iván, 20/11/2026, AR2605676 de Hijos de Pedro López:
// RPS da 220 × 130 × 40 y su pedido dice «Arquillo p.8»: el alto es 40 + 8). Las aguas no vienen en
// RPS, así que el elemento guarda el alto del pedido y, al escribir las aguas, el alto es la suma.

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Las aguas nuevas y, si el elemento guarda el alto del pedido sin aguas, el alto con ellas. */
export function conAguasDelPedido(input: LonaInput, aguas: number): LonaInput {
  const base = input.altoSinAguas;
  if (!base) return { ...input, aguas };
  const suma = Number.isFinite(aguas) && aguas > 0 ? aguas : 0;
  return {
    ...input,
    aguas,
    altoDelante: r1(base.delante + suma),
    altoAtras: base.atras > 0 ? r1(base.atras + suma) : input.altoAtras,
  };
}

/** El técnico ha escrito el alto a mano: deja de sumarse nada. */
export function sinAltoDelPedido(input: LonaInput): LonaInput {
  if (!input.altoSinAguas) return input;
  const resto = { ...input };
  delete resto.altoSinAguas;
  return resto;
}
