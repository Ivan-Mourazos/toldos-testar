import { describe, expect, it } from 'vitest';
import { modelosInicio, primeraLineaInicio } from './modelosInicio';

describe('modelos al empezar un pedido', () => {
  it('usa el catálogo activo y distingue un toldo completo de solo tela', () => {
    const grupos = modelosInicio('toldos',['ARZUA PRO','CAMBIO TELA']);
    expect(grupos.map(g=>g.nombre)).toEqual(['Toldos completos','Solo tela']);
    expect(grupos[0].modelos[0]).toMatchObject({nombre:'Arzúa Pro',valor:{modelo:'ARZUA PRO',workType:'FULL_AWNING'}});
    expect(grupos[1].modelos[0].valor).toMatchObject({modelo:'CAMBIO TELA',workType:'FABRIC_ONLY'});
  });
  it('filtra sin distinguir tildes, ordena y no ofrece System Dock como puerta', () => {
    const modelos = modelosInicio('puertas',[])[0].modelos;
    expect(modelos.map(m=>m.nombre)).toEqual(['Apilable','Autorreparable','Enrollable']);
    expect(modelosInicio('toldos',['ARZUA PRO'],'arzua')[0].modelos[0].nombre).toBe('Arzúa Pro');
    expect(modelosInicio('puertas',[],'dock')).toEqual([]);
  });
  it('ofrece el remolque de ganado y prepara el tipo de remolque seleccionado sin inventar datos', () => {
    expect(modelosInicio('remolques',[])[0].modelos.find(m=>m.nombre==='Remolque de ganado')).toMatchObject({valor:{producto:'remolques',modelo:'ganado'}});
    expect(primeraLineaInicio('ganado','2026-10-27','IVÁN').input).toMatchObject({ganado:'REMOLCAR_ECONOMICO',largo:300,ancho:150,arcosComprobados:false});
    for (const tipo of ['lona','baqueton','ganado'] as const) {
      expect(primeraLineaInicio(tipo,'2026-10-26','IVÁN')).toMatchObject({tipo,version:'1',input:{cabecera:{numeroPedido:'',fecha:'2026-10-26',realizadoPor:'IVÁN'}}});
    }
  });
});
