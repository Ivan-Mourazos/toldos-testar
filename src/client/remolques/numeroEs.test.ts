import { describe, expect, it } from 'vitest';
import { escrituraNumeroValida, formatearNumeroEs, leerNumeroEs } from './numeroEs';

describe('leerNumeroEs', () => {
  it('lee la coma decimal', () => {
    expect(leerNumeroEs('10,5')).toBe(10.5);
    expect(leerNumeroEs('239,4')).toBe(239.4);
    expect(leerNumeroEs('28,8')).toBe(28.8);
  });
  it('acepta también el punto', () => {
    expect(leerNumeroEs('7.5')).toBe(7.5);
  });
  it('lee enteros y lo que se escribe a medias', () => {
    expect(leerNumeroEs('250')).toBe(250);
    expect(leerNumeroEs('12,')).toBe(12);
    expect(leerNumeroEs(',5')).toBe(0.5);
    expect(leerNumeroEs('0')).toBe(0);
  });
  it('devuelve null si no hay nada escrito', () => {
    expect(leerNumeroEs('')).toBeNull();
    expect(leerNumeroEs('  ')).toBeNull();
    expect(leerNumeroEs(',')).toBeNull();
  });
  it('devuelve NaN si no es un número', () => {
    expect(leerNumeroEs('1a')).toBeNaN();
    expect(leerNumeroEs('1,2,3')).toBeNaN();
    expect(leerNumeroEs('-5')).toBeNaN();
  });
});

describe('formatearNumeroEs', () => {
  it('escribe la coma decimal y ningún separador de miles', () => {
    expect(formatearNumeroEs(2.5)).toBe('2,5');
    expect(formatearNumeroEs(72.5)).toBe('72,5');
    expect(formatearNumeroEs(1250)).toBe('1250');
    expect(formatearNumeroEs(1234.5)).toBe('1234,5');
  });
  it('quita el ruido de coma flotante', () => {
    expect(formatearNumeroEs(0.1 + 0.2)).toBe('0,3');
    expect(formatearNumeroEs(239.39999999999998)).toBe('239,4');
  });
  it('no enseña nada si no es un número', () => {
    expect(formatearNumeroEs(Number.NaN)).toBe('');
  });
  it('ida y vuelta', () => {
    for (const n of [0.5, 2.5, 10.5, 28.8, 239.4, 1000]) expect(leerNumeroEs(formatearNumeroEs(n))).toBe(n);
  });
});

describe('escrituraNumeroValida', () => {
  it('admite escrituras parciales con un solo separador', () => {
    for (const t of ['', '1', '12,', ',5', '12.5', '12,5']) expect(escrituraNumeroValida(t)).toBe(true);
  });
  it('rechaza letras, signos y dos separadores', () => {
    for (const t of ['a', '1a', '-1', '1,2,3', '1.2,3', '1 2']) expect(escrituraNumeroValida(t)).toBe(false);
  });
});
