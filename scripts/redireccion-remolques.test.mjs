import { describe, expect, test } from 'vitest';
import { destinoRedireccion } from './redireccion-remolques.mjs';

// Fase 6 (Iván, 02/10/2026): quien abra la web vieja de remolques en el 4500 llega a la nueva.
describe('destinoRedireccion', () => {
  test('mismo servidor, puerto de Planteamientos TGM', () => {
    expect(destinoRedireccion('192.168.0.90:4500', 4400)).toBe('http://192.168.0.90:4400/');
  });
  test('sin puerto en la cabecera o con nombre', () => {
    expect(destinoRedireccion('n8n', 4400)).toBe('http://n8n:4400/');
  });
  test('sin cabecera Host, al servidor de siempre', () => {
    expect(destinoRedireccion(undefined, 4400)).toBe('http://192.168.0.90:4400/');
  });
  test('una cabecera rara no cuela otra dirección', () => {
    expect(destinoRedireccion('malo.com/x?y', 4400)).toBe('http://192.168.0.90:4400/');
  });
});
