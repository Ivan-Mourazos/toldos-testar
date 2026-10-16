import React, { Children, Fragment, isValidElement } from 'react';
import type { Awning } from '../types';
import { READ_GROUPS, readGroupOf } from '../readGroups';
import type { ReadGroupId } from '../readGroups';
import { repartirFilas } from '../awningFormLayout';
import { IrisSquaringDiagram } from './IrisSquaringDiagram';

type Item = { key: string; node: React.ReactNode; label: string; group: ReadGroupId; minimum: number; after?: string; start?: boolean };
type NodeProps = { children?: React.ReactNode; label?: string; className?: string; role?: string; part?: string; 'aria-label'?: string; 'data-form-group'?: ReadGroupId };

const orden = [
  'OF', 'Frente', 'Frente de tela', 'Salida', 'Caída', 'Salida brazo', 'Caída de tela', 'Alto terminado (cm)', 'Bamba (cm)',
  'Ajuste de tela (cm)', 'Ajuste de salida de tela', 'Ajuste de salida (cm)', 'Sumar para enrolle y tubo (cm)', 'Sumar a la caída (cm)',
  'Tela', 'Rotulación tela', 'Curva bamba', 'Tela bamba', 'Remate', 'Color remate', 'Rotulación bamba',
  'Empate indicado por cliente', 'Cara hacia el interior (ventana)',
  'Variante', 'Configuración Antica', 'Altura soporte-brazo (cm)', 'Posición de trabajo', 'Configuración de brazos',
  'Terminales · confirmar con taller', 'Nº de brazos', 'Nº brazos', 'Lado del brazo suelto', 'Tubo de carga', 'Soporte', 'Tipo de soporte',
  'Tipo de guía', 'Fijación de la guía', 'Forma del cofre', 'Secur Wind Block', 'Telón', 'Lacado',
  'Ventana', 'Confección', 'Laterales', 'Abajo', 'Arriba',
  'Dispositivo', 'Color cadena', 'Altura instalación', 'Color mecanismos', 'Motor', 'Motor Electra', 'Sensor', 'Posición motor', 'Lado máquina', 'Color manivela', 'Altura manivela',
  'Colocación', 'Tipo de pared', 'Dibujo de confección',
  'Sujeción del suplemento', 'Indicar sujeción', 'Distancia entre broches (cm)', 'Solape sobre la onda (cm)',
  'Remate inferior', 'Indicar remate', 'Bastilla de unión (cm)', 'Bastilla lateral (cm)', 'Bastilla inferior (cm)',
  'Obs. estructura', 'Obs. tela'
];

const amplios = new Set([
  'Tela', 'Tela bamba', 'Variante', 'Configuración Antica', 'Posición de trabajo', 'Configuración de brazos',
  'Terminales · confirmar con taller', 'Tubo de carga', 'Soporte', 'Tipo de soporte', 'Laterales', 'Abajo', 'Arriba', 'Ventana', 'Confección',
  'Empate indicado por cliente', 'Cara hacia el interior (ventana)', 'Telón', 'Dibujo de confección', 'Ajuste de salida de tela', 'Ajuste de salida (cm)',
  'Sumar para enrolle y tubo (cm)', 'Diagonal 1 (a salida izq.)', 'Diagonal 2 (a salida der.)',
  'Sujeción del suplemento', 'Indicar sujeción', 'Indicar remate', 'Distancia entre broches (cm)', 'Solape sobre la onda (cm)', 'Remate inferior'
]);

function prioridad(label: string, model: string) {
  if (model === 'CAMBIO ANTICA' && label === 'Configuración Antica') return -1;
  if (model === 'IRIS') {
    const iris = ['OF', 'Variante', 'Hueco escuadrado', 'Frente superior', 'Salida izquierda', 'Frente inferior', 'Salida derecha', 'Diagonal 1 (a salida izq.)', 'Diagonal 2 (a salida der.)', 'Ajuste de tela (cm)'];
    if (iris.includes(label)) return iris.indexOf(label) - 100;
  }
  if (model === 'HERA' && label === 'Variante') return -1;
  if (model === 'HERA' && label === 'Arriba') return 0;
  if (model === 'HERA' && label === 'Abajo') return 1;
  if (model === 'CAMBIO CORTINA' && label === 'Arriba') return orden.indexOf('Ventana') + 0.1;
  if (/^Nº brazos ·/.test(label)) return orden.indexOf('Nº brazos');
  if (label === 'Ajuste de salida de tela' || label === 'Ajuste de salida (cm)') return orden.indexOf('Ventana') + 0.5;
  if (label === 'Salida ventana' || label === 'Medida a ventana desde' || label === 'Esquina' || label === 'Suelo-ventana' || label === 'Tubo-ventana' || label === 'Altura ventana') return orden.indexOf('Ventana') + 0.25;
  const index = orden.indexOf(label);
  return index < 0 ? 1000 : index;
}

