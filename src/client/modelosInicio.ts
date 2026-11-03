import { fabricOnlyModelNames, fullAwningModelNames } from '../domain/modelBehavior.js';
import { fichaPorId } from '../puertas/clientes.ts';
import type { ModeloPuerta } from '../puertas/tipos.ts';
import { emptyBaqueton, emptyGanado, emptyLona } from '../remolques/entradas-vacias.ts';
import type { LineaPedido } from '../remolques/workspace/lineas.ts';
import { controlLabel } from './components/controlLabels';

export const GANADO_DISPONIBLE = true;
export type CategoriaConModelos = 'toldos' | 'puertas' | 'remolques' | 'estandar';
export type ModeloInicio =
  | { producto: 'toldos'; modelo: string; workType: 'FULL_AWNING' | 'FABRIC_ONLY' }
  | { producto: 'puertas'; modelo: Exclude<ModeloPuerta, 'SYSTEMDOCK'>; cliente: string; tipo: string }
  | { producto: 'remolques'; modelo: 'lona' | 'baqueton' | 'ganado' };
export type OpcionModelo = { nombre: string; valor?: ModeloInicio; accion?: 'combursa' | 'systemdock'; proximamente?: boolean };
export type GrupoModelos = { nombre: string; modelos: OpcionModelo[] };

// Añadir un pedido estándar consiste en añadir su entrada a esta lista.
const estandar: OpcionModelo[] = [
  {nombre:'COMBURSA',accion:'combursa'},
  {nombre:'Embudos',valor:{producto:'toldos',modelo:'EMBUDO',workType:'FABRIC_ONLY'}},
  {nombre:'System Dock',accion:'systemdock'},
];

const ordenar = (modelos: OpcionModelo[]) => modelos.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');

export function modelosInicio(categoria: CategoriaConModelos, disponibles: string[], busqueda = '', clientePuertas = 'portanova'): GrupoModelos[] {
  let grupos: GrupoModelos[];
  if (categoria === 'estandar') {
    grupos = [{nombre:'Pedidos estándar',modelos:estandar}];
  } else if (categoria === 'toldos') {
    grupos = ([['Toldos completos', fullAwningModelNames, 'FULL_AWNING'], ['Solo tela', fabricOnlyModelNames, 'FABRIC_ONLY']] as const).map(([nombre, modelos, workType]) => ({
      nombre, modelos: modelos.filter(m=>m !== 'EMBUDO' && disponibles.includes(m)).map(modelo=>({nombre:controlLabel(modelo),valor:{producto:'toldos',modelo,workType}})),
    }));
  } else if (categoria === 'puertas') {
    const ficha=fichaPorId(clientePuertas)!;
    grupos = [{nombre:'Tipos de puerta',modelos:ficha.tipos.map(t=>({nombre:t.nombre,proximamente:!ficha.habilitado,valor:{producto:'puertas',modelo:t.modelo,cliente:ficha.id,tipo:t.id}}))}];
  } else {
    grupos = [{nombre:'Tipos de elemento',modelos:[
      {nombre:'Remolque',valor:{producto:'remolques',modelo:'lona'}},
      {nombre:'Baquetón',valor:{producto:'remolques',modelo:'baqueton'}},
      GANADO_DISPONIBLE ? {nombre:'Remolque de ganado',valor:{producto:'remolques',modelo:'ganado'}} : {nombre:'Remolque de ganado',proximamente:true},
    ]}];
  }
  const termino = normalizar(busqueda.trim());
  return grupos.map(g=>({...g,modelos:ordenar(g.modelos.filter(m=>normalizar(m.nombre).includes(termino)))})).filter(g=>g.modelos.length>0);
}

/** Primer elemento vacío, con el tipo elegido; el número y la OF los completa el técnico. */
export function primeraLineaInicio(tipo: 'lona' | 'baqueton' | 'ganado', fecha: string, usuario: string): LineaPedido {
  const input = tipo === 'lona' ? emptyLona() : tipo === 'ganado' ? emptyGanado() : emptyBaqueton();
  return { version:'1', tipo, input:{...input,cabecera:{...input.cabecera,numeroPedido:'',cliente:'',fecha,version:'1',realizadoPor:usuario}} };
}
