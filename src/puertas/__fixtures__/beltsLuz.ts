import { nuevaPuertaDeCliente } from '../nuevaPuertaCliente.ts';
import type { Hueco, PedidoPuertas } from '../tipos.ts';

function cintas(xs: number[], altoEt: number, w: number, h: number): Hueco[] {
  const y = (altoEt - h) / 2;
  return xs.map(x => ({ x, y, ancho: w, alto: h, radio: 0.5 }));
}

/** Belts Vigo · AR.26.04762 (OF 0232527): enrollable 288×521 con 4 ventanas, E.T. 30×10, saco 288×39 amarillo/negro. */
export function pedidoBelts4762(): PedidoPuertas {
  const base = nuevaPuertaDeCliente('belts', 'enrollable');
  // Cadena desde abajo: 105, 45, 45, 126, 100, 100 (= 521)
  const alturas = [105, 150, 195, 321, 421];
  return {
    schemaVersion: 1,
    kind: 'puertas',
    orderCode: 'AR2604762',
    cabecera: { cliente: 'BELTS VIGO, S.L', fecha: '24/09/2026', clienteRps: { codigo: '038908', nombre: 'BELTS VIGO, S.L' } },
    elementos: [{
      id: 'p1',
      input: {
        ...base,
        of: '0232527',
        frente: 288,
        alto: 521,
        cantidad: 1,
        material: 'LAC900',
        color: 'AZUL 5015',
        materialSaco: 'LAC900 AMARILLO',
        sacoDiagonalesAmarillas: true,
        confirmada: true,
        ventanasConfirmadas: true,
        enrollable: { ...base.enrollable, ventanasPequenas: true, sinVentanal: false },
        entradas: alturas.map(altura => ({ altura, diametro: 30 as const, largo: 288, alto: 10, huecos: [] })),
        ventanas: [
          { x: 15, y: 115, ancho: 121.5, alto: 25, radio: 2, radioCristal: 4, tramo: 1 },
          { x: 151.5, y: 115, ancho: 121.5, alto: 25, radio: 2, radioCristal: 4, tramo: 1 },
          { x: 15, y: 160, ancho: 121.5, alto: 25, radio: 2, radioCristal: 4, tramo: 2 },
          { x: 151.5, y: 160, ancho: 121.5, alto: 25, radio: 2, radioCristal: 4, tramo: 2 },
        ],
        belts: {
          ...base.belts!,
          cabecera: 'varilla',
          bajoEt: 16,
          marcaBajoEt: 32,
          etiquetaEtInferior: 'E.T 30X80',
          pestana3: true,
          altoSaco: 39,
          anchoEt: 10,
          etiquetaEt: 'E.T 30X10 (5,5 CM) HUECOS',
          pisarEt1cm: true,
          cierreVelcro: true,
        },
      },
    }],
  };
}

/** Belts Vigo · AR.26.02598 (OF 0228920): enrollable 366×390 con 2 ventanas rectangulares 125×40, E.T. Ø40 (13,5), saco negro 366×34. */
export function pedidoBelts2598(): PedidoPuertas {
  const base = nuevaPuertaDeCliente('belts', 'enrollable');
  // Cadena desde abajo: 40, 60, 45, 60, 55, 60, 70 (= 390)
  const alturas = [40, 100, 145, 205, 260, 320];
  return {
    schemaVersion: 1,
    kind: 'puertas',
    orderCode: 'AR2602598',
    cabecera: { cliente: 'BELTS VIGO, S.L', fecha: '01/06/2026', clienteRps: { codigo: '038908', nombre: 'BELTS VIGO, S.L' } },
    elementos: [{
      id: 'p1',
      input: {
        ...base,
        of: '0228920',
        frente: 366,
        alto: 390,
        cantidad: 1,
        material: 'LAC900',
        color: 'AZUL 5015',
        materialSaco: 'LAC900 NEGRO',
        confirmada: true,
        ventanasConfirmadas: true,
        enrollable: { ...base.enrollable, ventanasPequenas: true, sinVentanal: false },
        entradas: alturas.map(altura => ({ altura, diametro: 42 as const, largo: 366, alto: 13.5, huecos: [] })),
        ventanas: [
          { x: 45, y: 155, ancho: 125, alto: 40, radio: 0, radioCristal: 0, tramo: 3 },
          { x: 196, y: 155, ancho: 125, alto: 40, radio: 0, radioCristal: 0, tramo: 3 },
        ],
        belts: {
          ...base.belts!,
          cabecera: 'varilla',
          bajoEt: 13,
          marcaBajoEt: 26,
          etiquetaEtInferior: 'E.T Ø60 mm',
          pestana3: true,
          altoSaco: 34,
          anchoEt: 13.5,
          etiquetaEt: 'E.T Ø40 mm',
          pisarEt1cm: true,
          cierreVelcro: false,
        },
      },
    }],
  };
}

