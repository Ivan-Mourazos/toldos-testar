import type { HojaTelasDatos } from './tipos';

// `hoja-telas.html?muestra=cortina` en desarrollo: la hoja sin pasar por el servidor. Datos sacados
// de buildFabricSheetPages con pedidos de prueba; «largas» lleva observaciones que no caben.
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

export function datosMuestra(nombre: string): HojaTelasDatos {
  const datos = MUESTRAS[nombre];
  if (!datos) throw new Error(`No hay muestra «${nombre}». Hay: ${Object.keys(MUESTRAS).join(', ')}.`);
  return datos;
}
