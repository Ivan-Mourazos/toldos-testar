import React, { useState } from 'react';
import type { AskForConfirmation } from '../components/NotificationCenter';
import type { LonaInput } from '../../remolques/calc/lona.ts';
import type { Material } from '../../remolques/calc/materiales-seed.ts';
import { ajusteContorno, DEFAULT_PARAMS, PERFILES, type CalcParams } from '../../remolques/calc/params.ts';
import { excelRound } from '../../remolques/calc/redondeo.ts';
import { contornoCalculado } from '../../remolques/geometry/contorno.ts';
import { CampoMaterial, CampoNum, CampoSelect, CampoSiNo, CampoTexto, PasoFormulario } from './Campos';
import {
  conMedidaDelante, hayValoresDetras, radiosOpcionales, sinDetras, sinRadios, tieneDetras, tieneRadios,
} from './medidasOpcionales';
import { ObservationLines } from '../components/ObservationLines';
import { MODOS_OLLAOS, opcionesConEtiqueta } from './opciones';

// Formulario de la lona de remolque: los mismos campos, opciones, orden y avisos que el de la
// web de remolques (`FormularioLona.tsx`). Sin «Realizado por»: lo pone «Soy» al crear la línea.

const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const ETIQUETAS_RADIO = {
  radioCumbrera: 'Radio cumbrera',
  radioHombro: 'Radio hombro',
  radioChaflanAbajo: 'Radio abajo',
  radioChaflanArriba: 'Radio arriba',
} as const;
const PERFILES_VISIBLES = PERFILES.map(({ value, label }) => ({ value, label }));

