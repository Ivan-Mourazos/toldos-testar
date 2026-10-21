import { calcularPuerta, nuevaPuerta } from '../src/puertas/calcular.ts';
import { generarCortePuertas } from '../src/puertas/corte.ts';

const fmt = n => Number(n.toFixed(2)).toLocaleString('es-ES');

function configurarPedido(codigo) {
  if (codigo === 'AR2604638') {
    const p = {
      ...nuevaPuerta('PUERTAENR'),
      frente: 172,
      alto: 314,
      of: '0232309',
      cantidad: 1,
      material: 'LAC900',
      color: 'BLANCO 9016',
      materialCristal: 'TRANSP. 1000MI',
      materialSaco: 'SACO 900 GR NEGRO',
      rollo: 300,
      rolloCristal: 140,
      rolloSaco: 300,
      margenMarcas: 1.5,
      confirmada: true,
      ventanasConfirmadas: true,
      observaciones: 'SERIGRAFÍA DE LOGO DE XPUERTAS EN COLOR NEGRO (21 × 6 CM EN PAÑO INFERIOR)',
      enrollable: { T: 123, D: 60, margen: 6, sacoPartido: false, empates: [] },
      entradas: [60, 131, 191].map(altura => ({ altura, diametro: 30, largo: 172, alto: 8, huecos: [] })),
    };
    return { schemaVersion: 1, kind: 'puertas', orderCode: codigo, elementos: [{ id: 'puerta-1', input: p }] };
  }
  if (codigo === 'AR2604725') {
    const p = {
      ...nuevaPuerta('PUERTAENR'),
      articuloOrigen: 'PUERTAPLE',
      frente: 474,
      alto: 430,
      of: '0232504',
      cantidad: 1,
      material: 'LAC900',
      color: 'GRIS 7038',
      materialCristal: 'TRANSP. 1000MI',
      materialSaco: 'SACO 900 GR NEGRO',
      rollo: 300,
      rolloCristal: 140,
      rolloSaco: 300,
      margenMarcas: 1.5,
      confirmada: true,
      ventanasConfirmadas: true,
      observaciones: 'RPS indica PUERTAPLE; dibujo del cliente: enrollable 474 × 430 con entrada adicional sobre ventana a 189 cm de arriba (241 cm desde abajo).',
      enrollable: { T: 239, D: 60, margen: 11, sacoPartido: true, empates: [] },
      entradas: [60, 131, 191, 241].map(altura => ({ altura, diametro: 30, largo: 474, alto: 8, huecos: [] })),
    };
    return { schemaVersion: 1, kind: 'puertas', orderCode: codigo, elementos: [{ id: 'puerta-1', input: p }] };
  }
  if (codigo === 'AR2605134') {
    const p = {
      ...nuevaPuerta('PUERTAENR'),
      frente: 212,
      alto: 360,
      of: '0233175',
      cantidad: 3,
      material: 'LAC900',
      color: 'AZUL 5002',
      materialCristal: 'TRANSP. 1000MI',
      materialSaco: 'SACO 900 GR NEGRO',
      rollo: 300,
      rolloCristal: 140,
      rolloSaco: 300,
      margenMarcas: 1.5,
      confirmada: true,
      ventanasConfirmadas: true,
      observaciones: 'SERIGRAFÍA DE LOGO DE CAIRENA EN COLOR BLANCO CENTRADO EN EL PAÑO INFERIOR (20 × 6 CM)',
      enrollable: { T: 169, D: 60, margen: 6, sacoPartido: false, empates: [] },
      entradas: [60, 131, 191].map(altura => ({ altura, diametro: 30, largo: 212, alto: 8, huecos: [] })),
    };
    return { schemaVersion: 1, kind: 'puertas', orderCode: codigo, elementos: [{ id: 'puerta-1', input: p }] };
  }
  throw new Error(`Pedido no reconocido: ${codigo}`);
}

