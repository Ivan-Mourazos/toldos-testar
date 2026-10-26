import { fabricOnlyModelNames, fullAwningModelNames } from '../domain/modelBehavior.js';
import { MODELOS_PUERTAS } from '../puertas/calcular.ts';
import type { ModeloPuerta } from '../puertas/tipos.ts';
import { emptyBaqueton, emptyLona } from '../remolques/entradas-vacias.ts';
import type { LineaPedido } from '../remolques/workspace/lineas.ts';
import { controlLabel } from './components/controlLabels';

export const GANADO_DISPONIBLE = false;
export type CategoriaConModelos = 'toldos' | 'puertas' | 'remolques';
export type ModeloInicio =
  | { producto: 'toldos'; modelo: string; workType: 'FULL_AWNING' | 'FABRIC_ONLY' }
  | { producto: 'puertas'; modelo: Exclude<ModeloPuerta, 'SYSTEMDOCK'> }
  | { producto: 'remolques'; modelo: 'lona' | 'baqueton' };
export type OpcionModelo = { nombre: string; valor?: ModeloInicio; proximamente?: boolean };
export type GrupoModelos = { nombre: string; modelos: OpcionModelo[] };

const ordenar = (modelos: OpcionModelo[]) => modelos.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');

export function modelosInicio(categoria: CategoriaConModelos, disponibles: string[], busqueda = ''): GrupoModelos[] {
  let grupos: GrupoModelos[];
  if (categoria === 'toldos') {
    grupos = ([['Toldos completos', fullAwningModelNames, 'FULL_AWNING'], ['Solo tela', fabricOnlyModelNames, 'FABRIC_ONLY']] as const).map(([nombre, modelos, workType]) => ({
      nombre, modelos: modelos.filter(m=>disponibles.includes(m)).map(modelo=>({nombre:controlLabel(modelo),valor:{producto:'toldos',modelo,workType}})),
    }));
  } else if (categoria === 'puertas') {
    grupos = [{nombre:'Modelos',modelos:(['PUERTAPLE','PUERTAUTO','PUERTAENR'] as const).map(modelo=>({nombre:MODELOS_PUERTAS[modelo],valor:{producto:'puertas',modelo}}))}];
  } else {
    grupos = [{nombre:'Tipos de elemento',modelos:[
      {nombre:'Remolque',valor:{producto:'remolques',modelo:'lona'}},
      {nombre:'Baquetón',valor:{producto:'remolques',modelo:'baqueton'}},
      {nombre:'Remolque de ganado',proximamente:!GANADO_DISPONIBLE},
    ]}];
  }
  const termino = normalizar(busqueda.trim());
  return grupos.map(g=>({...g,modelos:ordenar(g.modelos.filter(m=>normalizar(m.nombre).includes(termino)))})).filter(g=>g.modelos.length>0);
}

/** Primer elemento vacío, con el tipo elegido; el número y la OF los completa el técnico. */
export function primeraLineaInicio(tipo: 'lona' | 'baqueton', fecha: string, usuario: string): LineaPedido {
  const input = tipo === 'lona' ? emptyLona() : emptyBaqueton();
  return { version:'1', tipo, input:{...input,cabecera:{...input.cabecera,numeroPedido:'',cliente:'',fecha,version:'1',realizadoPor:usuario}} };
}
