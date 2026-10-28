// Edición y lectura del toldo: cada dato va a uno de los ocho grupos comunes
// por su etiqueta. Lo que no esté declarado cae en «Otros» y la prueba de paridad
// falla, así que ningún campo nuevo se queda sin sitio sin que nos enteremos.
export type ReadGroupId = 'medidas' | 'tela' | 'estructura' | 'accionamiento' | 'colocacion' | 'dibujo' | 'observaciones' | 'pie' | 'otros';

export const READ_GROUPS: Array<{ id: ReadGroupId; title: string }> = [
  { id: 'medidas', title: 'Medidas' },
  { id: 'tela', title: 'Tela y bamba' },
  { id: 'estructura', title: 'Estructura' },
  { id: 'accionamiento', title: 'Accionamiento' },
  { id: 'colocacion', title: 'Colocación' },
  { id: 'dibujo', title: 'Dibujo de confección' },
  { id: 'observaciones', title: 'Observaciones y excepción técnica' },
  { id: 'pie', title: 'Notas' },
  { id: 'otros', title: 'Otros' }
];

// Las etiquetas tal cual las pinta AwningColumn.
const byLabel: Record<string, ReadGroupId> = {
  // Medidas (Frente y Salida cambian de nombre en Antica, Selena y Electra)
  OF: 'medidas', Frente: 'medidas', 'Frente tela terminada': 'medidas', 'Frente de tela': 'medidas',
  Salida: 'medidas', Caída: 'medidas', 'Caída tela terminada': 'medidas', 'Caída de tela': 'medidas', 'Salida base': 'medidas', 'Salida brazo': 'medidas',
  'Bamba (cm)': 'medidas', 'Alto terminado (cm)': 'medidas', 'Altura instalación': 'medidas',
  'Hueco escuadrado': 'medidas', 'Frente superior': 'medidas', 'Salida izquierda': 'medidas', 'Frente inferior': 'medidas',
  'Salida derecha': 'medidas', 'Diagonal 1 (a salida izq.)': 'medidas', 'Diagonal 2 (a salida der.)': 'medidas',
  'Salida ventana': 'medidas', Esquina: 'medidas', 'Suelo-ventana': 'medidas', 'Altura ventana': 'medidas',
  'Tubo-ventana': 'medidas', 'Medida a ventana desde': 'medidas', 'Ajuste de salida de tela': 'medidas', 'Ajuste de salida (cm)': 'medidas',
  Laterales: 'estructura',
  'Cara del velcro': 'estructura', 'Lado del velcro': 'estructura', 'Color del velcro': 'estructura',
  'Ancho velcro (cm)': 'estructura', 'Alto velcro (cm)': 'estructura',
  'Confección solapas': 'medidas',
  'Forma del embudo': 'medidas', 'Alto del embudo (cm)': 'medidas', 'Contorno (cm)': 'medidas',
  Cantidad: 'medidas',
  'Contorno de arriba (cm)': 'medidas', 'Contorno de abajo (cm)': 'medidas', 'Cierre (cm)': 'medidas',
  'Remate de arriba': 'tela', 'Remate de abajo': 'tela', 'Bastilla de arriba (cm)': 'tela', 'Bastilla de abajo (cm)': 'tela',
  'Sujeción del embudo': 'tela', 'Ancho de cinta (mm)': 'tela', 'Largo de cinta (cm)': 'tela',
  'Altura soporte-brazo (cm)': 'medidas', 'Medida de caída': 'medidas', 'Sumar a la caída (cm)': 'medidas', 'Sumado a la caída': 'medidas', 'Ajuste de tela (cm)': 'medidas', 'Ajuste de tela': 'medidas', 'Sumar para enrolle y tubo (cm)': 'medidas',
  // Estructura
  Lacado: 'estructura', Variante: 'estructura', 'Configuración de brazos': 'estructura',
  'Terminales · confirmar con taller': 'estructura',
  'Nº de brazos': 'estructura', 'Nº brazos': 'estructura', 'Tubo de carga': 'estructura', Soporte: 'estructura',
  'Configuración Antica': 'estructura', 'Posición de trabajo': 'estructura', 'Tipo de guía': 'estructura',
  'Fijación de la guía': 'estructura', 'Forma del cofre': 'estructura', 'Secur Wind Block': 'estructura',
  'Color mecanismos': 'estructura', 'Color cadena': 'estructura', Arriba: 'estructura', Abajo: 'estructura',
  'Empate indicado por cliente': 'estructura', 'Cara hacia el interior (ventana)': 'estructura',
  'Dibujo de confección': 'estructura', 'Tipo de soporte': 'estructura', 'Para capota': 'estructura',
  // Estructura: suplemento del dibujo de confección
  'Sujeción del suplemento': 'estructura', 'Indicar sujeción': 'estructura', 'Distancia entre broches (cm)': 'estructura',
  'Solape sobre la onda (cm)': 'estructura', 'Remate inferior': 'estructura', 'Indicar remate': 'estructura',
  'Bastilla de unión (cm)': 'estructura', 'Bastilla lateral (cm)': 'estructura', 'Bastilla inferior (cm)': 'estructura',
  // Estructura: excepción técnica (reglas modificadas)
  'Descuento inferior tela (cm)': 'estructura', 'Descuento frente tela (cm)': 'estructura',
  'Descuento tubo enrollamiento (cm)': 'estructura', 'Descuento Univers 280 (cm)': 'estructura',
  'Descuento Univers 270 (cm)': 'estructura', 'Frente mínimo (cm)': 'estructura', 'Frente máximo (cm)': 'estructura',
  'Descuento kit perfiles (cm)': 'estructura', 'Descuento protector lona (cm)': 'estructura',
  'Descuento tubo de carga (cm)': 'estructura', 'Nº de brazos manual': 'estructura', 'Nº de soportes': 'estructura',
  'Margen bajada vertical (cm)': 'estructura', 'Factor diagonal de paño': 'estructura', 'Margen fijo de paño (cm)': 'estructura',
  'Descuento P801 (cm)': 'estructura', 'Descuento EVO 80 (cm)': 'estructura', 'Descuento barra de carga (cm)': 'estructura', 'Lado del brazo suelto': 'estructura', 'Descuento barra 40×40 (cm)': 'estructura',
  'Margen caída tela (cm)': 'estructura', 'Descuento tubo P801 (cm)': 'estructura', 'Descuento perfil de carga (cm)': 'estructura',
  'Descuento perfil de cofre (cm)': 'estructura', 'Descuento guía sobre caída (cm)': 'estructura',
  'Ajuste de frente (cm)': 'estructura', 'Margen de caída (cm)': 'estructura', 'Remate de bamba (cm)': 'estructura',
  // Accionamiento («Motor» es el de la excepción técnica)
  Dispositivo: 'accionamiento', 'Motor Electra': 'accionamiento', Motor: 'accionamiento', Sensor: 'accionamiento',
  'Posición motor': 'accionamiento', 'Lado máquina': 'accionamiento', 'Color manivela': 'accionamiento',
  'Altura manivela': 'accionamiento',
  // Colocación y tela
  Colocación: 'colocacion', 'Tipo de pared': 'colocacion', Tela: 'colocacion', 'Tela bamba': 'colocacion',
  'Curva bamba': 'colocacion', Remate: 'colocacion', 'Color remate': 'colocacion',
  'Rotulación tela': 'colocacion', 'Rotulación bamba': 'colocacion', Ventana: 'colocacion',
  'Ventana de cristal': 'colocacion', Telón: 'colocacion', Confección: 'colocacion'
};