/** Belts Vigo · AR.25.05965 (OF 0223097, plantilla vigente BELTS VIGO.dwg): enrollable 320×480 ×2 con 2 ventanales. */
export function pedidoBelts5965(): PedidoPuertas {
  const base = nuevaPuertaDeCliente('belts', 'enrollable');
  // Cadena desde abajo: 90, 45, 45, 110, 80, 110 (= 480)
  const alturas = [90, 135, 180, 290, 370];
  return {
    schemaVersion: 1,
    kind: 'puertas',
    orderCode: 'AR2505965',
    cabecera: { cliente: 'BELTS VIGO, S.L', fecha: '19/11/2025', clienteRps: { codigo: '038908', nombre: 'BELTS VIGO, S.L' } },
    elementos: [{
      id: 'p1',
      input: {
        ...base,
        of: '0223097',
        frente: 320,
        alto: 480,
        cantidad: 2,
        material: 'LAC900',
        color: 'AZUL 5015',
        materialSaco: 'LAC900 NEGRO',
        confirmada: true,
        ventanasConfirmadas: true,
        enrollable: { ...base.enrollable, T: 300, D: 45, margen: 12, ventanales: [{ D: 45, margen: 12 }], ventanasPequenas: false, sinVentanal: false },
        entradas: alturas.map(altura => ({ altura, diametro: 30 as const, largo: 320, alto: 10, huecos: [] })),
        ventanas: [],
        belts: {
          ...base.belts!,
          cabecera: 'varilla',
          bajoEt: 13,
          marcaBajoEt: 26,
          etiquetaEtInferior: 'E.T Ø40',
          pestana3: true,
          altoSaco: 39,
          anchoEt: 10,
          etiquetaEt: '6 CM (HUECOS)',
          pisarEt1cm: true,
          cierreVelcro: false,
        },
      },
    }],
  };
}

/** Belts Vigo · AR.24.03480 (OF 0206154): apilable 280×360 ×2, bolsillo 28, E.T. 13,5, cintas 9×9,5, saco negro 280×39. */
export function pedidoBelts3480(): PedidoPuertas {
  const base = nuevaPuertaDeCliente('belts', 'apilable');
  const pasos = [50, 50, 50, 50, 50];
  const alturas = [50, 100, 150, 200, 250, 300];
  const xsCintas = [54.5, 135.5, 216.5];
  return {
    schemaVersion: 1,
    kind: 'puertas',
    orderCode: 'AR2403480',
    cabecera: { cliente: 'BELTS VIGO, S.L', fecha: '18/06/2024', clienteRps: { codigo: '038908', nombre: 'BELTS VIGO, S.L' } },
    elementos: [{
      id: 'p1',
      input: {
        ...base,
        of: '0206154',
        frente: 280,
        alto: 360,
        cantidad: 2,
        material: 'LAC900',
        color: 'AZUL 5015',
        materialSaco: 'LAC900 NEGRO',
        confirmada: true,
        ventanasConfirmadas: true,
        apilable: { ...base.apilable, pie: 50, pasos, cabecera: 60, bolsillo: 28 },
        entradas: alturas.map((altura, i) => ({
          altura, diametro: 42 as const, largo: 280, alto: 13.5,
          huecos: i % 2 === 0 ? cintas(xsCintas, 13.5, 9, 9.5) : [],
        })),
        ventanas: [
          { x: 66, y: 110.75, ancho: 58, alto: 28.5, radio: 2, radioCristal: 4, tramo: 2 },
          { x: 156, y: 110.75, ancho: 58, alto: 28.5, radio: 2, radioCristal: 4, tramo: 2 },
        ],
        belts: {
          ...base.belts!,
          bajoEt: 14,
          marcaBajoEt: 28,
          etiquetaEtInferior: 'E.T Ø40',
          pestana3: true,
          altoSaco: 39,
          anchoEt: 13.5,
          etiquetaEt: 'E.T Ø42 mm',
          cintaAncho: 9,
          cintaAlto: 9.5,
        },
      },
    }],
  };
}

