import type { FilaDespiece, HojaEstructuraDatos, HojaPlanteamiento, HojaTelasDatos } from './tipos';

// `hoja-telas.html?muestra=cortina` en desarrollo: la hoja sin pasar por el servidor. Datos sacados
// de buildFabricSheetPages y buildStructureSheetPages con pedidos de prueba; «largas» lleva
// observaciones que no caben. Las de estructura empiezan por «estructura».
const MUESTRAS: Record<string, HojaTelasDatos> = {
  cortina: {
    planIndex: 0,
    header: {
      of: '0232626',
      orderCode: 'AR2603332',
      customer: 'COMERCIAL TOLDOS DEL NOROESTE S.L.',
      technician: 'IVÁN',
      reviewer: '—',
      date: '02/10/2026',
      title: 'PLANTEAMIENTO DE TELAS'
    },
    diagramTitle: 'CORTINA',
    rotulacion: {
      tela: 'NO',
      bamba: 'NO'
    },
    datos: {
      material: 'ACR NEGRO 2170 :120 AN',
      curva: 'SIN BAMBA',
      remate: '—'
    },
    rows: [
      {
        letter: 'A',
        fabricWidth: '188,0',
        dropLabel: 'CAÍDA',
        fabricDrop: '315,0',
        units: '1',
        line: ''
      }
    ],
    total: {
      label: 'ACRILI2170P120 · ACR NEGRO 2170 :120 AN',
      amount: '6,3 ML'
    },
    notes: 'Cortina para terraza. Confirmar color del perfil con el cliente.',
    footer: 'Planteamiento de telas'
  },
  cambio: {
    planIndex: 0,
    header: {
      of: '0230194',
      orderCode: 'AR2603332',
      customer: 'COMERCIAL TOLDOS DEL NOROESTE S.L.',
      technician: 'IVÁN',
      reviewer: '—',
      date: '02/10/2026',
      title: 'PLANTEAMIENTO DE TELAS'
    },
    diagramTitle: 'CAMBIO DE TELA',
    rotulacion: {
      tela: 'NO',
      bamba: '—'
    },
    datos: {
      material: 'LONA PVC 580 BLANCO :250 AN',
      curva: 'SIN BAMBA',
      remate: '—'
    },
    rows: [
      {
        letter: 'A',
        fabricWidth: '337,0',
        dropLabel: 'SALIDA',
        fabricDrop: '265,0',
        units: '1',
        line: ''
      }
    ],
    total: {
      label: 'NS86BLANP250 · LONA PVC 580 BLANCO :250 AN',
      amount: '5,3 ML'
    },
    notes: '',
    footer: 'Planteamiento de telas'
  },
  varios: {
    planIndex: 0,
    header: {
      of: '0230194',
      orderCode: 'AR2603332',
      customer: 'COMERCIAL TOLDOS DEL NOROESTE S.L.',
      technician: 'IVÁN',
      reviewer: '—',
      date: '02/10/2026',
      title: 'PLANTEAMIENTO DE TELAS'
    },
    diagramTitle: 'ARZÚA PRO · GALICIA',
    rotulacion: {
      tela: 'NO',
      bamba: 'NO'
    },
    datos: {
      material: 'ACR NEGRO 2170 :120 AN',
      curva: 'RECTA',
      remate: 'COMO TELA'
    },
    rows: [
      {
        letter: 'A',
        fabricWidth: '326,2',
        dropLabel: 'SALIDA',
        fabricDrop: '300,0',
        units: '1',
        line: 'ARZUA PRO · BAMBALINA INCLUIDA DE 35CM, HECHA DE 30CM'
      },
      {
        letter: 'B',
        fabricWidth: '326,0',
        dropLabel: 'SALIDA',
        fabricDrop: '300,0',
        units: '1',
        line: 'GALICIA · BAMBALINA INCLUIDA DE 35CM, HECHA DE 30CM'
      },
      {
        letter: 'C',
        fabricWidth: '326,2',
        dropLabel: 'SALIDA',
        fabricDrop: '300,0',
        units: '1',
        line: 'ARZUA PRO · BAMBALINA INCLUIDA DE 35CM, HECHA DE 30CM'
      }
    ],
    total: {
      label: 'ACRILI2170P120 · ACR NEGRO 2170 :120 AN',
      amount: '27,0 ML'
    },
    notes: '',
    footer: 'Planteamiento de telas'
  }
};

