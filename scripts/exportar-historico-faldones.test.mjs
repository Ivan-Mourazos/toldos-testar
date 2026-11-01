import { describe, expect, it } from 'vitest';
import { comprobarSoloLectura, crearConsultas, normalizarPedidos } from './exportar-historico-faldones.mjs';

describe('exportación documental de faldones, sin conexiones', () => {
  it('normaliza los pedidos de control y rechaza contenido que no sea un número de pedido', () => {
    expect(normalizarPedidos(['AR.25.02986', ' ar2502986 ', 'SA.26.00012'])).toEqual(['AR2502986', 'SA2600012']);
    expect(() => normalizarPedidos(["AR2502986'; DELETE FROM pedidos"])).toThrow('inválido');
  });

  it('parametriza los controles y conserva líneas de contexto sin exigir OF', () => {
    const { rps, historico, controles } = crearConsultas(['AR.25.02986', 'SA.26.00012']);
    expect(controles).toEqual(['AR2502986', 'SA2600012']);
    expect(rps).toContain('IN (@documento0, @documento1)');
    expect(rps).not.toContain('AR2502986');
    expect(rps).toContain('LEFT JOIN dbo.CPRManufacturingOrder');
    expect(rps).toContain('JOIN seleccionados s ON s.id_pedido = l.id_pedido');
    expect(rps).toContain('COLLATE Latin1_General_CI_AI');
    expect(rps).toContain("LIKE N'%FALD%'");
    expect(rps).toContain("LIKE N'%FRONTAL%'");
    expect(historico).toContain('p.datos_tecnicos');
    expect(() => comprobarSoloLectura(rps)).not.toThrow();
    expect(() => comprobarSoloLectura(historico)).not.toThrow();
  });

  it('admite un inventario vacío y bloquea consultas de escritura, incluso SELECT INTO', () => {
    const consultas = crearConsultas([]);
    expect(consultas.rps).toContain('CASE WHEN 1 = 0');
    expect(consultas.historico).toContain("IN (N'')");
    for (const consulta of ['DELETE FROM pedidos', 'SELECT * INTO copia FROM pedidos', 'WITH x AS (SELECT 1 a) DELETE FROM pedidos', 'SELECT 1; EXEC procedimiento']) {
      expect(() => comprobarSoloLectura(consulta)).toThrow('solo lectura');
    }
  });
});