/** Belts Vigo · AR.26.00478 (OF 0224968): apilable 430×450, E.T. 12,5, cintas 10×8, 6 ventanas 70×32,5, saco 430×58. */
export function pedidoBelts0478(): PedidoPuertas {
  const base = nuevaPuertaDeCliente('belts', 'apilable');
  const pasos = [50, 50, 50, 50, 50, 50, 50];
  const alturas = [50, 100, 150, 200, 250, 300, 350, 400];
  const xsCintas = [58, 161, 265, 368];
  return {
    schemaVersion: 1,
    kind: 'puertas',
    orderCode: 'AR2600478',
    cabecera: { cliente: 'BELTS VIGO, S.L', fecha: '06/02/2026', clienteRps: { codigo: '038908', nombre: 'BELTS VIGO, S.L' } },
    elementos: [{
      id: 'p1',
      input: {
        ...base,
        of: '0224968',
        frente: 430,
        alto: 450,
        cantidad: 1,
        material: 'LAC900',
        color: 'GRIS 7037',
        materialSaco: 'LAC900 AMARILLO',
        sacoDiagonalesAmarillas: true,
        confirmada: true,
        ventanasConfirmadas: true,
        apilable: { ...base.apilable, pie: 50, pasos, cabecera: 50, bolsillo: 23 },
        entradas: alturas.map((altura, i) => ({
          altura, diametro: 30 as const, largo: 430, alto: 12.5,
          huecos: i % 2 === 0 ? cintas(xsCintas, 12.5, 10, 8) : [],
        })),
        ventanas: [
          { x: 70, y: 58.75, ancho: 70, alto: 32.5, radio: 2, radioCristal: 4, tramo: 1 },
          { x: 180, y: 58.75, ancho: 70, alto: 32.5, radio: 2, radioCristal: 4, tramo: 1 },
          { x: 290, y: 58.75, ancho: 70, alto: 32.5, radio: 2, radioCristal: 4, tramo: 1 },
          { x: 70, y: 108.75, ancho: 70, alto: 32.5, radio: 2, radioCristal: 4, tramo: 2 },
          { x: 180, y: 108.75, ancho: 70, alto: 32.5, radio: 2, radioCristal: 4, tramo: 2 },
          { x: 290, y: 108.75, ancho: 70, alto: 32.5, radio: 2, radioCristal: 4, tramo: 2 },
        ],
        belts: {
          ...base.belts!,
          bajoEt: 14,
          marcaBajoEt: 28,
          etiquetaEtInferior: 'E.T Ø50',
          pestana3: true,
          altoSaco: 58,
          anchoEt: 12.5,
          etiquetaEt: 'E.T Ø35 mm',
          cintaAncho: 10,
          cintaAlto: 8,
        },
      },
    }],
  };
}

/** Puertas Luz · AR.26.02927 (OF 0229489): apilable 359×458, faldón 18 (corte 36), saco arena 359×22, E.T. 12, cintas 8×7,5, 6 ventanas 105×29. */
export function pedidoLuz2927(): PedidoPuertas {
  const base = nuevaPuertaDeCliente('puertasluz', 'apilable');
  // Cadena desde bajo total: faldón 18 + 49,6 + 7×48,8 + cabecera 48,8 = 458
  const pie = 67.6;
  const pasos = [48.8, 48.8, 48.8, 48.8, 48.8, 48.8, 48.8];
  const alturas = [pie, ...pasos.reduce<number[]>((acc, paso) => [...acc, Number(((acc.at(-1) ?? pie) + paso).toFixed(2))], [])];
  const xsCintas = [39.6, 175.5, 311.4];
  return {
    schemaVersion: 1,
    kind: 'puertas',
    orderCode: 'AR2602927',
    cabecera: { cliente: 'FABRICADOS LA SELVA PUERTAS LUZ, S.L.', fecha: '15/06/2026', clienteRps: { codigo: '052082', nombre: 'FABRICADOS LA SELVA PUERTAS LUZ, S.L.' } },
    elementos: [{
      id: 'p1',
      input: {
        ...base,
        of: '0229489',
        frente: 359,
        alto: 458,
        cantidad: 1,
        material: 'LAC900',
        color: 'AZUL 5010',
        materialSaco: 'LAC900 AMARILLO',
        sacoDiagonalesAmarillas: true,
        confirmada: true,
        ventanasConfirmadas: true,
        apilable: { ...base.apilable, pie, pasos, cabecera: 48.8, bolsillo: 24 },
        entradas: alturas.map((altura, i) => ({
          altura, diametro: 42 as const, largo: 359, alto: 12,
          huecos: i % 2 === 0 ? cintas(xsCintas, 12, 8, 7.5) : [],
        })),
        ventanas: [1, 2, 3].flatMap(tramo => {
          const y = Number(((alturas[tramo - 1] + alturas[tramo]) / 2 - 14.5).toFixed(2));
          return [
            { x: 59.05, y, ancho: 105, alto: 29, radio: 2, radioCristal: 4, tramo },
            { x: 194.95, y, ancho: 105, alto: 29, radio: 2, radioCristal: 4, tramo },
          ];
        }),
        puertasluz: {
          ...base.puertasluz!,
          variante: 'apilable',
          altoFaldon: 18,
          extraAnchoFaldon: 0,
          bajoEt: 11,
          pestana3: true,
          anchoEt: 12,
          cintaAncho: 8,
          cintaAlto: 7.5,
          sacoArena: true,
          descuentoSacoArena: 0,
          soldaduraSacoArena: 3,
          materialSacoArena: 'LAC900 AZUL 5010',
        },
      },
    }],
  };
}

