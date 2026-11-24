import React from 'react';
import type { MedidasCal } from '../../remolques/ganado/medidas.ts';
import { CIERRES_TRASEROS, esFruncidoGanado, PIEZAS_CON_HEBILLA, ZONAS_RECOGIDAS,
  type RecogidasGanado, type TraseroGanado, type TrazadoGanado } from '../../remolques/ganado/recogidas.ts';
import { CampoNum, CampoSelect, CampoSiNo, CampoTexto, PasoFormulario } from './Campos';

const TRASERO: TraseroGanado = { ancho: 0, alto: 0, aguas: 0, radio: 0, altoOreja: 0, margenBajo: 0, margenSuperior: 0 };
const TRAZADO: TrazadoGanado = { corte: '', terminado: '', marcas: '', ollaos: '' };
const CIERRES = Object.entries(CIERRES_TRASEROS).map(([value, label]) => ({ value, label }));
const PUERTAS = [{ value: 'VELCRO', label: 'Con velcro' }, { value: 'PUENTES', label: 'Con puentes' }];

function Coordenadas({ name, label, value, onChange }: {
  name: string; label: string; value: string; onChange: (v: string) => void;
}) {
  return <label className="rem-campo">
    <span>{label}</span>
    <textarea name={name} data-campo="medidasCal" rows={3} value={value} onChange={e => onChange(e.target.value)} />
  </label>;
}