// Un párrafo largo que se parte a media frase y luego muchas líneas sueltas.
const FRASE = 'Revisar con el cliente la medida exacta antes de cortar.';
const LARGAS = [
  `Párrafo largo: ${Array.from({ length: 12 }, () => FRASE).join(' ')}`,
  ...Array.from({ length: 60 }, (_, i) => `Línea ${i + 1} de observaciones: ${FRASE} ${FRASE}`)
].join('\n');
const fila = MUESTRAS.cambio.rows[0];
MUESTRAS.largas = { ...MUESTRAS.cambio, rows: [fila, { ...fila, letter: 'B' }], notes: LARGAS };
MUESTRAS.cuatro = { ...MUESTRAS.varios, rows: [...MUESTRAS.varios.rows, { ...fila, letter: 'D', line: `TELA LONA PVC 580 BLANCO :250 AN · NS86BLANP250 · BAMBALINA INCLUIDA DE 35CM, HECHA DE 30CM · CURVA ONDA · REMATE COMO TELA · ROT. TELA SÍ · ROT. BAMBA NO` }] };
// Una instrucción que ni a 7 pt cabe en dos líneas: sale cortada con el aviso del pedido.
MUESTRAS.nota = { ...MUESTRAS.cambio, rows: [{ ...fila, line: Array.from({ length: 14 }, (_, i) => `INSTRUCCIÓN ${i + 1} PARA EL TALLER`).join(' · ') }] };