// Referencias en cm. NO se leen aquí: AR2604638 y AR2604725 son las medidas que Codex leyó de sus DXF del bot
// (tmp/dxf-estudio/puertas/plegables/verificacion/verificacion.md y genericas/contraste.md, comprobadas el
// 21/10/2026). AR2605134 aún no tiene corte hecho: sus referencias son las cuentas de su PDF, así que su fila
// solo comprueba que la web aplica las reglas, no que coincida con un corte real.
const referenciaBot = {
  AR2604638: {
    variante: 'Solo lleva un paño encima del cristal (T = 123 cm sin tubo intermedio superior)',
    piezas: [
      { nombre: 'Paño superior', ancho: 172, alto: 130.25, cantidad: 1, material: 'LAC900 BLANCO 9016', marcasY: [7.5, 123.25], textosDxf: 'A1 · 0232309 · REVÉS' },
      { nombre: 'Paño inferior', ancho: 172, alto: 123.75, cantidad: 1, material: 'LAC900 BLANCO 9016', marcasY: [2, 45.25, 116.25], textosDxf: 'A2 · 0232309 · REVÉS' },
      { nombre: 'Cristal del ventanal', ancho: 164, alto: 56.5, cantidad: 1, material: 'TRANSP. 1000MI', marcasY: [], textosDxf: 'TRANSP. 1000MI' },
      { nombre: 'Cachos laterales', ancho: 7, alto: 56.5, cantidad: 2, material: 'LAC900 BLANCO 9016', marcasY: [], textosDxf: '(en cabecera del paño)' },
      { nombre: 'Saco', ancho: 178.5, alto: 26, cantidad: 1, material: 'SACO 900 GR NEGRO', marcasY: [], textosDxf: 'SACO 900 GR NEGRO (pestaña 6,5 × 11 entre Y=13 y Y=24)' },
      { nombre: 'Entrada de tubo 1..3', ancho: 172, alto: 8, cantidad: 3, material: 'LAC900 BLANCO 9016', marcasY: [], textosDxf: '(3 tiras de 172 × 8)' },
    ],
  },
  AR2604725: {
    variante: 'Lleva una entrada de tubo encima de la ventana (a 50 cm sobre el ventanal y 189 cm del borde superior; T = 239 cm). En RPS figura como PUERTAPLE pero el dibujo es enrollable.',
    piezas: [
      { nombre: 'Paño superior', ancho: 474, alto: 246.25, cantidad: 1, material: 'LAC900 GRIS 7038', marcasY: [7.5, 50, 239.25], textosDxf: 'A1 · REVÉS' },
      { nombre: 'Paño inferior', ancho: 474, alto: 123.75, cantidad: 1, material: 'LAC900 GRIS 7038', marcasY: [2, 45.25, 116.25], textosDxf: 'A2 · REVÉS' },
      { nombre: 'Cristal del ventanal', ancho: 456, alto: 56.5, cantidad: 1, material: 'TRANSP. 1000MI', marcasY: [], textosDxf: 'TRANSP. 1000MI' },
      { nombre: 'Cachos laterales', ancho: 12, alto: 56.5, cantidad: 2, material: 'LAC900 GRIS 7038', marcasY: [], textosDxf: '(2 piezas de 12 × 56,5 giradas 56,5 × 12 en cabeza)' },
      { nombre: 'Saco partido · con pestaña', ancho: 241.25, alto: 26, cantidad: 1, material: 'SACO 900 GR NEGRO', marcasY: [], textosDxf: 'SACO 900 GR NEGRO · unión «1» (pestaña 6,5 × 11)' },
      { nombre: 'Saco partido · sin pestaña', ancho: 241.25, alto: 26, cantidad: 1, material: 'SACO 900 GR NEGRO', marcasY: [], textosDxf: 'SACO 900 GR NEGRO · unión «1»' },
      { nombre: 'Entrada de tubo 1..4', ancho: 474, alto: 8, cantidad: 4, material: 'LAC900 GRIS 7038', marcasY: [], textosDxf: '(4 tiras de 474 × 8)' },
    ],
  },
  AR2605134: {
    variante: '3 puertas enrollables iguales (212 × 360 cm, OF 0233175, Azul 5002) configuradas desde su PDF escaneado; sin corte manual previo.',
    piezas: [
      { nombre: 'Paño superior', ancho: 212, alto: 176.25, cantidad: 3, material: 'LAC900 AZUL 5002', marcasY: [7.5, 169.25], textosDxf: 'PDF: T = 169 → 169 + 7,25 = 176,25' },
      { nombre: 'Paño inferior', ancho: 212, alto: 123.75, cantidad: 3, material: 'LAC900 AZUL 5002', marcasY: [2, 45.25, 116.25], textosDxf: 'PDF: 360 − 169 − 60 − 7,25 = 123,75' },
      { nombre: 'Cristal del ventanal', ancho: 204, alto: 56.5, cantidad: 3, material: 'TRANSP. 1000MI', marcasY: [], textosDxf: 'PDF: (212 − 2×6 + 4) × (60 − 3,5)' },
      { nombre: 'Cachos laterales', ancho: 7, alto: 56.5, cantidad: 6, material: 'LAC900 AZUL 5002', marcasY: [], textosDxf: 'PDF: (6 + 1) × 56,5 · 2 por puerta × 3 puertas' },
      { nombre: 'Saco', ancho: 218.5, alto: 26, cantidad: 3, material: 'SACO 900 GR NEGRO', marcasY: [], textosDxf: 'PDF: (212 + 6,5) × 26 con pestaña 6,5 × 11' },
      { nombre: 'Entrada de tubo 1..3', ancho: 212, alto: 8, cantidad: 9, material: 'LAC900 AZUL 5002', marcasY: [], textosDxf: 'PDF: 3 tiras de 212 × 8 por puerta × 3 puertas' },
    ],
  },
};