export function RecogidasGanadoCampos({ m, onChange }: { m: MedidasCal; onChange: (m: MedidasCal) => void }) {
  const r = m.recogidas;
  const set = (recogidas: RecogidasGanado) => onChange({ ...m, recogidas });
  const t = r?.trasero ?? TRASERO;
  const puerta = r?.puerta;
  return <PasoFormulario titulo="Recogidas de ganado" columnas={4}>
    <CampoSiNo span={4} name="recogidasGanado" label="Configurar las recogidas de este pedido" value={Boolean(r)}
      onChange={v => onChange({ ...m, fruncir: v ? m.fruncir || 5 : m.fruncir,
        recogidas: v ? { atras: m.recogidaAtras === 'CUERDA' ? 'CUERDA_FRUNCIDA' : 'GOMA_FRUNCIDA' } : undefined })} />
    {r && <>
      <CampoSelect name="cierreTraseroGanado" label="Cierre trasero" value={r.atras} opciones={CIERRES}
        onChange={atras => set({ ...r, atras: atras as RecogidasGanado['atras'], recortes: atras === 'PUENTES' && r.recortes })} />
      {esFruncidoGanado(r) && <>
        <CampoNum name="fruncir" label="Canal trasero (cm)" value={m.fruncir} onChange={fruncir => onChange({ ...m, fruncir })} />
        <CampoNum name="diametroFruncido" label="Diámetro según pedido (mm)" value={r.diametro ?? 0} onChange={diametro => set({ ...r, diametro: diametro || undefined })} />
        <CampoNum name="salidaFruncido" label="Sobrante por lado (cm)" value={r.salida ?? 0} onChange={salida => set({ ...r, salida: salida || undefined })} />
        <CampoSiNo name="marcaContinuaFruncido" span={2} label="Marca continua del canal" value={r.marcaContinua !== false}
          onChange={marcaContinua => set({ ...r, marcaContinua })} />
      </>}
      {r.atras === 'GOMA_OLLAOS' && <CampoSiNo name="panoGomaGanado" label="Goma por ollaos con paño trasero" value={r.sinPano !== true}
        onChange={v => set({ ...r, sinPano: !v })} />}
      {['OREJA', 'VELCRO'].includes(r.atras) && <>
        {([
          ['ancho', 'Ancho entre laterales'], ['alto', 'Alto al centro'], ['aguas', 'Aguas'], ['radio', 'Radio del hombro'],
          ['oreja', 'Oreja útil por lado'], ['altoOreja', 'Alto de la oreja'],
          ['margenBajo', 'Bastilla inferior'], ['margenOreja', 'Añadido por cada lado'], ['margenSuperior', 'Costura superior'],
        ] as const).map(([k, label]) => <CampoNum key={k} name={`ganadoTrasero-${k}`} label={`${label} (cm)`} value={t[k] ?? (k === 'oreja' ? 10 : t.margenBajo)}
          onChange={v => set({ ...r, trasero: { ...t, [k]: v } })} />)}
        <Coordenadas name="ollaosGanadoTrasero" label="Ollaos traseros (x / y, cm)" value={t.ollaos ?? ''}
          onChange={ollaos => set({ ...r, trasero: { ...t, ollaos } })} />
      </>}
      {r.atras === 'VELCRO' && <>
        <CampoNum name="anchoVelcroGanado" label="Ancho del velcro trasero (cm)" value={r.velcro?.anchoVelcro ?? 0}
          onChange={anchoVelcro => set({ ...r, velcro: { anchoVelcro, color: r.velcro?.color ?? '' } })} />
        <CampoTexto name="colorVelcroGanado" label="Color del velcro trasero" value={r.velcro?.color ?? ''}
          onChange={color => set({ ...r, velcro: { color, anchoVelcro: r.velcro?.anchoVelcro ?? 0 } })} />
      </>}
      {r.atras === 'PUENTES' && <>
        <CampoNum name="alturaPuentesGanado" label="Altura de los puentes según pedido (cm)" value={r.alturaPuentes ?? 0}
          onChange={alturaPuentes => set({ ...r, alturaPuentes: alturaPuentes || undefined })} />
        <CampoSiNo name="puentesFueraLineaGanado" label="Trasero fuera de línea" value={Boolean(r.fueraLinea)}
          onChange={fueraLinea => set({ ...r, fueraLinea })} />
        <CampoSiNo name="recortesPuertaGanado" span={2} label="Puerta trasera con recortes para los postes" value={Boolean(r.recortes)}
          onChange={recortes => set({ ...r, recortes })} />
        {r.recortes && <>
          <CampoNum name="tiraOrejaLargo" label="Largo de la tira de oreja (cm)" value={r.tira?.largo ?? 0}
            onChange={largo => set({ ...r, tira: { largo, ancho: r.tira?.ancho ?? 0 } })} />
          <CampoNum name="tiraOrejaAncho" label="Ancho de la tira de oreja (cm)" value={r.tira?.ancho ?? 0}
            onChange={ancho => set({ ...r, tira: { ancho, largo: r.tira?.largo ?? 0 } })} />
        </>}
      </>}
      {m.puerta !== 'NINGUNA' && <>
        <CampoSelect name="cierrePuertaGanado" label={`Cierre de puerta ${m.puerta}`} value={puerta?.cierre ?? ''} opciones={PUERTAS}
          sinElegir="Según medidas de Cal" onChange={cierre => set({ ...r, puerta: cierre ? { ...puerta, cierre: cierre as NonNullable<RecogidasGanado['puerta']>['cierre'] } : undefined })} />
        {puerta && <CampoSiNo name="puertaIntegradaGanado" label="Puerta integrada en el morro" value={Boolean(puerta.integrada)}
          onChange={integrada => set({ ...r, puerta: { ...puerta, integrada } })} />}
        {puerta?.cierre === 'VELCRO' && <>
          <CampoNum name="anchoVelcroPuertaGanado" label="Ancho del velcro de puerta (cm)" value={puerta.anchoVelcro ?? 0}
            onChange={anchoVelcro => set({ ...r, puerta: { ...puerta, anchoVelcro } })} />
          <CampoTexto name="colorVelcroPuertaGanado" label="Color del velcro de puerta" value={puerta.color ?? ''}
            onChange={color => set({ ...r, puerta: { ...puerta, color } })} />
          <CampoSiNo name="solapasGanado" label="Dos solapas de puerta" value={Boolean(puerta.solapas)}
            onChange={v => set({ ...r, puerta: { ...puerta, solapas: v ? { largo: 0, ancho: 0 } : undefined } })} />
          {puerta.solapas && <>
            <CampoNum name="solapaLargoGanado" label="Largo terminado de solapa (cm)" value={puerta.solapas.largo}
              onChange={largo => set({ ...r, puerta: { ...puerta, solapas: { largo, ancho: puerta.solapas!.ancho } } })} />
            <CampoNum name="solapaAnchoGanado" label="Ancho terminado de solapa (cm)" value={puerta.solapas.ancho}
              onChange={ancho => set({ ...r, puerta: { ...puerta, solapas: { ancho, largo: puerta.solapas!.largo } } })} />
          </>}
        </>}
      </>}
      <details className="rem-span-4">
        <summary>Hebillas para sujetar los paños enrollados</summary>
        <p className="gan-dibujo-nota">Un centro por fila. Escribe X / Y en cm y el giro en grados desde la horizontal. El plano dibuja cada hebilla de 2 × 10.</p>
        {Object.entries(ZONAS_RECOGIDAS).map(([id, nombre]) => {
          const zona = id as keyof typeof ZONAS_RECOGIDAS;
          const s = r.sujeciones?.[zona];
          return <div className="rem-rejilla rem-rejilla-4" key={zona}>
            <CampoSiNo name={`hebillas-${zona}`} label={`${nombre} con hebillas`} value={Boolean(s)}
              onChange={v => set({ ...r, sujeciones: { ...r.sujeciones, [zona]: v ? { pieza: 'Cuerpo', posiciones: '' } : undefined } })} />
            {s && <>
              <CampoSelect name={`pieza-hebillas-${zona}`} label={`Pieza de las hebillas · ${nombre}`} value={s.pieza}
                opciones={PIEZAS_CON_HEBILLA.map(value => ({ value, label: value }))}
                onChange={pieza => set({ ...r, sujeciones: { ...r.sujeciones, [zona]: { ...s, pieza: pieza as typeof s.pieza } } })} />
              <Coordenadas name={`posiciones-hebillas-${zona}`} label={`Centros y giro · ${nombre}`} value={s.posiciones}
                onChange={posiciones => set({ ...r, sujeciones: { ...r.sujeciones, [zona]: { ...s, posiciones } } })} />
            </>}
          </div>;
        })}
      </details>
      <details className="rem-span-4">
        <summary>Situación del velcro en el plano</summary>
        <p className="gan-dibujo-nota">Escribe X1 / Y1 / X2 / Y2 / ancho, en cm. Introduce un tramo por fila. BRAVO en las tapas por el revés, SUAVE por el derecho.</p>
        <div className="rem-rejilla rem-rejilla-4">
          {PIEZAS_CON_HEBILLA.filter(p => p !== 'Puerta' || puerta).map(pieza =>
            <Coordenadas key={pieza} name={`cintas-${pieza}`} label={pieza} value={r.cintas?.[pieza] ?? ''}
              onChange={v => set({ ...r, cintas: { ...r.cintas, [pieza]: v } })} />)}
        </div>
      </details>
      <details className="rem-span-4" open={r.atras === 'PUENTES' || r.atras === 'GOMA_OLLAOS' || Boolean(puerta) || undefined}>
        <summary>Trazados del pedido</summary>
        <p className="gan-dibujo-nota">En puentes usa el trazado rectificado con orejas, rebajes y ollaos. Dibuja los contornos en orden, sin repetir el primer punto. Escribe X / Y en cm, con la curvatura DXF como tercera columna si hay arco. Las marcas usan X1 / Y1 / X2 / Y2. Una fila por punto o marca.</p>
        {PIEZAS_CON_HEBILLA.filter(p => p !== 'Puerta' || (puerta && !puerta.integrada)).map(pieza => <details key={pieza}>
          <summary>{pieza}</summary>
          <div className="rem-rejilla rem-rejilla-4">
            {Object.entries({ corte: 'Contorno de corte', terminado: 'Contorno terminado', marcas: 'Marcas', ollaos: 'Centros de ollaos' }).map(([k, label]) => {
              const campo = k as keyof TrazadoGanado;
              const trazado = r.trazados?.[pieza] ?? TRAZADO;
              return <Coordenadas key={campo} name={`trazado-${pieza}-${campo}`} label={label} value={trazado[campo]}
                onChange={v => set({ ...r, trazados: { ...r.trazados, [pieza]: { ...trazado, [campo]: v } } })} />;
            })}
          </div>
        </details>)}
      </details>
    </>}
  </PasoFormulario>;
}
