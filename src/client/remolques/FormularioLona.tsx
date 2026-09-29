import React from 'react';
import type { LonaInput } from '../../remolques/calc/lona.ts';
import type { Material } from '../../remolques/calc/materiales-seed.ts';
import { ajusteContorno, DEFAULT_PARAMS, PERFILES, type CalcParams } from '../../remolques/calc/params.ts';
import { excelRound } from '../../remolques/calc/redondeo.ts';
import { contornoCalculado } from '../../remolques/geometry/contorno.ts';
import { CampoMaterial, CampoNum, CampoSelect, CampoSiNo, CampoTexto, PasoFormulario } from './Campos';
import { MODOS_OLLAOS, opcionesConEtiqueta } from './opciones';

// Formulario de la lona de remolque: los mismos campos, opciones, orden y avisos que el de la
// web de remolques (`FormularioLona.tsx`). Sin «Realizado por»: lo pone «Soy» al crear la línea.

const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const PERFILES_VISIBLES = PERFILES.map((perfil) => ({
  value: perfil.value,
  label: perfil.label.replace(/ · ([a-záéíóúüñ])/u, (_, letra: string) => ` · ${letra.toLocaleUpperCase('es-ES')}`),
}));

export function FormularioLona({ input, materiales, params, errores = {}, onChange, onCampoTocado }: {
  input: LonaInput;
  materiales: Material[];
  params?: CalcParams;
  errores?: Record<string, string>;
  onChange: (i: LonaInput) => void;
  onCampoTocado?: (campo: string) => void;
}) {
  const p = params ?? DEFAULT_PARAMS;
  const RECOGIDAS = opcionesConEtiqueta(p.recogidas.map((r) => r.nombre));
  const ajuste = ajusteContorno(p, input.tipoPerfil, {
    abajo: input.radioChaflanAbajo, arriba: input.radioChaflanArriba,
  });
  const contornoVisible = input.contorno ?? Math.max((input.contornoScad ?? 0) - ajuste, 0);
  // El contorno se desarrolla sobre la LONA HECHA (ancho + demasía), no sobre el remolque
  // pedido: validado contra la línea rosa del CAD de oficina técnica.
  const calculado = contornoCalculado(input.tipoPerfil, {
    ancho: input.ancho + p.demasiaLonaHecha,
    alto: input.altoDelante,
    aguas: input.aguas,
    radioCumbrera: input.radioCumbrera,
    radioHombro: input.radioHombro,
    radioEsquina: input.radioEsquina,
    chaflan: input.chaflan,
    radioChaflanAbajo: input.radioChaflanAbajo,
    radioChaflanArriba: input.radioChaflanArriba,
  });
  const contornoExacto = calculado == null ? null : excelRound(calculado, 1);
  const faltaDato = input.tipoPerfil === 'TIPO 04' && !(input.chaflan ?? 0)
    ? 'chaflán'
    : input.tipoPerfil === 'TIPO 05' && !(input.radioEsquina ?? 0)
      ? 'radio'
      : null;
  const set = <K extends keyof LonaInput>(k: K, v: LonaInput[K]) => onChange({ ...input, [k]: v });
  const setCab = (k: keyof LonaInput['cabecera'], v: string) =>
    onChange({ ...input, cabecera: { ...input.cabecera, [k]: v } });

  return (
    // El onBlur de React es focusout, que sí burbujea: un solo manejador cubre todos los campos
    // leyendo el data-campo que ya llevan. Así los avisos salen al salir del campo, no al teclear.
    <div
      className="rem-form"
      onBlur={(evento) => {
        const campo = (evento.target as HTMLElement).dataset.campo;
        if (campo) onCampoTocado?.(campo);
      }}
    >
      <PasoFormulario titulo="Datos del remolque">
        <CampoTexto name="ordenFabricacion" label="O.F." value={input.cabecera.ordenFabricacion ?? ''} onChange={(v) => setCab('ordenFabricacion', v)} />
      </PasoFormulario>

      <PasoFormulario numero={1} titulo="Forma del remolque" columnas={4}>
        <CampoSelect name="tipoPerfil" label="Tipo" span={2} value={input.tipoPerfil} opciones={PERFILES_VISIBLES}
          sinElegir="Elige el perfil" error={errores.tipoPerfil}
          onChange={(v) => set('tipoPerfil', v as LonaInput['tipoPerfil'])} />
        <CampoMaterial span={2} value={input.material} opciones={materiales} error={errores.material}
          onChange={(v) => set('material', v)} />
      </PasoFormulario>

      <PasoFormulario numero={2} titulo="Recogidas">
        <CampoSelect name="recogeDelante" label="Delante" value={input.recogeDelante} opciones={RECOGIDAS}
          sinElegir="Elige la recogida" error={errores.recogeDelante}
          onChange={(v) => set('recogeDelante', v)} />
        <CampoSelect name="recogeAtras" label="Atrás" value={input.recogeAtras} opciones={RECOGIDAS}
          sinElegir="Elige la recogida" error={errores.recogeAtras}
          onChange={(v) => set('recogeAtras', v)} />
        <CampoSiNo name="bastillaEnfundar" label="Bastilla enfundar" error={errores.bastillaEnfundar}
          value={input.bastillaEnfundar} onChange={(v) => set('bastillaEnfundar', v)} />
      </PasoFormulario>

      <PasoFormulario numero={3} titulo="Medidas · cm" columnas={4}>
        <CampoNum name="cantidad" error={errores.cantidad} label="Cantidad" value={input.cantidad} onChange={(v) => set('cantidad', v)} />
        <CampoNum name="largo" error={errores.largo} label="Largo" value={input.largo} onChange={(v) => set('largo', v)} />
        <CampoNum name="ancho" error={errores.ancho} label="Ancho" value={input.ancho} onChange={(v) => set('ancho', v)} />
        <CampoNum name="anchoAtras" label="Ancho detrás" value={input.anchoAtras ?? 0} onChange={(v) => set('anchoAtras', v)} />
        <CampoNum name="altoDelante" error={errores.altoDelante} label="Alto delante" value={input.altoDelante} onChange={(v) => set('altoDelante', v)} />
        <CampoNum name="altoAtras" label="Alto detrás" value={input.altoAtras} onChange={(v) => set('altoAtras', v)} />
        {['TIPO 02', 'TIPO 03'].includes(input.tipoPerfil) && (
          <CampoNum name="aguas" error={errores.aguas} label="Aguas" value={input.aguas ?? 0} onChange={(v) => set('aguas', v)} />
        )}
        {input.tipoPerfil === 'TIPO 03' && (
          <>
            <CampoNum name="radioCumbrera" label="Radio cumbrera" value={input.radioCumbrera ?? 0} onChange={(v) => set('radioCumbrera', v)} />
            <CampoNum name="radioHombro" label="Radio hombro" value={input.radioHombro ?? 0} onChange={(v) => set('radioHombro', v)} />
          </>
        )}
        {input.tipoPerfil === 'TIPO 04' && (
          <>
            <CampoNum name="chaflan" error={errores.chaflan} label="Chaflán · entre vértices"
              value={input.chaflan ?? 0} onChange={(v) => set('chaflan', v)} />
            <CampoNum name="radioChaflanAbajo" label="Radio abajo"
              value={input.radioChaflanAbajo ?? 0} onChange={(v) => set('radioChaflanAbajo', v)} />
            <CampoNum name="radioChaflanArriba" label="Radio arriba"
              value={input.radioChaflanArriba ?? 0} onChange={(v) => set('radioChaflanArriba', v)} />
          </>
        )}
        {input.tipoPerfil === 'TIPO 05' && (
          <CampoNum name="radioEsquina" error={errores.radioEsquina} label="Radio esquina" value={input.radioEsquina ?? 0} onChange={(v) => set('radioEsquina', v)} />
        )}
        <div className="rem-contorno">
          <CampoNum name="contorno" error={errores.contorno} label="Contorno" value={contornoVisible}
            onChange={(v) => onChange({ ...input, contorno: v, contornoScad: undefined })} />
          {faltaDato ? (
            <small className="rem-aviso-campo">Introduce el {faltaDato} para calcularlo</small>
          ) : contornoExacto != null && Math.abs(contornoVisible - contornoExacto) > 0.05 ? (
            <button
              type="button"
              className="rem-enlace"
              onClick={() => onChange({ ...input, contorno: contornoExacto, contornoScad: undefined })}
            >
              Usar calculado: {fmt(contornoExacto)}
            </button>
          ) : null}
        </div>
      </PasoFormulario>

      <PasoFormulario numero={4} titulo="Ajustes finales" columnas={4}>
        <div className="rem-banda rem-span-4">
          <CampoSelect name="modoOllaos" label="Distribución de ollaos" span={2} value={input.modoOllaos} opciones={MODOS_OLLAOS}
            sinElegir="Elige el reparto" error={errores.modoOllaos}
            onChange={(v) => set('modoOllaos', v as LonaInput['modoOllaos'])} />
          {input.modoOllaos === 'REPARTIDOS' ? (
            <>
              <CampoNum name="pasoOllaos" error={errores.pasoOllaos} label="Paso" value={input.pasoOllaos} onChange={(v) => set('pasoOllaos', v)} />
              <CampoNum name="primerOllao" error={errores.primerOllao} label="Primer ollao" value={input.primerOllao ?? DEFAULT_PARAMS.primerOllao}
                onChange={(v) => set('primerOllao', v)} />
            </>
          ) : (
            <p className="rem-nota rem-span-2">Introduce las posiciones exactas en el apartado de ollaos del resultado.</p>
          )}
        </div>
        <CampoSiNo name="ventana" label="Ventana" span={2} error={errores.ventana}
          value={input.ventana} onChange={(v) => set('ventana', v)} />
        <CampoSiNo name="rotulacion" label="Rotulación" span={2} error={errores.rotulacion}
          value={input.rotulacion} onChange={(v) => set('rotulacion', v)} />
        {input.ventana && (
          <>
            <CampoNum name="ventanaAncho" error={errores.ventanaAncho} label="Ancho ventana" value={input.ventanaAncho ?? 0}
              onChange={(v) => set('ventanaAncho', v)} />
            <CampoNum name="ventanaAlto" error={errores.ventanaAlto} label="Alto ventana" value={input.ventanaAlto ?? 0}
              onChange={(v) => set('ventanaAlto', v)} />
          </>
        )}
      </PasoFormulario>
    </div>
  );
}
