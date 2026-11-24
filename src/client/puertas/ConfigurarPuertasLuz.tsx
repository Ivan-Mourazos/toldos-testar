import React, { useId, useState } from 'react';
import { alturasTubos, calcularPuerta, yEnTramo } from '../../puertas/calcular.ts';
import { fichaDePuerta, tipoDePuerta } from '../../puertas/clientes.ts';
import { cambiarTipoDelCliente } from '../../puertas/nuevaPuertaCliente.ts';
import { huecosCintasPuertasLuz, REGLAS_PUERTAS_LUZ } from '../../puertas/puertasluz.ts';
import type { ConfiguracionPuertasLuz, Entrada, Puerta } from '../../puertas/tipos.ts';
import { SegmentedField } from '../components/SegmentedField';
import { SelectField } from '../components/SelectField';
import { AlzadoPuerta } from './AlzadoPuerta';
import { cintasDesdeFila, ejesDesdeTramos, leerCadena } from './cadenaDibujo';
import { desdeMilimetros, medidaPuerta as num, textoMedidasMm, type UnidadPuerta } from './medidasPuertas';
import { NumeroPuerta } from './NumeroPuerta';
import { VentanasEntreTubos } from './PuertasView';

type TabLuz = 'medidas' | 'et' | 'ventanas' | 'faldon' | 'otros';

function Numero({ titulo, valor, cambiar, unidad = 'cm' }: { titulo: string; valor: number | null; unidad?: UnidadPuerta; cambiar: (v: number) => void }) {
  return <NumeroPuerta titulo={titulo} valor={valor} unidad={unidad} cambiar={v => cambiar(v ?? 0)} />;
}

