import { expect, test } from 'vitest';
import { normalizeOrder } from './validation.js';
import { buildPlanteamientoPlan } from './planteamientoPdf.js';
import { calculateOrder } from './rules.js';
const pedido = sideFinish => normalizeOrder({fabric:'ACRILI2018P120|||120|||ACR AZUL', awnings:[{id:'a',of:'0230194',model:'ARZUA PRO',width:337,projection:225,units:1,valanceHeight:30,armCount:2,tubeLoad:'TUBO DE CARGA EVO 80',device:'MOTOR',...sideFinish}]});
test('el servidor conserva los laterales al normalizar pedidos',()=>{
 expect(pedido().awnings[0].sideFinish).toBe('BASTILLA');
 expect(pedido({sideFinish:'AL CORTE'}).awnings[0].sideFinish).toBe('AL CORTE');
});
test('la opción solo afecta al dibujo y separa sus hojas',()=>{
 const antes=pedido();const despues=pedido({sideFinish:'AL CORTE'});
 expect(calculateOrder(despues)).toEqual(calculateOrder(antes));
 const order={...antes,awnings:[antes.awnings[0],{...despues.awnings[0],id:'b',of:'0230195'}]};
 expect(buildPlanteamientoPlan(order,calculateOrder(order)).fabricPages).toHaveLength(2);
});