// Se separan solo los envoltorios de presentación: los controles y sus callbacks
// se conservan. La misma lista ordenada sirve al editar y al leer la ficha.
export function AwningFormBody({ reading, awning, children }: { reading: boolean; awning: Awning; children: React.ReactNode }) {
  const items: Item[] = [];
  function recoger(nodes: React.ReactNode, path = '') {
    Children.forEach(nodes, (node, index) => {
      if (!isValidElement<NodeProps>(node)) return;
      const props = node.props;
      const key = `${path}/${node.key ?? index}`;
      if (props.className === 'awning-form-section-title') return;
      if (props.label) {
        const label = props.label;
        const group = awning.model === 'IRIS' && label === 'Variante' ? 'medidas' : readGroupOf(label);
        const minimum = label.startsWith('Obs. ') || amplios.has(label) ? 6 : 3;
        items.push({ key: `campo:${label}`, node, label, group, minimum });
      } else if (node.type === IrisSquaringDiagram) {
        items.push({ key: `iris:${props.part}`, node, label: '', group: 'medidas', minimum: 12 });
      } else if (props['data-form-group']) {
        items.push({ key: `bloque:${props['data-form-group']}`, node, label: '', group: props['data-form-group'], minimum: 12 });
      } else if (props.className === 'curtain-window-measures') {
        recoger(props.children, key);
      } else if (props.role === 'alert' || props.role === 'status') {
        const after = props.className?.includes('model-switch-prompt') ? 'Nº de brazos'
          : props.className?.includes('awning-row-warn') ? 'OF'
          : props.className?.includes('drawing-choice-missing') ? 'Dibujo de confección'
          : items.at(-1)?.label;
        items.push({ key: `aviso:${props.className || after}`, node, label: '', group: 'pie', minimum: 12, after });
      } else if (node.type === Fragment || (node.type === 'div' && !props.role && !props.className?.includes('drawing-choice-missing'))) {
        recoger(props.children, key);
      } else {
        items.push({ key, node, label: '', group: 'pie', minimum: 12 });
      }
    });
  }
  recoger(children);

  // Excepciones aprobadas: el ajuste abre la fila textil si las cuatro medidas
  // llenan la primera. El dibujo comparte Colocación, o Tela si no hay montaje.
  const medidas = items.filter(item => item.group === 'medidas' && !item.label.startsWith('Ajuste'));
  const ventanaConReferencia = items.some(item => item.label === 'Medida a ventana desde');
  for (const item of items) {
    // La referencia ocupa media fila y las tres cotas la otra media, también
    // después de eliminar el antiguo envoltorio de las medidas de ventana.
    if (ventanaConReferencia) {
      if (item.label === 'Medida a ventana desde') item.minimum = 6;
      if (['Esquina', 'Suelo-ventana', 'Tubo-ventana', 'Altura ventana'].includes(item.label)) item.minimum = 2;
    }
    if (item.label === 'Ajuste de tela (cm)' && awning.model !== 'IRIS' && medidas.reduce((sum, field) => sum + field.minimum, 0) >= 12) item.group = 'tela';
    // El ajuste depende de Ventana: aparece detrás, sin mover el control pulsado.
    if (['Ajuste de salida de tela', 'Ajuste de salida (cm)'].includes(item.label)) item.group = 'estructura';
    if (item.label === 'Dibujo de confección') item.group = items.some(field => field.group === 'colocacion') ? 'colocacion' : 'tela';
    if (awning.model === 'CAMBIO TELA' && item.label === 'Sumar para enrolle y tubo (cm)') { item.group = 'tela'; item.minimum = 3; }
    if (awning.model === 'CAMBIO ANTICA' && ['Configuración Antica', 'Sumar a la caída (cm)'].includes(item.label)) item.group = 'tela';
    if (awning.model === 'HERA' && ['Arriba', 'Abajo'].includes(item.label)) item.minimum = 3;
    if (awning.model === 'IRIS' && item.label.startsWith('Diagonal ')) item.minimum = 4;
    if (awning.model === 'IRIS') {
      if (item.label === 'Forma del cofre') item.minimum = 4;
      if (item.label === 'Secur Wind Block') item.minimum = 2;
    }
    // Variante, soporte y lacado llenan una fila; Ventana y Confección usan
    // después media fila cada una para que sus opciones sigan legibles.
    if (awning.model === 'ELECTRA') {
      if (item.label === 'Variante') item.minimum = 4;
      if (item.label === 'Tipo de soporte') item.minimum = 5;
    }
    // Las tres opciones de cabecera de las cortinas caben juntas (5 + 3 + 4).
    // Ventana conserva así una fila compartida antes de abrir sus medidas.
    if (awning.model === 'CORTINA' || awning.model === 'SELENA') {
      if (item.label === 'Soporte') item.minimum = 5;
      if (item.label === 'Ventana') item.minimum = 4;
    }
    // Sin estructura de montaje, estas dos elecciones comparten Rotulación tela.
    if (awning.model === 'CAMBIO CORTINA' && ['Ventana', 'Arriba'].includes(item.label)) item.minimum = 4;
    // Sin montaje que continúe esta fila, el ajuste y los dos remates llenan
    // doce columnas (4 + 3 + 5), sin dejar Abajo separado de Laterales.
    if (awning.model === 'CAMBIO CORTINA') {
      if (item.label === 'Ajuste de salida de tela') item.minimum = 4;
      if (item.label === 'Laterales') item.minimum = 3;
      if (item.label === 'Abajo') item.minimum = 5;
    }
    if (awning.model === 'BAMBALINA') {
      if (item.label === 'Curva bamba') item.group = 'medidas';
      if (item.label === 'Remate') item.minimum = 3;
      if (item.label === 'Dibujo de confección' && items.some(field => field.label === 'Color remate')) item.minimum = 3;
    }
    // Las tres bastillas son medidas del mismo bloque y caben en tercios.
    if (item.label.startsWith('Bastilla ')) item.minimum = 4;
  }

  const grupos = READ_GROUPS.map(group => ({ ...group,
    fields: items.filter(item => item.group === group.id && !item.after).sort((a, b) => prioridad(a.label, awning.model) - prioridad(b.label, awning.model)),
  })).filter(group => group.fields.length);
  // Los detalles de Ventana empiezan en la fila siguiente: los botones no se
  // estrechan bajo el ratón cuando aparece el primer detalle.
  const estructura = grupos.find(group => group.id === 'estructura');
  const detallesVentana = new Set(['Salida ventana', 'Medida a ventana desde', 'Esquina', 'Suelo-ventana', 'Tubo-ventana', 'Altura ventana', 'Ajuste de salida de tela', 'Ajuste de salida (cm)']);
  const primerDetalle = estructura?.fields.find(item => detallesVentana.has(item.label));
  if (primerDetalle) primerDetalle.start = true;
  // Si la última fila tiene un solo campo, continúa con el primero del grupo
  // siguiente. No se recupera ningún campo de las filas ya colocadas.
  for (let i = 0; i < grupos.length - 1; i++) {
    const actual = grupos[i], siguiente = grupos[i + 1];
    let ultima: Item[] = [], usado = 0;
    for (const item of actual.fields) {
      if (item.start || usado + item.minimum > 12) { ultima = []; usado = 0; }
      ultima.push(item);
      usado += item.minimum;
      if (usado === 12) { ultima = []; usado = 0; }
    }
    if (ultima.length === 1 && ultima[0].label && usado + siguiente.fields[0].minimum <= 12
      && !['observaciones', 'pie', 'otros'].includes(actual.id)
      && !['observaciones', 'pie', 'otros'].includes(siguiente.id)) {
      do {
        const corte = siguiente.fields.findIndex(item => item.start);
        const bloque = siguiente.fields.slice(0, corte < 0 ? undefined : corte);
        // Al continuar otro grupo, sus dos últimos campos permanecen juntos
        // si no caben ambos aquí. No se altera ninguna fila ya cerrada.
        if (bloque.length === 2 && bloque[0].minimum + bloque[1].minimum <= 12
          && usado + bloque[0].minimum + bloque[1].minimum > 12) break;
        const campo = siguiente.fields.shift()!;
        actual.fields.push(campo);
        usado += campo.minimum;
      } while (siguiente.fields.length && !siguiente.fields[0].start && usado + siguiente.fields[0].minimum <= 12);
      if (!siguiente.fields.length) { grupos.splice(i + 1, 1); i--; }
    }
  }

  // Una sola lista de hermanos con claves de campo. Los cambios de grupo solo
  // alteran coordenadas, nunca la identidad ni el padre de un control.
  const celdas: React.ReactNode[] = [];
  let fila = 1;
  for (const group of grupos) {
    const spans = repartirFilas(group.fields.map(item => item.minimum), group.fields.map(item => !!item.start));
    let columna = 1;
    let avisos: Item[] = [];
    group.fields.forEach((item, index) => {
      celdas.push(<div className={`awning-cell${group.id === 'pie' ? ' awning-form-footnotes' : ''}`} data-field={item.label || undefined} data-logical-group={item.group} key={item.key} style={{ gridColumn: `${columna} / span ${spans[index]}`, gridRow: `${fila} / span 2` }}>{item.node}</div>);
      avisos.push(...items.filter(aviso => aviso.after === item.label));
      columna += spans[index];
      if (columna > 12) {
        fila += 2;
        columna = 1;
        for (const aviso of avisos) {
          celdas.push(<div className="awning-cell awning-context-warning" key={aviso.key} style={{ gridColumn: '1 / -1', gridRow: fila++ }}>{aviso.node}</div>);
        }
        avisos = [];
      }
    });
  }
  return <div className={reading ? 'awning-form-grid awning-column-body' : 'awning-form-grid'}>{celdas}</div>;
}