export function ConfigurarPuertasLuz({ p, cambiar, corte, derecha, letra, vistas }: {
  p: Puerta;
  cambiar: (p: Puerta) => void;
  corte?: React.ReactNode;
  derecha: 'alzado' | 'corte';
  letra: string;
  vistas?: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabLuz>('medidas');
  const [cadenaTxt, setCadenaTxt] = useState('');
  const [cadenaAviso, setCadenaAviso] = useState('');
  const [tramosTxt, setTramosTxt] = useState('');
  const [tramosAviso, setTramosAviso] = useState('');
  const [cintasTxt, setCintasTxt] = useState('');
  const [cintasAviso, setCintasAviso] = useState('');
  const pasosId = useId();
  const [pasosTxt, setPasosTxt] = useState(() => p.apilable.pasos.map(num).join('; '));
  const [pasosPrev, setPasosPrev] = useState(p.apilable.pasos);
  if (pasosPrev !== p.apilable.pasos) {
    setPasosPrev(p.apilable.pasos);
    setPasosTxt(p.apilable.pasos.map(num).join('; '));
  }

  const ficha = fichaDePuerta(p);
  const pl = p.puertasluz!;
  const r = calcularPuerta(p);
  const esTransp = pl.variante === 'transparente';
  const esApilable = pl.variante === 'apilable';

  const patch = (q: Partial<Puerta>) => cambiar({ ...p, ...q, confirmada: false, ventanasConfirmadas: false });
  const setLuz = (q: Partial<ConfiguracionPuertasLuz>) => patch({ puertasluz: { ...pl, ...q } });

  const anchoCinta = pl.cintaAncho ?? REGLAS_PUERTAS_LUZ.cintaAncho;
  const altoCinta = pl.cintaAlto ?? REGLAS_PUERTAS_LUZ.cintaAlto;

  function actualizarCadena(parche: Partial<Puerta['apilable']>) {
    const nuevo: Puerta = { ...p, apilable: { ...p.apilable, ...parche }, confirmada: false, ventanasConfirmadas: false };
    nuevo.entradas = alturasTubos(nuevo).map((altura, i) => ({
      ...(p.entradas[i] ?? { diametro: 42 as const, largo: p.frente, alto: pl.anchoEt, huecos: [] }),
      altura,
      largo: p.frente,
    }));
    nuevo.ventanas = nuevo.ventanas.map(v => (v.tramo ? { ...v, y: yEnTramo(nuevo, v.tramo, v.alto) ?? v.y } : v));
    cambiar(nuevo);
  }

  function aplicarCadena() {
    if (!cadenaTxt.trim()) { setCadenaAviso(''); return; }
    const c = leerCadena(cadenaTxt, p.alto, 'mm');
    if (!c) { setCadenaAviso('Escribe las cotas separadas por espacios, de abajo arriba (en mm).'); return; }
    actualizarCadena({ pie: c.pie, pasos: c.pasos, cabecera: c.cabecera });
    const total = c.pie + c.pasos.reduce((s, v) => s + v, 0) + c.cabecera;
    setCadenaAviso(`Leído en mm: pie ${num(c.pie)} · ${c.pasos.length} pasos · cabecera ${num(c.cabecera)} · suma ${num(total)} mm.`);
  }

  function aplicarTramos() {
    if (!tramosTxt.trim()) { setTramosAviso(''); return; }
    const res = ejesDesdeTramos(tramosTxt, p.alto, 'mm');
    if ('error' in res) { setTramosAviso(textoMedidasMm(res.error)); return; }
    patch({
      entradas: res.ejes.map((altura, i) => ({
        ...(p.entradas[i] ?? { diametro: 42 as const, largo: p.frente, alto: pl.anchoEt, huecos: [] }),
        altura,
        largo: p.frente,
        alto: p.entradas[i]?.alto || pl.anchoEt,
      })),
    });
    setTramosAviso(`Leído en mm: ${res.ejes.length} E.T. con eje a ${res.ejes.map(num).join(', ')} mm desde abajo.`);
  }

  const conCintas = (e: Entrada) => e.huecos.length > 0;
  const xsCintasActuales = p.entradas.find(conCintas)?.huecos.map(h => h.x) ?? [];

  function aplicarCintas() {
    if (!cintasTxt.trim()) { setCintasAviso(''); return; }
    const res = cintasDesdeFila(cintasTxt.trim().split(/[\s;]+/).map(x => Number(x.replace(',', '.'))), p.frente, anchoCinta, 'mm');
    if ('error' in res) { setCintasAviso(textoMedidasMm(res.error)); return; }
    const ninguna = !p.entradas.some(conCintas);
    patch({
      entradas: p.entradas.map((e, i) => ({
        ...e,
        huecos: (ninguna ? i % 2 === 0 : conCintas(e)) ? huecosCintasPuertasLuz(res.xs, e.alto || pl.anchoEt, anchoCinta, altoCinta) : [],
      })),
    });
    setCintasAviso(`Cintas (${num(anchoCinta)} × ${num(altoCinta)} mm, sin muescas laterales) a ${res.xs.map(num).join(', ')} mm.`);
  }

  const texto = (titulo: string, key: 'of' | 'color' | 'material' | 'materialCristal' | 'materialSaco' | 'notaPlano', esCodigo = false) => (
    <label className="field puerta-campo">
      <span>{titulo}</span>
      <input
        aria-label={titulo}
        value={p[key] ?? ''}
        autoCorrect={esCodigo ? 'off' : undefined}
        autoCapitalize={esCodigo ? 'none' : undefined}
        spellCheck={esCodigo ? false : undefined}
        onChange={e => patch({ [key]: e.target.value })}
      />
    </label>
  );

  const tabs: Array<[TabLuz, string]> = [
    ['medidas', 'Medidas'],
    ['et', esTransp ? 'Tramos' : 'E.T.'],
    ...(!esTransp ? [['ventanas', 'Ventanas']] as Array<[TabLuz, string]> : []),
    ['faldon', 'Faldón y arena'],
    ['otros', 'Otros ajustes'],
  ];
  const activa: TabLuz = tabs.some(([k]) => k === tab) ? tab : 'medidas';

  const margen = pl.margenLateral ?? 6;
  const tramosTransp = pl.tramosTransparentes ?? [];

  return <>
    <div className="puerta-config-alzado">
      <section className="puerta-config panel panel-vidrio" aria-label="Configurador de Puertas Luz">
        <header><h2>Configurador</h2><span>Puertas Luz · medidas en mm</span></header>
        <div className="tira-3d puerta-pestanas" role="tablist" aria-label="Partes de la puerta">
          {tabs.map(([id, nombre]) => (
            <button key={id} type="button" role="tab" aria-selected={activa === id}
              className={`pestana ${activa === id ? 'pestana-activa' : ''}`} onClick={() => setTab(id)}>{nombre}</button>
          ))}
        </div>

        {activa === 'medidas' && <>
          <div className="puerta-campos">
            {texto('OF de puerta', 'of', true)}
            <Numero titulo="Cantidad de puertas iguales" unidad="cantidad" valor={p.cantidad} cambiar={cantidad => patch({ cantidad })} />
            <SelectField label="Tipo de puerta" value={tipoDePuerta(p).id} options={ficha.tipos.map(t => t.id)}
              optionLabel={v => ficha.tipos.find(t => t.id === v)?.nombre ?? ''} onChange={v => cambiar(cambiarTipoDelCliente(p, v))} />
            <Numero titulo="Frente (mm)" valor={p.frente || null} cambiar={frente => patch({ frente, entradas: p.entradas.map(e => ({ ...e, largo: frente })) })} />
            <Numero titulo="Alto (mm)" valor={p.alto || null} cambiar={alto => patch({ alto })} />
            {texto('Color / RAL', 'color')}
          </div>
          <p className="puerta-ayuda">
            {esTransp
              ? 'Enrollable de PVC transparente 1000 micras con tiras laterales de lona, faldón exterior de 350 mm y saco contrapeso interior para arena.'
              : 'Faldón exterior (2 × alto visible) y saco contrapeso interior de 220 mm para arena con marcas a 30 mm. Laterales al corte.'}
          </p>
        </>}

        {activa === 'et' && <>
          {esTransp ? (
            <fieldset>
              <legend>Tramos transparentes y tiras laterales</legend>
              <div className="puerta-campos">
                <div className="puerta-saco-util">
                  <Numero titulo="Margen lateral de lona (mm)" valor={margen} cambiar={margenLateral => setLuz({ margenLateral })} />
                  <div className="puerta-saco-rapido" role="group" aria-label="Márgenes habituales">
                    {[6, 15].map(cm => (
                      <button type="button" key={cm} className={`chip-3d ${Math.abs(margen - cm) < 0.01 ? 'glass-chip-activo' : ''}`}
                        aria-pressed={Math.abs(margen - cm) < 0.01} onClick={() => setLuz({ margenLateral: cm })}>{cm * 10}</button>
                    ))}
                  </div>
                </div>
                <Numero titulo="Ancho E.T. entre tramos (mm)" valor={pl.anchoEt} cambiar={anchoEt => setLuz({ anchoEt })} />
              </div>
              <p className="puerta-ayuda">
                {p.frente > 2 * margen
                  ? `Cristal: ${num(p.frente - 2 * margen + 4)} mm de ancho · tiras laterales de lona: ${num(margen + 1)} mm (×2 por tramo).`
                  : 'Indica un frente mayor que el doble del margen lateral.'}
              </p>
              {tramosTransp.map((h, i) => (
                <div className="puerta-campos" key={i}>
                  <Numero titulo={`Alto de corte tramo ${i + 1} (mm)`} valor={h} cambiar={v => setLuz({ tramosTransparentes: tramosTransp.map((x, j) => (j === i ? v : x)) })} />
                  <button type="button" className="ghost-button" disabled={tramosTransp.length <= 1}
                    onClick={() => setLuz({ tramosTransparentes: tramosTransp.filter((_, j) => j !== i) })}>Quitar tramo {i + 1}</button>
                </div>
              ))}
              <button type="button" className="ghost-button" onClick={() => setLuz({ tramosTransparentes: [...tramosTransp, 60] })}>Añadir tramo transparente</button>
            </fieldset>
          ) : esApilable ? <>
            <fieldset>
              <legend>Cadena de tubos</legend>
              <label className="field puerta-campo puerta-campo-ancho">
                <span>Cadena del dibujo, de abajo arriba (mm)</span>
                <input aria-label="Cadena del dibujo" value={cadenaTxt} placeholder="676 488 488 488 488 488 488 488 488"
                  onChange={e => setCadenaTxt(e.target.value)} onBlur={aplicarCadena}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) aplicarCadena(); }} />
                <small>{cadenaAviso || 'Rellena pie (desde el bajo del faldón), pasos y cabecera de una vez en mm.'}</small>
              </label>
              <div className="puerta-campos">
                <Numero titulo="Pie hasta primer eje (mm)" valor={p.apilable.pie || null} cambiar={pie => actualizarCadena({ pie })} />
                <Numero titulo="Cabecera hasta último eje (mm)" valor={p.apilable.cabecera || null} cambiar={cabecera => actualizarCadena({ cabecera })} />
                <Numero titulo="Bolsillo superior (mm)" valor={p.apilable.bolsillo} cambiar={bolsillo => actualizarCadena({ bolsillo })} />
                <label className="field puerta-campo puerta-campo-ancho">
                  <span>Pasos entre tubos (mm)</span>
                  <input aria-label="Pasos entre tubos (mm)" aria-describedby={pasosId} value={pasosTxt}
                    onChange={e => setPasosTxt(e.target.value)}
                    onBlur={() => {
                      const partes = pasosTxt.trim() ? pasosTxt.split(';').map(x => Number(x.trim().replace(',', '.'))) : [];
                      if (partes.every(Number.isFinite)) actualizarCadena({ pasos: partes.map(desdeMilimetros) });
                    }} />
                  <small id={pasosId}>Un valor por tramo, de abajo arriba, separado con ;</small>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Entradas de tubo y cintas · {p.entradas.length} E.T. (sin muescas laterales)</legend>
              <div className="puerta-campos">
                <Numero titulo="Ancho de corte E.T. (mm)" valor={pl.anchoEt} cambiar={anchoEt => patch({
                  puertasluz: { ...pl, anchoEt },
                  entradas: p.entradas.map(e => ({ ...e, alto: anchoEt, huecos: conCintas(e) ? huecosCintasPuertasLuz(e.huecos.map(h => h.x), anchoEt, anchoCinta, altoCinta) : [] })),
                })} />
                <div className="puerta-saco-util">
                  <Numero titulo="Ancho recorte cinta (mm)" valor={anchoCinta} cambiar={cintaAncho => setLuz({ cintaAncho })} />
                  <div className="puerta-saco-rapido" role="group" aria-label="Anchos de cinta habituales">
                    {[8, 12.5].map(cm => (
                      <button type="button" key={cm} className={`chip-3d ${Math.abs(anchoCinta - cm) < 0.01 ? 'glass-chip-activo' : ''}`}
                        aria-pressed={Math.abs(anchoCinta - cm) < 0.01} onClick={() => setLuz({ cintaAncho: cm })}>{cm * 10}</button>
                    ))}
                  </div>
                </div>
                <Numero titulo="Alto recorte cinta (mm)" valor={altoCinta} cambiar={cintaAlto => setLuz({ cintaAlto })} />
                <label className="field puerta-campo puerta-campo-ancho">
                  <span>Cintas del dibujo, desde la izquierda (mm)</span>
                  <input aria-label="Cintas del dibujo" value={cintasTxt} placeholder="396 80 1279 80"
                    onChange={e => setCintasTxt(e.target.value)} onBlur={aplicarCintas}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) aplicarCintas(); }} />
                  <small>{cintasAviso || 'Mitad izquierda en mm: hasta el primer recorte, ancho del recorte (80 o 125 mm), hasta el siguiente…'}</small>
                </label>
              </div>
              {p.entradas.map((e, i) => (
                <div className="puerta-campos puerta-tubo-fila" key={i}>
                  <span className="puerta-tubo-nombre">Tubo {i + 1} · eje a {num(e.altura)} mm</span>
                  <Numero titulo={`Alto E.T. ${i + 1} (mm)`} valor={e.alto} cambiar={alto => patch({
                    entradas: p.entradas.map((x, j) => (j === i ? { ...x, alto, huecos: conCintas(x) ? huecosCintasPuertasLuz(x.huecos.map(h => h.x), alto, anchoCinta, altoCinta) : [] } : x)),
                  })} />
                  <SegmentedField label={`Cintas tubo ${i + 1}`} value={conCintas(e) ? 'Sí' : 'No'} options={['No', 'Sí']} onChange={v => {
                    if (v === 'Sí' && !xsCintasActuales.length) { setCintasAviso('Escribe antes las cintas del dibujo.'); return; }
                    patch({
                      entradas: p.entradas.map((x, j) => (j === i ? { ...x, huecos: v === 'Sí' ? huecosCintasPuertasLuz(xsCintasActuales, x.alto || pl.anchoEt, anchoCinta, altoCinta) : [] } : x)),
                    });
                  }} />
                </div>
              ))}
            </fieldset>
          </> : <>
            <fieldset>
              <legend>Cabecera y entradas de tubo · {p.entradas.length} E.T.</legend>
              <SegmentedField label="Remate superior" value={pl.cabecera === 'bd' ? 'BD 4,5 (+45 mm)' : 'Varilla negra 4,5 (+35 mm)'}
                options={['Varilla negra 4,5 (+35 mm)', 'BD 4,5 (+45 mm)']}
                onChange={v => setLuz({ cabecera: v.startsWith('BD') ? 'bd' : 'varilla' })} />
              <div className="puerta-campos">
                <label className="field puerta-campo puerta-campo-ancho">
                  <span>Tramos de las E.T., de abajo arriba (mm)</span>
                  <input aria-label="Tramos de las E.T." value={tramosTxt} placeholder="995 1005"
                    onChange={e => setTramosTxt(e.target.value)} onBlur={aplicarTramos}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) aplicarTramos(); }} />
                  <small>{tramosAviso || 'Del bajo al primer eje y de eje a eje en mm.'}</small>
                </label>
                <Numero titulo="Ancho de corte E.T. (mm)" valor={pl.anchoEt} cambiar={anchoEt => patch({
                  puertasluz: { ...pl, anchoEt }, entradas: p.entradas.map(e => ({ ...e, alto: anchoEt })),
                })} />
              </div>
              {p.entradas.map((e, i) => (
                <div className="puerta-campos" key={i}>
                  <Numero titulo={`Eje tubo ${i + 1} (mm)`} valor={e.altura} cambiar={altura => patch({ entradas: p.entradas.map((x, j) => (j === i ? { ...x, altura } : x)) })} />
                  <Numero titulo={`Alto E.T. ${i + 1} (mm)`} valor={e.alto} cambiar={alto => patch({ entradas: p.entradas.map((x, j) => (j === i ? { ...x, alto } : x)) })} />
                  <button type="button" className="ghost-button" onClick={() => patch({ entradas: p.entradas.filter((_, j) => j !== i) })}>Quitar E.T. {i + 1}</button>
                </div>
              ))}
              <button type="button" className="ghost-button" onClick={() => patch({ entradas: [...p.entradas, { altura: 0, diametro: 42, largo: p.frente, alto: pl.anchoEt, huecos: [] }] })}>Añadir E.T.</button>
            </fieldset>
          </>}
        </>}

        {activa === 'ventanas' && !esTransp && <VentanasEntreTubos p={p} cambiar={cambiar} />}

        {activa === 'faldon' && <>
          <fieldset>
            <legend>Faldón exterior (doble capa)</legend>
            <div className="puerta-campos">
              <div className="puerta-saco-util">
                <Numero titulo="Alto visible del faldón (mm)" valor={pl.altoFaldon} cambiar={altoFaldon => setLuz({ altoFaldon })} />
                <div className="puerta-saco-rapido" role="group" aria-label="Altos de faldón habituales">
                  {[15, 18, 35].map(cm => (
                    <button type="button" key={cm} className={`chip-3d ${Math.abs(pl.altoFaldon - cm) < 0.01 ? 'glass-chip-activo' : ''}`}
                      aria-pressed={Math.abs(pl.altoFaldon - cm) < 0.01} onClick={() => setLuz({ altoFaldon: cm })}>{cm * 10}</button>
                  ))}
                </div>
              </div>
              <Numero titulo="Extra de ancho en faldón (mm)" valor={pl.extraAnchoFaldon} cambiar={extraAnchoFaldon => setLuz({ extraAnchoFaldon })} />
            </div>
            <p className="puerta-ayuda">
              Corte del faldón: {p.frente > 0 ? `${num(p.frente + pl.extraAnchoFaldon)} × ${num(2 * pl.altoFaldon)} mm` : 'indica frente'} (2 × alto visible).
            </p>
            {!esTransp && <>
              <div className="puerta-campos">
                <Numero titulo="Bajada E.T. inferior del paño (mm)" valor={pl.bajoEt} cambiar={bajoEt => setLuz({ bajoEt })} />
              </div>
              <label className="puerta-casilla"><input type="checkbox" checked={pl.pestana3} onChange={e => setLuz({ pestana3: e.target.checked })} />Pestaña lateral izquierda de 30 mm (cerrar E.T. 20 mm máx.)</label>
            </>}
            <label className="puerta-casilla"><input type="checkbox" checked={Boolean(p.sacoDiagonalesAmarillas)} onChange={e => patch({ sacoDiagonalesAmarillas: e.target.checked })} />Faldón con franjas amarillas / negras (impresión digital)</label>
          </fieldset>

          <fieldset>
            <legend>Saco contrapeso interior para arena (220 mm)</legend>
            <label className="puerta-casilla"><input type="checkbox" checked={pl.sacoArena} onChange={e => setLuz({ sacoArena: e.target.checked })} />Incluir saco interior para rellenar de arena</label>
            {pl.sacoArena && (
              <div className="puerta-campos">
                <Numero titulo="Descuento ancho sobre frente (mm)" valor={pl.descuentoSacoArena} cambiar={descuentoSacoArena => setLuz({ descuentoSacoArena })} />
                <Numero titulo="Marca soldadura superior (mm)" valor={pl.soldaduraSacoArena} cambiar={soldaduraSacoArena => setLuz({ soldaduraSacoArena })} />
                <label className="field puerta-campo">
                  <span>Material saco arena (vacío = lona)</span>
                  <input aria-label="Material saco arena" value={pl.materialSacoArena} placeholder={`${p.material} ${p.color}`.trim()} onChange={e => setLuz({ materialSacoArena: e.target.value })} />
                </label>
              </div>
            )}
            {pl.sacoArena && (
              <p className="puerta-ayuda">
                Corte saco arena: {p.frente > pl.descuentoSacoArena ? `${num(p.frente - pl.descuentoSacoArena)} × 220 mm` : 'revisa el frente'} · marcas de rotulador a {num(REGLAS_PUERTAS_LUZ.altoSacoArena - pl.soldaduraSacoArena)} mm y pisar 30 mm.
              </p>
            )}
          </fieldset>
        </>}

        {activa === 'otros' && <>
          <fieldset>
            <legend>Materiales y rollos</legend>
            <div className="puerta-campos">
              {texto('Material de lona', 'material')}
              <Numero titulo="Rollo de lona (mm)" valor={p.rollo} cambiar={rollo => patch({ rollo })} />
              <Numero titulo="Rollo transparente (mm)" valor={p.rolloCristal} cambiar={rolloCristal => patch({ rolloCristal })} />
              {texto('Material transparente', 'materialCristal')}
              {texto('Material del faldón', 'materialSaco')}
              <Numero titulo="Rollo del faldón (mm)" valor={p.rolloSaco} cambiar={rolloSaco => patch({ rolloSaco })} />
              <Numero titulo="Margen de marcas (mm)" valor={p.margenMarcas} cambiar={margenMarcas => patch({ margenMarcas })} />
            </div>
          </fieldset>
          <label className="field puerta-campo puerta-campo-ancho">
            <span>Nota en el plano (opcional)</span>
            <textarea aria-label="Nota en el plano" value={p.notaPlano ?? ''} onChange={e => patch({ notaPlano: e.target.value })} />
          </label>
        </>}

        <div className="puerta-confirmaciones">
          <label className="puerta-casilla">
            <input type="checkbox" checked={p.confirmada && p.ventanasConfirmadas}
              onChange={e => cambiar({ ...p, confirmada: e.target.checked, ventanasConfirmadas: e.target.checked })} />
            Confirmado con el dibujo: tipo, medidas, E.T., faldón y saco de arena
          </label>
        </div>
      </section>

      <div className="puerta-derecha">
        <div className="puerta-dibujo">{vistas}{derecha === 'corte' && corte ? corte : <AlzadoPuerta puerta={p} resultado={r} letra={letra} />}</div>
        <section className="puerta-avisos panel panel-vidrio" aria-label="Comprobaciones de puerta">
          <h2>Qué falta o revisar <span>{r.avisos.filter(a => a.nivel === 'error').length} pendientes</span></h2>
          {r.avisos.length
            ? <ul>{r.avisos.map((a, i) => <li key={i} className={a.nivel === 'error' ? 'es-error' : ''}>{textoMedidasMm(a.texto)}</li>)}</ul>
            : <p>Todo listo: las medidas comprobadas son coherentes.</p>}
        </section>
      </div>
    </div>
    <details className="puerta-piezas panel panel-vidrio">
      <summary>Piezas calculadas · {r.piezas.reduce((s, x) => s + x.cantidad, 0)} piezas</summary>
      <table>
        <thead><tr><th>Pieza</th><th>Corte (mm)</th><th>Material</th><th>Cantidad</th><th>Huecos</th></tr></thead>
        <tbody>{r.piezas.map(x => <tr key={x.id}><td>{x.nombre}</td><td>{num(x.ancho)} × {num(x.alto)}</td><td>{x.material}</td><td>{x.cantidad}</td><td>{x.huecos.length}</td></tr>)}</tbody>
      </table>
    </details>
  </>;
}