/** Puertas Luz · AR.26.00374 (OF 0224722): apilable 276×409, paño único 279×429, faldón 15 (30), saco arena 276×22, 2 ventanas 130×30,8. */
export function pedidoLuz0374(): PedidoPuertas {
  const base = nuevaPuertaDeCliente('puertasluz', 'apilable');
  const pie = 58.8; // 15 + 43,8
  const pasos = [43.8, 43.8, 43.8, 43.8, 43.8, 43.8, 43.8];
  const alturas = [pie, ...pasos.reduce<number[]>((acc, paso) => [...acc, Number(((acc.at(-1) ?? pie) + paso).toFixed(2))], [])];
  const xsCintas = [39.5, 228.5];
  return {
    schemaVersion: 1,
    kind: 'puertas',
    orderCode: 'AR2600374',
    cabecera: { cliente: 'FABRICADOS LA SELVA PUERTAS LUZ, S.L.', fecha: '30/01/2026', clienteRps: { codigo: '052082', nombre: 'FABRICADOS LA SELVA PUERTAS LUZ, S.L.' } },
    elementos: [{
      id: 'p1',
      input: {
        ...base,
        of: '0224722',
        frente: 276,
        alto: 409,
        cantidad: 1,
        material: 'LAC900',
        color: 'BLANCO',
        materialSaco: 'LAC900 AMARILLO',
        sacoDiagonalesAmarillas: true,
        confirmada: true,
        ventanasConfirmadas: true,
        apilable: { ...base.apilable, pie, pasos, cabecera: 43.6, bolsillo: 24 },
        entradas: alturas.map((altura, i) => ({
          altura, diametro: 42 as const, largo: 276, alto: 12,
          huecos: i % 2 === 0 ? cintas(xsCintas, 12, 8, 7.5) : [],
        })),
        ventanas: [3, 4].map(tramo => ({
          x: 73, y: Number(((alturas[tramo - 1] + alturas[tramo]) / 2 - 15.4).toFixed(2)),
          ancho: 130, alto: 30.8, radio: 2, radioCristal: 4, tramo,
        })),
        puertasluz: {
          ...base.puertasluz!,
          variante: 'apilable',
          altoFaldon: 15,
          extraAnchoFaldon: 0,
          bajoEt: 8,
          pestana3: true,
          anchoEt: 12,
          cintaAncho: 8,
          cintaAlto: 7.5,
          sacoArena: true,
          descuentoSacoArena: 0,
          soldaduraSacoArena: 3,
          materialSacoArena: 'LAC900 BLANCO',
        },
      },
    }],
  };
}

