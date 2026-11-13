import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { AccionesCorteMaquina, BotonMandarMaquina, CorteMaquinaContexto, motivoMaquina } from './CorteMaquina';
import type { WorkflowSettings } from '../types';
import { SemaforoBot } from './SemaforoBot';
const activo = { corteDirectoEnabled: true, corteMaquinaDxfDirectory: '/maquina/{YYYY}/DXF', corteMaquinaCmtDirectory: '/maquina/{YYYY}', productionEnabled: true } as WorkflowSettings;
it('el botón de máquina se ve apagado con su motivo hasta completar configuración, producción y Soy', () => {
  const html = renderToStaticMarkup(<BotonMandarMaquina ruta="/api/cmt/enviar" />);
  expect(html).toContain('disabled');
  expect(html).toContain('Mandar a la máquina de corte');
  expect(html).toContain('Envío directo a la máquina sin activar en Configuración');
  expect(motivoMaquina(activo, '')).toContain('Soy');
  expect(motivoMaquina({ ...activo, productionEnabled: false }, 'IVÁN')).toContain('simulación');
  expect(motivoMaquina({ ...activo, corteMaquinaCmtDirectory: '' }, 'IVÁN')).toContain('sin activar');
});
it('configurado, muestra las dos descargas y el botón de envío habilitado', () => {
  const html = renderToStaticMarkup(<CorteMaquinaContexto.Provider value={{ settings: activo, usuario: 'IVÁN', preguntar: async () => 'confirm', notify: () => {} }}>
    <AccionesCorteMaquina ruta="/corte" codigo="AR2600001" />
  </CorteMaquinaContexto.Provider>);
  for (const texto of ['Descargar DXF', 'Descargar CMT', 'Mandar a la máquina de corte']) expect(html).toContain(texto);
  expect(html).not.toContain('disabled');
});
it('el envío directo oculta el semáforo del bot', () => {
  expect(renderToStaticMarkup(<SemaforoBot bot={{ estado: 'directo', cola: [], carpetas: [], desde: null, comprobado: '' }} />)).toBe('');
});
