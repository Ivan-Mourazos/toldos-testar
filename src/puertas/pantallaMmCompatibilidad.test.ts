import { createHash } from 'node:crypto';
import { it, expect } from 'vitest';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { puertaPlanoReal } from './__fixtures__/planosReales.ts';
import { enrollable5470 } from './__fixtures__/enrollable5470.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { generarCortePuertas } from './corte.ts';
import huellas from './__fixtures__/sha-puertas-919c2a0.json';

it.each(Object.entries(huellas))('%s conserva plano y bot de main 919c2a0 con el mismo documento', (codigo,esperado)=>{
  const pedido=pedidoDe(codigo,codigo==='AR2605470'?enrollable5470():puertaPlanoReal(codigo));
  const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
  const plano=escribirPlanoPuertas({pedido,cabecera:{cliente:'PORTANOVA',tecnico:'IVÁN',revisor:'',fecha:'10/11/2026'}});
  expect(plano).toContain('MEDIDAS EN CM');
  expect(sha(plano)).toBe(esperado.plano);
  expect(sha(generarCortePuertas(pedido).archivo!.dxf)).toBe(esperado.bot);
});
