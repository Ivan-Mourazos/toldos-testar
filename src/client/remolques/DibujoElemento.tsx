import React from 'react';
import type { CalcParams } from '../../remolques/calc/params.ts';
import type { ElementoEscena } from '../../remolques/escena/tipos.ts';
import { DibujoRemolque } from './DibujoRemolque';
import { Escena3D } from './Escena3D';

// El dibujo de un elemento (lona o baquetón): el render 3D y, de respaldo, el dibujo técnico de la
// web de remolques. Lo usan la pantalla de Remolques y el pedido guardado abierto en Pedidos, para
// que los dos enseñen lo mismo. Sin `onSnapshotReady` ni `onObservacionesChange`: las
// observaciones se escriben por líneas en el formulario (Iván, 30/09/2026).
export function DibujoElemento({ elemento, params }: { elemento: ElementoEscena; params: CalcParams }) {
  if (elemento.tipo === 'lona') {
    const { input: lona, res } = elemento;
    return (
      <DibujoRemolque tipo="lona" input={lona} res={res} params={params}
        respaldo={(
          <Escena3D modo="lona" medidasHechas={res.lonaHecha} largo={lona.largo} ancho={lona.ancho} anchoAtras={lona.anchoAtras}
            altoDelante={lona.altoDelante} altoAtras={lona.altoAtras}
            aguas={lona.aguas} radioCumbrera={lona.radioCumbrera} radioHombro={lona.radioHombro}
            radioEsquina={lona.radioEsquina} chaflan={lona.chaflan}
            radioChaflanAbajo={lona.radioChaflanAbajo} radioChaflanArriba={lona.radioChaflanArriba}
            ollaos={res.reparto}
            recogeDelante={lona.recogeDelante} recogeAtras={lona.recogeAtras}
            bastillaEnfundar={lona.bastillaEnfundar}
            tipoPerfil={lona.tipoPerfil} ventana={lona.ventana}
            ventanaAncho={lona.ventanaAncho} ventanaAlto={lona.ventanaAlto}
            material={lona.material} />
        )} />
    );
  }
  const { input: baq, res } = elemento;
  return (
    <DibujoRemolque tipo="baqueton" input={baq} res={res} params={params}
      respaldo={(
        <Escena3D modo="baqueton" medidasHechas={res.remolqueHecho} largo={baq.largo} ancho={baq.ancho}
          altoDelante={0} altoAtras={0} tipoPerfil="TIPO 01"
          baqueton={baq.baqueton} baquetonDelantero={res.baquetonDelantero} baquetonTrasero={res.baquetonTrasero}
          material={baq.material} ollaos={res.reparto} />
      )} />
  );
}