/** Puertas Luz · AR.26.00326 (OF 0224623): enrollable de lona 342×450 ×4, BD 4,5, E.T. 9, ventana 312×56, faldón 15 (30) y saco arena 342×22. */
export function pedidoLuz0326(): PedidoPuertas {
  const base = nuevaPuertaDeCliente('puertasluz', 'enrollable');
  return {
    schemaVersion: 1,
    kind: 'puertas',
    orderCode: 'AR2600326',
    cabecera: { cliente: 'FABRICADOS LA SELVA PUERTAS LUZ, S.L.', fecha: '28/01/2026', clienteRps: { codigo: '052082', nombre: 'FABRICADOS LA SELVA PUERTAS LUZ, S.L.' } },
    elementos: [{
      id: 'p1',
      input: {
        ...base,
        of: '0224623',
        frente: 342,
        alto: 450,
        cantidad: 4,
        material: 'LAC900',
        color: 'BLANCO',
        materialSaco: 'LAC900 AMARILLO',
        sacoDiagonalesAmarillas: true,
        confirmada: true,
        ventanasConfirmadas: true,
        enrollable: { ...base.enrollable, ventanasPequenas: true, sinVentanal: false },
        entradas: [
          { altura: 99.5, diametro: 42 as const, largo: 342, alto: 9, huecos: [] },
          { altura: 200, diametro: 42 as const, largo: 342, alto: 9, huecos: [] },
        ],
        ventanas: [{ x: 15, y: 124, ancho: 312, alto: 56, radio: 2, radioCristal: 4 }],
        puertasluz: {
          ...base.puertasluz!,
          variante: 'enrollable',
          cabecera: 'bd',
          altoFaldon: 15,
          extraAnchoFaldon: 0,
          bajoEt: 0,
          pestana3: false,
          anchoEt: 9,
          sacoArena: true,
          descuentoSacoArena: 0,
          soldaduraSacoArena: 3,
          materialSacoArena: 'LAC900 BLANCO',
        },
      },
    }],
  };
}

/** Puertas Luz · AR.26.04660 (OF 0232361): enrollable transparente 207×320, margen 6, 3 tramos cristal 199, saco 350 210×70, saco arena 201×22. */
export function pedidoLuz4660(): PedidoPuertas {
  const base = nuevaPuertaDeCliente('puertasluz', 'enrollable-transparente');
  return {
    schemaVersion: 1,
    kind: 'puertas',
    orderCode: 'AR2604660',
    cabecera: { cliente: 'FABRICADOS LA SELVA PUERTAS LUZ, S.L.', fecha: '18/09/2026', clienteRps: { codigo: '052082', nombre: 'FABRICADOS LA SELVA PUERTAS LUZ, S.L.' } },
    elementos: [{
      id: 'p1',
      input: {
        ...base,
        of: '0232361',
        frente: 207,
        alto: 320,
        cantidad: 1,
        material: 'LAC900',
        color: 'BLANCO 9016',
        materialSaco: 'LAC900 AMARILLO',
        sacoDiagonalesAmarillas: true,
        confirmada: true,
        ventanasConfirmadas: true,
        puertasluz: {
          ...base.puertasluz!,
          variante: 'transparente',
          cabecera: 'varilla',
          altoFaldon: 35,
          extraAnchoFaldon: 3,
          anchoEt: 9,
          sacoArena: true,
          descuentoSacoArena: 6,
          soldaduraSacoArena: 5,
          materialSacoArena: 'LAC900 BLANCO 9016',
          margenLateral: 6,
          tramosTransparentes: [92, 88, 59.5],
        },
      },
    }],
  };
}

/** Puertas Luz · AR.26.03463 (OF 0230402): enrollable transparente 373×460, margen 15, 5 tramos cristal 347, saco 350 376×70, saco arena 367×22. */
export function pedidoLuz3463(): PedidoPuertas {
  const base = nuevaPuertaDeCliente('puertasluz', 'enrollable-transparente');
  return {
    schemaVersion: 1,
    kind: 'puertas',
    orderCode: 'AR2603463',
    cabecera: { cliente: 'FABRICADOS LA SELVA PUERTAS LUZ, S.L.', fecha: '09/07/2026', clienteRps: { codigo: '052082', nombre: 'FABRICADOS LA SELVA PUERTAS LUZ, S.L.' } },
    elementos: [{
      id: 'p1',
      input: {
        ...base,
        of: '0230402',
        frente: 373,
        alto: 460,
        cantidad: 1,
        material: 'LAC900',
        color: 'BLANCO',
        materialSaco: 'LAC900 AMARILLO',
        sacoDiagonalesAmarillas: true,
        confirmada: true,
        ventanasConfirmadas: true,
        puertasluz: {
          ...base.puertasluz!,
          variante: 'transparente',
          cabecera: 'varilla',
          altoFaldon: 35,
          extraAnchoFaldon: 3,
          anchoEt: 9,
          sacoArena: true,
          descuentoSacoArena: 6,
          soldaduraSacoArena: 5,
          materialSacoArena: 'LAC900 BLANCO',
          margenLateral: 15,
          tramosTransparentes: [124.6, 55.6, 55.6, 55.6, 56.1],
        },
      },
    }],
  };
}