for (const codigo of ['AR2604638', 'AR2604725', 'AR2605134']) {
  const pedido = configurarPedido(codigo);
  const res = calcularPuerta(pedido.elementos[0].input);
  const corte = generarCortePuertas(pedido);
  const ref = referenciaBot[codigo];

  console.log(`\n### ${codigo} (OF ${pedido.elementos[0].input.of})`);
  console.log(`- Variante: ${ref.variante}`);
  console.log('| Pieza | Web (cm) | Ref. DXF/PDF (cm) | Cant. (web / ref) | Marcas Y en web (cm) | Marcas Y en ref (cm) | Rótulo de corte en web | Estado |');
  console.log('|---|---|---|---|---|---|---|---|');

  const entradas = res.piezas.filter(p => p.clase === 'entrada');
  const otras = res.piezas.filter(p => p.clase !== 'entrada');
  const filasWeb = [
    ...otras,
    ...(entradas.length
      ? [
          {
            ...entradas[0],
            nombre: `Entrada de tubo 1..${entradas.length}`,
            cantidad: entradas.reduce((s, e) => s + e.cantidad, 0),
          },
        ]
      : []),
  ];

  for (let i = 0; i < filasWeb.length; i++) {
    const w = filasWeb[i];
    const r = ref.piezas[i];
    const marcasWeb = w.marcas
      .filter(s => Math.abs(s[2] - s[0]) > w.ancho / 2)
      .map(s => s[1])
      .sort((a, b) => a - b);
    const rotulos = corte.cortes
      .flatMap(c => c.entidades.textos)
      .filter(t => t.centrado)
      .map(t => t.valor);
    const rotuloMuestra =
      w.clase === 'pano'
        ? rotulos.find(v => v.includes(/superior/i.test(w.nombre) ? 'ARRIBA' : 'ABAJO'))
        : w.clase === 'cristal'
          ? 'CRISTAL · ' + w.of + ' · REVÉS'
          : w.clase === 'cacho'
            ? 'CACHO · ' + w.of + ' · REVÉS'
            : w.clase === 'saco'
              ? 'SACO · ' + w.of + ' · REVÉS'
              : 'ENTRADA 1 · ' + w.of + ' · REVÉS';
    const ok =
      Math.abs(w.ancho - r.ancho) < 0.01 &&
      Math.abs(w.alto - r.alto) < 0.01 &&
      w.cantidad === r.cantidad &&
      JSON.stringify(marcasWeb) === JSON.stringify(r.marcasY);
    console.log(
      `| ${w.nombre} | ${fmt(w.ancho)} × ${fmt(w.alto)} | ${fmt(r.ancho)} × ${fmt(r.alto)} | ${w.cantidad} / ${r.cantidad} | ${marcasWeb.length ? marcasWeb.map(fmt).join('; ') : '—'} | ${r.marcasY.length ? r.marcasY.map(fmt).join('; ') : '—'} | \`${rotuloMuestra}\` | ${ok ? 'Coincide' : 'Difiere'} |`,
    );
  }
}