const pieza = (num: number, name: string, reference: string, length = '—', bold = false, units = '1'): FilaDespiece => ({ num: String(num), name, reference, units, length, bold });
const cabecera = { orderCode: 'AR2603332', customer: 'COMERCIAL TOLDOS DEL NOROESTE S.L.', technician: 'IVÁN', reviewer: '—', date: '02/10/2026' };
const arzua: HojaEstructuraDatos = {
  kind: 'estructura',
  structureIndex: 0,
  header: { ...cabecera, of: '0230194', letter: 'A', model: 'ARZÚA PRO', device: 'MOTOR' },
  despiece: [
    pieza(1, 'JUEGO SOPORTE AROND', 'SOPAR350BL16'),
    pieza(2, 'TUBO DE ENROLLE P801', 'TURA80HG400C', '327,2', true),
    pieza(3, 'CASQUILLO PUNTA', 'CASPUNCEJE78MM'),
    pieza(4, 'TUBO DE CARGA EVO 80', 'PEVO80BL16500C', '327,2', true),
    pieza(5, 'KIT TAPONES EVO 80', 'TAPONEVO8BL16'),
    pieza(6, 'JUEGO DE BRAZOS ONYX', 'BONYXBL16225C', '225', true),
    pieza(7, 'JUEGO DE TERMINALES', 'TERMINEVOBL16'),
    pieza(8, 'RUEDA MOTRIZ A P-801 MECANIZADA', 'RUEDAMOT801MEC'),
    pieza(9, 'MOTOR SOMFY SUNILUS 55/17 IO', 'SUNILUSIO55//17', '—', true),
    pieza(10, 'CORONA ADAPTADA LT60 P-801', 'CORONALT60'),
    pieza(11, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO')
  ],
  rowsPerPage: 28,
  accessories: [{ name: 'MANDO SITUO 1 IO PURE', reference: 'SITUOIO1PURE', units: '1' }],
  anchoring: { name: 'NO INDICADO', reference: '—', units: '—' },
  partida: [['FRENTE', '337'], ['SALIDA TOLDO', '225'], ['UNIDADES', '1']],
  valid: true,
  detalles: [['LACADO', 'BLANCO'], ['DISPOSITIVO', 'MOTOR'], ['POSICIÓN MOTOR', 'M.F.DER'], ['COLOCACIÓN TOLDO', 'FRONTAL']],
  tela: [['TELA', '326,2'], ['SALIDA PAÑO', '300'], ['PAÑO', '9,0 ML']],
  notes: '',
  footer: 'Toldo A · Estructura'
};
const ESTRUCTURAS: Record<string, HojaEstructuraDatos> = {
  estructura: arzua,
  // Con máquina y sin accesorios: la etiqueta más larga de DETALLES y la fila de «—».
  'estructura-cortina': {
    ...arzua,
    header: { ...cabecera, of: '0232626', letter: 'A', model: 'CORTINA', device: 'MAQ. INTERIOR' },
    despiece: [
      pieza(1, 'JGO. SOPORTE UNIVERSAL 3 AGUJEROS', 'SOPUNI3AGUBL16'),
      pieza(2, 'TUBO DE ENROLLE P801', 'TURA80HG400C', '189', true),
      pieza(3, 'CASQUILLO PUNTA', 'CASPUNCEJE78MM'),
      pieza(4, 'CASQUILLO MAQUINA EJE 50MM Ø78', 'CASMAQEJE5078MM', '—', true),
      pieza(5, 'TUBO DE CARGA UNIVERS 280', 'PUNI280BL10400C', '189', true),
      pieza(6, 'KIT TAPONES UNIVERS 280', 'TAPOPLUN280BL16'),
      pieza(7, 'MÁQUINA MB-11 L-120 BLANCA', 'MAQMB11L12BLAN'),
      pieza(8, 'MANIVELA LUXE 170 BLANCA', 'MANIVEBL16170C', '170'),
      pieza(9, 'CADENILLAS INOX', '—', '—', false, '2'),
      pieza(10, 'PUENTE ABATIBLE: PLETINA', 'PLEACIN', '—', false, '2'),
      pieza(11, 'PUENTE ABATIBLE: ANILLA', 'ANIACIN', '—', false, '2'),
      pieza(12, 'MOSQUETONES INOX 60', 'MOSQBOACIN60MM', '—', false, '2'),
      pieza(13, 'KIT REGLETA ZAMAK', 'KITREGLETAZAMAK')
    ],
    accessories: [],
    partida: [['FRENTE', '200'], ['CAÍDA TOLDO', '275'], ['UNIDADES', '1']],
    detalles: [['LACADO', 'BLANCO'], ['DISPOSITIVO', 'MAQ. INTERIOR'], ['COLOCACIÓN MÁQUINA', 'M.F.DER'], ['COLOCACIÓN TOLDO', 'TECHO']],
    tela: [['TELA', '188'], ['CAÍDA PAÑO', '350'], ['PAÑO', '7,0 ML']]
  },
  // Un despiece que no cabe en una página (30 filas, 28 por página) y tres accesorios.
  'estructura-larga': {
    ...arzua,
    despiece: Array.from({ length: 30 }, (_, i) => ({ ...arzua.despiece[i % arzua.despiece.length], num: String(i + 1) })),
    accessories: [
      ...arzua.accessories,
      { name: 'SENSOR EOLIS 3D WIREFREE IO', reference: 'EOLIS3DIOBLANCO', units: '1' },
      { name: 'SENSOR SUNIS II IO', reference: 'SUNISIIIO', units: '1' }
    ],
    notes: 'Despiece largo: las observaciones van en la última página.'
  },
  // Observaciones de 40 líneas: no caben debajo del anclaje y siguen en otra página.
  'estructura-notas': {
    ...arzua,
    notes: [`Párrafo largo: ${Array.from({ length: 8 }, () => FRASE).join(' ')}`, ...Array.from({ length: 39 }, (_, i) => `Línea ${i + 2} de observaciones: ${FRASE}`)].join('\n')
  },
  'estructura-revisar': { ...arzua, valid: false, anchoring: { name: 'TACO QUÍMICO M10', reference: 'TACOQUIM10', units: '8' }, notes: 'COMPROBAR ANCLAJE' }
};

export function datosMuestra(nombre: string): HojaPlanteamiento {
  const datos = ESTRUCTURAS[nombre] ?? MUESTRAS[nombre];
  if (!datos) throw new Error(`No hay muestra «${nombre}». Hay: ${[...Object.keys(MUESTRAS), ...Object.keys(ESTRUCTURAS)].join(', ')}.`);
  return datos;
}