// Etiquetas con un número dentro: «Nº brazos · mínimo 3», «Restar 10 cm abajo».
const byPattern: Array<[RegExp, ReadGroupId]> = [
  [/^Nº brazos · /, 'estructura'],
  [/^Restar .+ cm abajo$/, 'estructura'],
  [/^Solapa [A-Z0-9]+ · /, 'medidas']
];

// Unidad de cada valor en la ficha («285 cm»): las medidas en cm que no la llevan ya en la
// etiqueta. Las que sí («Bamba (cm)») se leen sin repetirla: «Bamba (cm) · 30». La usan los
// campos al leer y la prueba de paridad.
const cmLabels = new Set([
  'Frente', 'Frente tela terminada', 'Frente de tela', 'Salida', 'Caída', 'Caída tela terminada', 'Caída de tela', 'Salida base', 'Salida brazo',
  'Frente superior', 'Salida izquierda', 'Frente inferior', 'Salida derecha',
  'Diagonal 1 (a salida izq.)', 'Diagonal 2 (a salida der.)', 'Altura instalación',
  'Salida ventana', 'Esquina', 'Suelo-ventana', 'Tubo-ventana', 'Altura ventana', 'Altura manivela'
]);

export function readUnitOf(label: string) {
  const clean = label.trim();
  return cmLabels.has(clean) ? 'cm' : '';
}

export function readGroupOf(label: string): ReadGroupId {
  const clean = label.trim();
  if (['Tela', 'Tela bamba', 'Curva bamba', 'Remate', 'Color remate', 'Rotulación tela', 'Rotulación bamba', 'Empate indicado por cliente', 'Cara hacia el interior (ventana)'].includes(clean)) return 'tela';
  if (clean === 'Dibujo de confección') return 'dibujo';
  if (['Sujeción del suplemento', 'Indicar sujeción', 'Distancia entre broches (cm)', 'Solape sobre la onda (cm)', 'Remate inferior', 'Indicar remate', 'Bastilla de unión (cm)', 'Bastilla lateral (cm)', 'Bastilla inferior (cm)'].includes(clean)) return 'tela';
  if (clean.startsWith('Obs. ')) return 'observaciones';
  if (['Altura instalación', 'Color cadena', 'Color mecanismos'].includes(clean)) return 'accionamiento';
  if (['Altura soporte-brazo (cm)', 'Salida ventana', 'Esquina', 'Suelo-ventana', 'Tubo-ventana', 'Altura ventana', 'Medida a ventana desde', 'Ventana', 'Ventana de cristal', 'Telón', 'Confección'].includes(clean)) return 'estructura';
  return byLabel[clean] || byPattern.find(([pattern]) => pattern.test(clean))?.[1] || 'otros';
}

export function readGroupOrder(id: ReadGroupId) {
  return READ_GROUPS.findIndex((group) => group.id === id) * 2 + 2;
}
