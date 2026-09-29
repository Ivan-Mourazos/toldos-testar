import React from 'react';
import type { BaquetonInput } from '../../remolques/calc/baqueton.ts';
import type { Material } from '../../remolques/calc/materiales-seed.ts';
import { DEFAULT_PARAMS, type CalcParams } from '../../remolques/calc/params.ts';
import { CampoMaterial, CampoNum, CampoSelect, CampoSiNo, CampoTexto, PasoFormulario } from './Campos';
import { MODOS_OLLAOS, opcionesConEtiqueta } from './opciones';

// Formulario del baquetón: los mismos campos, opciones, orden y avisos que el de la web de
// remolques (`FormularioBaqueton.tsx`). Sin «Realizado por»: lo pone «Soy» al crear la línea.

const MODOS_CAIDA = [
  { value: 'CLIENTE', label: 'Según cliente' },
  { value: 'LINEA', label: 'En línea con lateral' },
  { value: 'MEDIDA', label: 'Medida diferente' },
];

export function FormularioBaqueton({ input, materiales, params, errores = {}, onChange, onCampoTocado }: {
  input: BaquetonInput;
  materiales: Material[];
  params?: CalcParams;
  errores?: Record<string, string>;
  onChange: (i: BaquetonInput) => void;
  onCampoTocado?: (campo: string) => void;
}) {
  const CLIENTES = opcionesConEtiqueta((params ?? DEFAULT_PARAMS).clientesBaqueton.map((c) => c.nombre));
  const set = <K extends keyof BaquetonInput>(k: K, v: BaquetonInput[K]) => onChange({ ...input, [k]: v });
  const setCab = (k: keyof BaquetonInput['cabecera'], v: string) =>
    onChange({ ...input, cabecera: { ...input.cabecera, [k]: v } });

  return (
    // Un solo manejador de blur para todos los campos (ver FormularioLona).
    <div
      className="rem-form"
      onBlur={(evento) => {
        const campo = (evento.target as HTMLElement).dataset.campo;
        if (campo) onCampoTocado?.(campo);
      }}
    >
      <PasoFormulario titulo="Datos del baquetón">
        <CampoTexto name="ordenFabricacion" label="O.F." value={input.cabecera.ordenFabricacion ?? ''} onChange={(v) => setCab('ordenFabricacion', v)} />
      </PasoFormulario>

      <PasoFormulario numero={1} titulo="Medidas · cm" columnas={4}>
        <CampoNum name="cantidad" error={errores.cantidad} label="Cantidad" value={input.cantidad} onChange={(v) => set('cantidad', v)} />
        <CampoNum name="largo" error={errores.largo} label="Largo" value={input.largo} onChange={(v) => set('largo', v)} />
        <CampoNum name="ancho" error={errores.ancho} label="Ancho" value={input.ancho} onChange={(v) => set('ancho', v)} />
        <CampoNum name="baqueton" error={errores.baqueton} label="Baquetón" value={input.baqueton} onChange={(v) => set('baqueton', v)} />
      </PasoFormulario>

      <PasoFormulario numero={2} titulo="Ajustes finales" columnas={4}>
        {(['baquetonDelante', 'baquetonDetras'] as const).map((campo) => (
          <div key={campo} className="rem-par rem-span-2">
            <CampoSelect name={`${campo}Modo`} label={campo === 'baquetonDelante' ? 'Lona delante' : 'Lona detrás'}
              value={input[campo] === undefined ? 'CLIENTE' : input[campo] === null ? 'LINEA' : 'MEDIDA'}
              opciones={MODOS_CAIDA}
              onChange={(v) => set(campo, v === 'CLIENTE' ? undefined : v === 'LINEA' ? null : input.baqueton)} />
            {input[campo] != null ? (
              <CampoNum name={campo} label="Caída de lona · cm" value={input[campo]} error={errores[campo]}
                onChange={(v) => set(campo, v)} />
            ) : null}
          </div>
        ))}
        <CampoSelect name="clienteEspecifico" label="Cliente específico" span={2} value={input.clienteEspecifico} opciones={CLIENTES}
          onChange={(v) => set('clienteEspecifico', v)} />
        <CampoMaterial span={2} value={input.material} opciones={materiales} error={errores.material}
          onChange={(v) => set('material', v)} />
        <div className="rem-banda rem-span-4">
          <CampoSelect name="modoOllaos" label="Distribución de ollaos" span={2} value={input.modoOllaos} opciones={MODOS_OLLAOS}
            sinElegir="Elige el reparto" error={errores.modoOllaos}
            onChange={(v) => set('modoOllaos', v as BaquetonInput['modoOllaos'])} />
          {input.modoOllaos === 'REPARTIDOS' ? (
            <>
              <CampoNum name="pasoOllaos" error={errores.pasoOllaos} label="Paso" value={input.pasoOllaos} onChange={(v) => set('pasoOllaos', v)} />
              <CampoNum name="primerOllao" error={errores.primerOllao} label="Primer ollao" value={input.primerOllao ?? DEFAULT_PARAMS.primerOllao}
                onChange={(v) => set('primerOllao', v)} />
            </>
          ) : input.modoOllaos === 'SEGUN GANCHOS' ? (
            <>
              <CampoSiNo name="ollaosExtremos" label="Ollaos en los extremos" value={input.ollaosExtremos ?? true}
                onChange={(v) => set('ollaosExtremos', v)} />
              {(input.ollaosExtremos ?? true) && (
                <CampoNum name="primerOllao" error={errores.primerOllao} label="Extremo al borde"
                  value={input.primerOllao ?? DEFAULT_PARAMS.primerOllao} onChange={(v) => set('primerOllao', v)} />
              )}
            </>
          ) : (
            <p className="rem-nota rem-span-2">Introduce las posiciones exactas en el apartado de ollaos del resultado.</p>
          )}
        </div>
        <CampoSiNo name="rotulacion" label="Rotulación" span={2} error={errores.rotulacion}
          value={input.rotulacion} onChange={(v) => set('rotulacion', v)} />
      </PasoFormulario>
    </div>
  );
}
