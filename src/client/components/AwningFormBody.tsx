import React, { Children, Fragment, isValidElement } from 'react';
import type { Awning } from '../types';
import { READ_GROUPS, readGroupOf } from '../readGroups';
import type { ReadGroupId } from '../readGroups';
import { repartirFilas } from '../awningFormLayout';
import { IrisSquaringDiagram } from './IrisSquaringDiagram';

type Item = { key: string; node: React.ReactNode; label: string; group: ReadGroupId; minimum: number };
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
  'Colocación', 'Tipo de pared', 'Dibujo de confección', 'Obs. estructura', 'Obs. tela'
];

const amplios = new Set([
  'Tela', 'Tela bamba', 'Variante', 'Configuración Antica', 'Altura soporte-brazo (cm)', 'Posición de trabajo', 'Configuración de brazos',
  'Terminales · confirmar con taller', 'Tubo de carga', 'Soporte', 'Tipo de soporte', 'Laterales', 'Abajo', 'Arriba', 'Ventana',
  'Empate indicado por cliente', 'Cara hacia el interior (ventana)', 'Dibujo de confección', 'Ajuste de salida de tela',
  'Sumar para enrolle y tubo (cm)', 'Diagonal 1 (a salida izq.)', 'Diagonal 2 (a salida der.)',
  'Sujeción del suplemento', 'Distancia entre broches (cm)', 'Solape sobre la onda (cm)', 'Remate inferior'
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
  if (/^Nº brazos ·/.test(label)) return orden.indexOf('Nº brazos');
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
        items.push({ key, node, label, group, minimum });
      } else if (node.type === IrisSquaringDiagram) {
        items.push({ key, node, label: '', group: props.part === 'legend' ? 'pie' : 'medidas', minimum: 12 });
      } else if (props['data-form-group']) {
        items.push({ key, node, label: '', group: props['data-form-group'], minimum: 12 });
      } else if (props.className === 'curtain-window-measures') {
        const inicio = items.length;
        recoger(props.children, key);
        const ventana = items.splice(inicio);
        const campos = ventana.filter(item => item.label);
        items.push(...ventana.filter(item => !item.label));
        items.push({ key, label: '', group: 'estructura', minimum: 12, node: (
          <div className="awning-inner-grid" role={props.role} aria-label={props['aria-label']}>
            {campos.map(item => <div className="awning-cell" key={item.key} style={{ gridColumn: 'span 3' }}>{item.node}</div>)}
          </div>
        ) });
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
  for (const item of items) {
    if (item.label === 'Ajuste de tela (cm)' && awning.model !== 'IRIS' && medidas.reduce((sum, field) => sum + field.minimum, 0) >= 12) item.group = 'tela';
    if (['Ajuste de salida de tela', 'Ajuste de salida (cm)'].includes(item.label)) item.group = 'tela';
    if (item.label === 'Dibujo de confección') item.group = items.some(field => field.group === 'colocacion') ? 'colocacion' : 'tela';
    if (awning.model === 'CAMBIO TELA' && item.label === 'Sumar para enrolle y tubo (cm)') { item.group = 'tela'; item.minimum = 3; }
    if (awning.model === 'CAMBIO ANTICA' && ['Configuración Antica', 'Sumar a la caída (cm)'].includes(item.label)) item.group = 'tela';
    if (awning.model === 'HERA' && ['Arriba', 'Abajo'].includes(item.label)) item.minimum = 3;
    if (awning.model === 'IRIS' && item.label.startsWith('Diagonal ')) item.minimum = 4;
    if (awning.model === 'BAMBALINA') {
      if (item.label === 'Curva bamba') item.group = 'medidas';
      if (item.label === 'Remate') item.minimum = 3;
      if (item.label === 'Dibujo de confección' && items.some(field => field.label === 'Color remate')) item.minimum = 3;
    }
  }

  return <div className={reading ? 'awning-form-grid awning-column-body' : 'awning-form-grid'}>
    {READ_GROUPS.map(group => {
      const fields = items.filter(item => item.group === group.id).sort((a, b) => prioridad(a.label, awning.model) - prioridad(b.label, awning.model));
      if (!fields.length) return null;
      const spans = repartirFilas(fields.map(item => item.minimum));
      return <div key={group.id} className={`awning-group${group.id === 'pie' ? ' awning-form-footnotes' : ''}`} data-group={group.id}>
        {reading && group.id !== 'pie' && <h5 className="read-group-title" data-group={group.id}>{group.title}</h5>}
        {fields.map((item, index) => <div className="awning-cell" data-field={item.label || undefined} key={item.key} style={{ gridColumn: `span ${spans[index]}` }}>{item.node}</div>)}
      </div>;
    })}
  </div>;
}