export function FormularioLona({ input, materiales, params, errores = {}, metrosTela = 0, onChange, onCampoTocado, onConfirm }: {
  input: LonaInput;
  materiales: Material[];
  /** Metros de tela que pide este elemento: el stock de la bobina avisa si no llegan. */
  metrosTela?: number;
  params?: CalcParams;
  errores?: Record<string, string>;
  onChange: (i: LonaInput) => void;
  onCampoTocado?: (campo: string) => void;
  /** Para preguntar antes de borrar las medidas que esconde un «No»; sin él se borran sin preguntar. */
  onConfirm?: AskForConfirmation;
}) {
  const p = params ?? DEFAULT_PARAMS;
  const RECOGIDAS = opcionesConEtiqueta(p.recogidas.map((r) => r.nombre));
  const ajuste = ajusteContorno(p, input.tipoPerfil, {
    abajo: input.radioChaflanAbajo, arriba: input.radioChaflanArriba,
  });
  const contornoVisible = input.contorno ?? Math.max((input.contornoScad ?? 0) - ajuste, 0);
  // Los «Sí» pulsados a mano sin nada escrito todavía; con medidas ya escritas el Sí sale solo.
  // El de los radios se recuerda con el perfil en el que se pulsó: otro perfil tiene otros radios.
  const [detrasPedido, setDetrasPedido] = useState(false);
  const [radiosPedidosEn, setRadiosPedidosEn] = useState<LonaInput['tipoPerfil']>('');
  const verDetras = tieneDetras(input) || detrasPedido;
  const camposRadio = radiosOpcionales(input.tipoPerfil);
  const verRadios = tieneRadios(input) || (radiosPedidosEn !== '' && radiosPedidosEn === input.tipoPerfil);
  const medidasContorno = {
    aguas: input.aguas,
    radioCumbrera: input.radioCumbrera,
    radioHombro: input.radioHombro,
    radioEsquina: input.radioEsquina,
    chaflan: input.chaflan,
    radioChaflanAbajo: input.radioChaflanAbajo,
    radioChaflanArriba: input.radioChaflanArriba,
  };
  // El contorno se desarrolla sobre la LONA HECHA (ancho + demasía), no sobre el remolque
  // pedido: validado contra la línea rosa del CAD de oficina técnica. El de detrás, igual con el
  // ancho y el alto de detrás (cero = igual que delante).
  const exacto = (ancho: number, alto: number) => {
    const valor = contornoCalculado(input.tipoPerfil, { ...medidasContorno, ancho: ancho + p.demasiaLonaHecha, alto });
    return valor == null ? null : excelRound(valor, 1);
  };
  const contornoExacto = exacto(input.ancho, input.altoDelante);
  const contornoAtrasExacto = exacto(
    (input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input.ancho,
    input.altoAtras > 0 ? input.altoAtras : input.altoDelante,
  );
  const faltaDato = input.tipoPerfil === 'TIPO 04' && !(input.chaflan ?? 0)
    ? 'chaflán'
    : input.tipoPerfil === 'TIPO 05' && !(input.radioEsquina ?? 0)
      ? 'radio'
      : null;
  const set = <K extends keyof LonaInput>(k: K, v: LonaInput[K]) => onChange({ ...input, [k]: v });
  const setCab = (k: keyof LonaInput['cabecera'], v: string) =>
    onChange({ ...input, cabecera: { ...input.cabecera, [k]: v } });
  // Pasar a No borra lo que se esconde, para que nada se calcule con un dato que no se ve; si
  // había algo escrito, antes se pregunta.
  const quitar = async (conValores: boolean, pregunta: { title: string; message: string }, borrar: () => void) => {
    if (conValores && onConfirm) {
      const eleccion = await onConfirm({ ...pregunta, confirmLabel: 'Quitar', cancelLabel: 'Mantener', tone: 'warning' });
      if (eleccion !== 'confirm') return;
    }
    borrar();
  };
  const cambiarDetras = (si: boolean) => {
    if (si) { setDetrasPedido(true); return; }
    void quitar(hayValoresDetras(input), {
      title: 'Quitar las medidas de detrás',
      message: 'Se borran el ancho, el alto y el contorno de detrás, y la lona se calcula igual delante que detrás.',
    }, () => { setDetrasPedido(false); onChange(sinDetras(input)); });
  };
  const cambiarRadios = (si: boolean) => {
    if (si) { setRadiosPedidosEn(input.tipoPerfil); return; }
    void quitar(tieneRadios(input), {
      title: 'Quitar los radios',
      message: 'Se borran los radios y las aristas quedan vivas.',
    }, () => { setRadiosPedidosEn(''); onChange(sinRadios(input)); });
  };
  const botonCalculado = (visible: number, calculado: number | null, usar: (v: number) => void) => (
    faltaDato ? (
      <small className="rem-aviso-campo">Introduce el {faltaDato} para calcularlo</small>
    ) : calculado != null && Math.abs(visible - calculado) > 0.05 ? (
      <button type="button" className="rem-enlace" onClick={() => usar(calculado)}>
        Usar calculado: {fmt(calculado)}
      </button>
    ) : null
  );

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
      {/* Reparto del ancho (Iván, 01/10/2026): los números cortos, de cuatro en fila; lo largo (el
          material, las recogidas con nombre largo, las observaciones) a su ancho y entero, sin «…».
          La O.F. y la cantidad juntas arriba: las dos vienen de la línea de RPS. */}
      <PasoFormulario titulo="Datos del remolque" columnas={4}>
        <CampoTexto name="ordenFabricacion" label="O.F." value={input.cabecera.ordenFabricacion ?? ''} onChange={(v) => setCab('ordenFabricacion', v)} />
        <CampoNum name="cantidad" error={errores.cantidad} label="Cantidad" value={input.cantidad} onChange={(v) => set('cantidad', v)} />
      </PasoFormulario>

      {/* La forma con lo que la define al lado del tipo (aguas, chaflán o radio) y, debajo, la bobina
          a todo lo ancho. */}
      <PasoFormulario numero={1} titulo="Forma del remolque" columnas={4}>
        <CampoSelect name="tipoPerfil" label="Tipo" span={2} value={input.tipoPerfil} opciones={PERFILES_VISIBLES}
          sinElegir="Elige el perfil" error={errores.tipoPerfil}
          onChange={(v) => set('tipoPerfil', v as LonaInput['tipoPerfil'])} />
        {['TIPO 02', 'TIPO 03'].includes(input.tipoPerfil) && (
          <CampoNum name="aguas" error={errores.aguas} label="Aguas" value={input.aguas ?? 0} onChange={(v) => set('aguas', v)} />
        )}
        {input.tipoPerfil === 'TIPO 04' && (
          <CampoNum name="chaflan" error={errores.chaflan} label="Chaflán · vértices"
            value={input.chaflan ?? 0} onChange={(v) => set('chaflan', v)} />
        )}
        {input.tipoPerfil === 'TIPO 05' && (
          <CampoNum name="radioEsquina" error={errores.radioEsquina} label="Radio esquina" value={input.radioEsquina ?? 0} onChange={(v) => set('radioEsquina', v)} />
        )}
        {/* Los radios del TIPO 03 y del TIPO 04 son opcionales (sin ellos, aristas vivas): van tras un
            Sí / No. El del TIPO 05 no, porque sin él no hay contorno. */}
        {camposRadio.length > 0 && (
          <CampoSiNo name="conRadios" label="Con radios" value={verRadios} onChange={cambiarRadios} />
        )}
        {camposRadio.length > 0 && verRadios && (
          <div className="rem-banda rem-span-4">
            {camposRadio.map((campo) => (
              <CampoNum key={campo} name={campo} label={ETIQUETAS_RADIO[campo]} value={input[campo] ?? 0}
                onChange={(v) => set(campo, v)} />
            ))}
          </div>
        )}
        <CampoMaterial span={4} value={input.material} opciones={materiales} error={errores.material}
          metrosTela={metrosTela} onChange={(v) => set('material', v)} />
      </PasoFormulario>

      {/* Las dos recogidas se reparten el ancho que deja el Sí / No; un nombre largo («Puentes Hijos de
          Pedro López») pasa a dos renglones en vez de cortarse. */}
      <PasoFormulario numero={2} titulo="Recogidas" columnas="recogidas">
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
        <CampoNum name="largo" error={errores.largo} label="Largo" value={input.largo} onChange={(v) => set('largo', v)} />
        <CampoNum name="ancho" error={errores.ancho} label="Ancho" value={input.ancho}
          onChange={(v) => onChange(conMedidaDelante(input, 'ancho', v, verDetras))} />
        <CampoNum name="altoDelante" error={errores.altoDelante} label="Alto delante" value={input.altoDelante}
          onChange={(v) => onChange(conMedidaDelante(input, 'altoDelante', v, verDetras))} />
        <div className="rem-contorno">
          <CampoNum name="contorno" error={errores.contorno} label="Contorno" value={contornoVisible}
            onChange={(v) => onChange({ ...input, contorno: v, contornoScad: undefined })} />
          {botonCalculado(contornoVisible, contornoExacto,
            (v) => onChange({ ...input, contorno: v, contornoScad: undefined }))}
        </div>
        {/* Remolque más ancho (o más alto) detrás: sus medidas de detrás, con el contorno de esa
            punta, porque el paño contorno se corta en trapecio (CAD de Iván, 30/09/2026). La caja solo
            sale con ellas: el Sí / No suelto no necesita marco. */}
        <div className={`${verDetras ? 'rem-banda' : 'rem-fila'} rem-span-4`}>
          <CampoSiNo name="detrasDistinto" label="Detrás distinto" value={verDetras} onChange={cambiarDetras} />
          {verDetras && (
            <>
              <CampoNum name="anchoAtras" label="Ancho detrás" value={input.anchoAtras ?? 0} onChange={(v) => set('anchoAtras', v)} />
              <CampoNum name="altoAtras" label="Alto detrás" value={input.altoAtras} onChange={(v) => set('altoAtras', v)} />
              <div className="rem-contorno">
                <CampoNum name="contornoAtras" error={errores.contornoAtras} label="Contorno detrás"
                  value={input.contornoAtras ?? 0} onChange={(v) => set('contornoAtras', v)} />
                {botonCalculado(input.contornoAtras ?? 0, contornoAtrasExacto, (v) => set('contornoAtras', v))}
              </div>
            </>
          )}
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
        {/* La ventana, sus dos medidas y la rotulación en una sola fila. */}
        <CampoSiNo name="ventana" label="Ventana" error={errores.ventana}
          value={input.ventana} onChange={(v) => set('ventana', v)} />
        {input.ventana ? (
          <>
            <CampoNum name="ventanaAncho" error={errores.ventanaAncho} label="Ancho ventana" value={input.ventanaAncho ?? 0}
              onChange={(v) => set('ventanaAncho', v)} />
            <CampoNum name="ventanaAlto" error={errores.ventanaAlto} label="Alto ventana" value={input.ventanaAlto ?? 0}
              onChange={(v) => set('ventanaAlto', v)} />
          </>
        ) : <span className="rem-span-2" aria-hidden="true" />}
        {/* Después de la ventana y sus medidas, como en la web de remolques de antes (orden de tabulación). */}
        <CampoSiNo name="rotulacion" label="Rotulación" error={errores.rotulacion}
          value={input.rotulacion} onChange={(v) => set('rotulacion', v)} />
        {/* Por líneas, como las observaciones de tela de los toldos (Iván, 30/09/2026); se guardan en un
            solo texto, una línea por renglón. Solo aquí: el dibujo ya no tiene su propia casilla. */}
        <div className="rem-span-4">
          <ObservationLines label="Observaciones" value={input.observaciones} onChange={(v) => set('observaciones', v)} ajustarTexto />
        </div>
      </PasoFormulario>
    </div>
  );
}
