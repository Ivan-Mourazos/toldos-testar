import type { ModeloPuerta, Puerta } from './tipos.ts';

export interface TipoPuertaCliente {
  id: string; nombre: string; modelo: Exclude<ModeloPuerta,'SYSTEMDOCK'>;
  forma?: 'sueltos'|'continua'; piezaInicial?: 'tramo'|'bolsa';
}
export interface FichaClientePuertas {
  id: string; nombre: string; codigoRps: string; unidadHoja: 'cm'|'mm'; habilitado: boolean;
  calculo: 'portanova'|'araujo'|'pendiente'; aviso?: string;
  rollos: { rollo: number; rolloCristal: number; rolloSaco: number }; rollosConfirmados: boolean;
  remates: string; perfiles: Record<string,{aumento:number;marca:number;nombre?:string;aviso?:string}>;
  perfilInicial?: string;
  rotulacion?: { desdeBajo: number; dosCaras: boolean };
  rotulos: { espaciador: string; cremallera: string; plantilla: 'portanova'|'general' };
  tipos: TipoPuertaCliente[]; articulos: Record<string,string>;
}
/** Node lee la carpeta; Vite incluye esos mismos JSON al compilar. No hay una lista de clientes en el código. */
function archivosNode(): Record<string,unknown> {
  const fs=process.getBuiltinModule('node:fs'),path=process.getBuiltinModule('node:path'),url=process.getBuiltinModule('node:url');
  const carpeta=path.join(path.dirname(url.fileURLToPath(import.meta.url)),'clientes');
  return Object.fromEntries(fs.readdirSync(carpeta).filter(n=>n.endsWith('.json')).map(n=>[n,JSON.parse(fs.readFileSync(path.join(carpeta,n),'utf8'))]));
}
const archivos:Record<string,unknown>=typeof process!=='undefined'&&typeof process.getBuiltinModule==='function'
  ? archivosNode() : import.meta.glob('./clientes/*.json',{eager:true,import:'default'});
function validar(valor:unknown):FichaClientePuertas {
  const f=valor as FichaClientePuertas;
  if(!f||!f.id||!f.nombre||typeof f.codigoRps!=='string'||!['cm','mm'].includes(f.unidadHoja)||typeof f.habilitado!=='boolean'||!['portanova','araujo','pendiente'].includes(f.calculo)
    ||!f.rollos||!Object.values(f.rollos).every(n=>Number.isFinite(n)&&n>0)||!f.rotulos||!f.perfiles||!Array.isArray(f.tipos)||!f.tipos.length||!f.articulos
    ||f.tipos.some(t=>!t.id||!t.nombre||!['PUERTAENR','PUERTAPLE','PUERTAUTO'].includes(t.modelo))||Object.values(f.articulos).some(t=>!f.tipos.some(x=>x.id===t)))throw new Error('Ficha de cliente de Puertas inválida. Revisa src/puertas/clientes/.');
  return f;
}
export const fichasClientesPuertas=Object.values(archivos).map(validar).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
if(new Set(fichasClientesPuertas.map(f=>f.id)).size!==fichasClientesPuertas.length||new Set(fichasClientesPuertas.filter(f=>f.codigoRps).map(f=>f.codigoRps)).size!==fichasClientesPuertas.filter(f=>f.codigoRps).length)throw new Error('Fichas de Puertas con identificador o código RPS repetido.');
export const fichaPorId=(id:string)=>fichasClientesPuertas.find(f=>f.id===id);
export const fichaPorCodigo=(codigo:string)=>fichasClientesPuertas.find(f=>f.codigoRps&&f.codigoRps===codigo.trim())??fichaPorId('general')!;
/** Los documentos antiguos no se migran: sin marca de ARAUJO conservan la confección anterior. */
export const fichaDePuerta=(p:Pick<Puerta,'clientePuertas'|'araujo'>)=>fichaPorId(p.clientePuertas??(p.araujo?'araujo':'portanova'))??fichaPorId('general')!;
export const tipoDePuerta=(p:Puerta)=>{
  const f=fichaDePuerta(p);
  return f.tipos.find(t=>t.id===p.tipoPuerta)??f.tipos.find(t=>t.modelo===p.modelo&&(!p.araujo||t.forma===p.araujo.forma))??f.tipos[0];
};
