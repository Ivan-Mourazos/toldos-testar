import React from 'react';
import { MODELOS_GANADO, type GanadoInput, type ModeloGanado } from '../../remolques/calc/ganado.ts';
import type { Material } from '../../remolques/calc/materiales-seed.ts';
import { CampoMaterial, CampoNum, CampoSelect, CampoSiNo, CampoTexto, PasoFormulario } from './Campos';
import { ObservationLines } from '../components/ObservationLines';
import { avanzarConIntro } from '../avanzarConIntro';

// Formulario del remolque de ganado: no se miden piezas, salen de la plantilla del modelo
// (docs/modelos/remolque-ganado.md). Se elige el modelo y se ponen la O.F., la cantidad y el material.

const MODELOS = Object.entries(MODELOS_GANADO).map(([value, m]) => ({ value, label: m.nombre }));

export function FormularioGanado({ input, materiales, errores = {}, metrosTela = 0, onChange, onCampoTocado }: {
  input: GanadoInput;
  materiales: Material[];
  errores?: Record<string, string>;
  /** Metros de tela que pide este elemento: el stock de la bobina avisa si no llegan. */
  metrosTela?: number;
  onChange: (i: GanadoInput) => void;
  onCampoTocado?: (campo: string) => void;
}) {
  const set = <K extends keyof GanadoInput>(k: K, v: GanadoInput[K]) => onChange({ ...input, [k]: v });
  const setCab = (k: keyof GanadoInput['cabecera'], v: string) => onChange({ ...input, cabecera: { ...input.cabecera, [k]: v } });
  // Con el modelo, su medida comercial (la de los resúmenes y la búsqueda).
  const elegirModelo = (valor: string) => {
    const ficha = MODELOS_GANADO[valor as ModeloGanado];
    onChange({ ...input, ganado: ficha ? (valor as ModeloGanado) : '', largo: ficha?.largo ?? 0, ancho: ficha?.ancho ?? 0 });
  };
  const ficha = input.ganado ? MODELOS_GANADO[input.ganado] : null;

  return (
    <div
      className="rem-form"
      onKeyDown={avanzarConIntro}
      onBlur={(evento) => {
        const campo = (evento.target as HTMLElement).dataset.campo;
        if (campo) onCampoTocado?.(campo);
      }}
    >
      <PasoFormulario titulo="Datos del remolque de ganado" columnas={4}>
        <CampoTexto name="ordenFabricacion" label="O.F." value={input.cabecera.ordenFabricacion ?? ''} onChange={(v) => setCab('ordenFabricacion', v)} />
        <CampoNum name="cantidad" error={errores.cantidad} label="Cantidad" value={input.cantidad} onChange={(v) => set('cantidad', v)} />
      </PasoFormulario>

      <PasoFormulario numero={1} titulo="Modelo" columnas={4}>
        <CampoSelect name="ganado" span={4} label="Modelo de la plantilla" value={input.ganado} opciones={MODELOS}
          sinElegir="Elige el modelo" error={errores.ganado} onChange={elegirModelo} />
        {ficha && <p className="gan-dibujo-nota rem-span-4">{ficha.fuente}</p>}
      </PasoFormulario>

      <PasoFormulario numero={2} titulo="Material y comprobación" columnas={4}>
        <CampoMaterial span={4} value={input.material} opciones={materiales} error={errores.material}
          metrosTela={metrosTela} onChange={(v) => set('material', v)} />
        {/* Iván, 23/10/2026: hay remolques que llegaron con los arcos distintos; se comprueban antes de cortar. */}
        <CampoSiNo name="arcosComprobados" span={2} label="Arcos del remolque comprobados" value={input.arcosComprobados}
          onChange={(v) => set('arcosComprobados', v)} />
        {!input.arcosComprobados && <p className="gan-aviso rem-span-4" role="note">Comprueba los arcos del remolque antes de cortar.</p>}
      </PasoFormulario>

      <PasoFormulario numero={3} titulo="Observaciones" columnas={4}>
        <div className="rem-span-4">
          <ObservationLines label="Observaciones" value={input.observaciones} onChange={(v) => set('observaciones', v)} ajustarTexto />
        </div>
      </PasoFormulario>
    </div>
  );
}
