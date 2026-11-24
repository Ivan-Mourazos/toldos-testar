import React, { useId, useState } from 'react';
import { alturasTubos, calcularPuerta, yEnTramo } from '../../puertas/calcular.ts';
import { BAJADA_TUBO_INFERIOR_BELTS, huecosCintasBelts, REGLAS_BELTS } from '../../puertas/belts.ts';
import { fichaDePuerta, tipoDePuerta } from '../../puertas/clientes.ts';
import { cambiarTipoDelCliente } from '../../puertas/nuevaPuertaCliente.ts';
import { panoContinuoEnrollable } from '../../puertas/ventanalesEnrollable.ts';
import type { ConfiguracionBelts, Entrada, Puerta } from '../../puertas/tipos.ts';
import { SegmentedField } from '../components/SegmentedField';
import { SelectField } from '../components/SelectField';
import { AlzadoPuerta } from './AlzadoPuerta';
import { cintasDesdeFila, ejesDesdeTramos, leerCadena } from './cadenaDibujo';
import { desdeMilimetros, medidaPuerta as num, textoMedidasMm, type UnidadPuerta } from './medidasPuertas';
import { NumeroPuerta } from './NumeroPuerta';
import { VentanasEntreTubos } from './PuertasView';

type TabBelts = 'medidas' | 'et' | 'ventanas' | 'saco' | 'otros';

function Numero({ titulo, valor, cambiar, unidad = 'cm' }: { titulo: string; valor: number | null; unidad?: UnidadPuerta; cambiar: (v: number) => void }) {
  return <NumeroPuerta titulo={titulo} valor={valor} unidad={unidad} cambiar={v => cambiar(v ?? 0)} />;
}

export function ConfigurarBelts({ p, cambiar, corte, derecha, letra, vistas }: {
  p: Puerta;
  cambiar: (p: Puerta) => void;
  corte?: React.ReactNode;
  derecha: 'alzado' | 'corte';
  letra: string;
  vistas?: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabBelts>('medidas');
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
  const b = p.belts!;
  const r = calcularPuerta(p);
  const ple = p.modelo === 'PUERTAPLE';
  const enr = p.modelo === 'PUERTAENR';

  const patch = (q: Partial<Puerta>) => cambiar({ ...p, ...q, confirmada: false, ventanasConfirmadas: false });
  const setBelts = (q: Partial<ConfiguracionBelts>) => patch({ belts: { ...b, ...q } });

  const anchoCinta = b.cintaAncho ?? REGLAS_BELTS.cintaAncho;
  const altoCinta = b.cintaAlto ?? REGLAS_BELTS.cintaAlto;

  function actualizarCadena(parche: Partial<Puerta['apilable']>) {
    const nuevo: Puerta = { ...p, apilable: { ...p.apilable, ...parche }, confirmada: false, ventanasConfirmadas: false };
    nuevo.entradas = alturasTubos(nuevo).map((altura, i) => ({
      ...(p.entradas[i] ?? { diametro: 42 as const, largo: p.frente, alto: b.anchoEt, huecos: [] }),
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
        ...(p.entradas[i] ?? { diametro: 30 as const, largo: p.frente, alto: b.anchoEt, huecos: [] }),
        altura,
        largo: p.frente,
        alto: p.entradas[i]?.alto || b.anchoEt,
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
        huecos: (ninguna ? i % 2 === 0 : conCintas(e)) ? huecosCintasBelts(res.xs, e.alto || b.anchoEt, anchoCinta, altoCinta) : [],
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

  const tabs: Array<[TabBelts, string]> = [
    ['medidas', 'Medidas'],
    ['et', 'E.T.'],
    ['ventanas', 'Ventanas'],
    ['saco', 'Bajo y saco'],
    ['otros', 'Otros ajustes'],
  ];

  const tipoVentanasEnr = p.enrollable.ventanasPequenas ? 'Ventanas pequeñas' : p.enrollable.sinVentanal ? 'Puerta ciega' : 'Ventanal';

  return <>
    <div className="puerta-config-alzado">
      <section className="puerta-config panel panel-vidrio" aria-label="Configurador de Belts Vigo">
        <header><h2>Configurador</h2><span>Belts Vigo · medidas en mm</span></header>
        <div className="tira-3d puerta-pestanas" role="tablist" aria-label="Partes de la puerta">
          {tabs.map(([id, nombre]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id}
              className={`pestana ${tab === id ? 'pestana-activa' : ''}`} onClick={() => setTab(id)}>{nombre}</button>
          ))}
        </div>

        {tab === 'medidas' && <>
          <div className="puerta-campos">
            {texto('OF de puerta', 'of', true)}
            <Numero titulo="Cantidad de puertas iguales" unidad="cantidad" valor={p.cantidad} cambiar={cantidad => patch({ cantidad })} />
            <SelectField label="Tipo de puerta" value={tipoDePuerta(p).id} options={ficha.tipos.map(t => t.id)}
              optionLabel={v => ficha.tipos.find(t => t.id === v)?.nombre ?? ''} onChange={v => cambiar(cambiarTipoDelCliente(p, v))} />
            <Numero titulo="Frente (mm)" valor={p.frente || null} cambiar={frente => patch({ frente, entradas: p.entradas.map(e => ({ ...e, largo: frente })) })} />
            <Numero titulo="Alto (mm)" valor={p.alto || null} cambiar={alto => patch({ alto })} />
            {texto('Color / RAL', 'color')}
          </div>
          <p className="puerta-ayuda">Laterales al corte (+0 mm). E.T. inferior integrada con pestaña izquierda de 30 mm y saco exterior rectangular sin pestaña.</p>
        </>}

        {tab === 'et' && <>
          {ple ? <>
            <fieldset>
              <legend>Cadena de tubos</legend>
              <label className="field puerta-campo puerta-campo-ancho">
                <span>Cadena del dibujo, de abajo arriba (mm)</span>
                <input aria-label="Cadena del dibujo" value={cadenaTxt} placeholder="500 500 500 500 500 500 500"
                  onChange={e => setCadenaTxt(e.target.value)} onBlur={aplicarCadena}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) aplicarCadena(); }} />
                <small>{cadenaAviso || 'Rellena pie, pasos entre tubos y cabecera de una vez, en mm.'}</small>
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
                <Numero titulo="Ancho de corte E.T. por defecto (mm)" valor={b.anchoEt} cambiar={anchoEt => {
                  patch({ belts: { ...b, anchoEt }, entradas: p.entradas.map(e => ({ ...e, alto: anchoEt, huecos: conCintas(e) ? huecosCintasBelts(e.huecos.map(h => h.x), anchoEt, anchoCinta, altoCinta) : [] })) });
                }} />
                <Numero titulo="Ancho recorte cinta (mm)" valor={anchoCinta} cambiar={cintaAncho => setBelts({ cintaAncho })} />
                <Numero titulo="Alto recorte cinta (mm)" valor={altoCinta} cambiar={cintaAlto => setBelts({ cintaAlto })} />
                <label className="field puerta-campo puerta-campo-ancho">
                  <span>Etiqueta de E.T. en el plano</span>
                  <input aria-label="Etiqueta de E.T. en el plano" value={b.etiquetaEt ?? ''} onChange={e => setBelts({ etiquetaEt: e.target.value })} />
                </label>
                <label className="field puerta-campo puerta-campo-ancho">
                  <span>Cintas del dibujo, desde la izquierda (mm)</span>
                  <input aria-label="Cintas del dibujo" value={cintasTxt} placeholder="580 100 930 100"
                    onChange={e => setCintasTxt(e.target.value)} onBlur={aplicarCintas}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) aplicarCintas(); }} />
                  <small>{cintasAviso || 'Mitad izquierda: hasta el primer recorte, ancho del recorte, hasta el siguiente… Sin muescas laterales de 50 mm.'}</small>
                </label>
              </div>
              {p.entradas.map((e, i) => (
                <div className="puerta-campos puerta-tubo-fila" key={i}>
                  <span className="puerta-tubo-nombre">Tubo {i + 1} · eje a {num(e.altura)} mm</span>
                  <Numero titulo={`Alto E.T. ${i + 1} (mm)`} valor={e.alto} cambiar={alto => patch({
                    entradas: p.entradas.map((x, j) => (j === i ? { ...x, alto, huecos: conCintas(x) ? huecosCintasBelts(x.huecos.map(h => h.x), alto, anchoCinta, altoCinta) : [] } : x)),
                  })} />
                  <SegmentedField label={`Cintas tubo ${i + 1}`} value={conCintas(e) ? 'Sí' : 'No'} options={['No', 'Sí']} onChange={v => {
                    if (v === 'Sí' && !xsCintasActuales.length) { setCintasAviso('Escribe antes las cintas del dibujo.'); return; }
                    patch({
                      entradas: p.entradas.map((x, j) => (j === i ? { ...x, huecos: v === 'Sí' ? huecosCintasBelts(xsCintasActuales, x.alto || b.anchoEt, anchoCinta, altoCinta) : [] } : x)),
                    });
                  }} />
                </div>
              ))}
            </fieldset>
          </> : <>
            <fieldset>
              <legend>Entradas de tubo · {p.entradas.length} E.T.</legend>
              <div className="puerta-campos">
                <label className="field puerta-campo puerta-campo-ancho">
                  <span>Tramos de las E.T., de abajo arriba (mm)</span>
                  <input aria-label="Tramos de las E.T." value={tramosTxt} placeholder="1050 450 450 1260 1000"
                    onChange={e => setTramosTxt(e.target.value)} onBlur={aplicarTramos}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) aplicarTramos(); }} />
                  <small>{tramosAviso || 'Del bajo al primer eje y de eje a eje en mm. La web suma cada altura.'}</small>
                </label>
                <Numero titulo="Ancho de corte E.T. (mm)" valor={b.anchoEt} cambiar={anchoEt => patch({
                  belts: { ...b, anchoEt }, entradas: p.entradas.map(e => ({ ...e, alto: anchoEt })),
                })} />
                <label className="field puerta-campo puerta-campo-ancho">
                  <span>Etiqueta de E.T. en el plano</span>
                  <input aria-label="Etiqueta de E.T. en el plano" value={b.etiquetaEt ?? ''} onChange={e => setBelts({ etiquetaEt: e.target.value })} />
                </label>
              </div>
              <label className="puerta-casilla"><input type="checkbox" checked={Boolean(b.pisarEt1cm)} onChange={e => setBelts({ pisarEt1cm: e.target.checked })} />Nota de taller «DE ESTE LADO PISAR LAS E.T. 1 CM»</label>
              <label className="puerta-casilla"><input type="checkbox" checked={Boolean(b.cierreVelcro)} onChange={e => setBelts({ cierreVelcro: e.target.checked })} />Cierre con velcro de 30 mm en las E.T.</label>
              {p.entradas.map((e, i) => (
                <div className="puerta-campos" key={i}>
                  <Numero titulo={`Eje tubo ${i + 1} (mm)`} valor={e.altura} cambiar={altura => patch({ entradas: p.entradas.map((x, j) => (j === i ? { ...x, altura } : x)) })} />
                  <Numero titulo={`Alto E.T. ${i + 1} (mm)`} valor={e.alto} cambiar={alto => patch({ entradas: p.entradas.map((x, j) => (j === i ? { ...x, alto } : x)) })} />
                  <button type="button" className="ghost-button" onClick={() => patch({ entradas: p.entradas.filter((_, j) => j !== i) })}>Quitar E.T. {i + 1}</button>
                </div>
              ))}
              <button type="button" className="ghost-button" onClick={() => patch({ entradas: [...p.entradas, { altura: 0, diametro: 30, largo: p.frente, alto: b.anchoEt, huecos: [] }] })}>Añadir E.T.</button>
            </fieldset>
          </>}
        </>}

        {tab === 'ventanas' && <>
          {enr && (
            <fieldset>
              <legend>Ventanas o ventanal</legend>
              <SegmentedField label="Tipo de ventanas" value={tipoVentanasEnr} options={['Ventanas pequeñas', 'Ventanal', 'Puerta ciega']} onChange={v => {
                if (v === tipoVentanasEnr) return;
                patch({ ventanas: [], enrollable: { ...p.enrollable, ventanasPequenas: v === 'Ventanas pequeñas', sinVentanal: v === 'Puerta ciega', empates: [] } });
              }} />
              {!panoContinuoEnrollable(p) && <>
                <div className="puerta-campos">
                  <Numero titulo="T · desde arriba al eje (mm)" valor={p.enrollable.T || null} cambiar={T => patch({ enrollable: { ...p.enrollable, T } })} />
                  <Numero titulo="D · entre ejes del ventanal (mm)" valor={p.enrollable.D} cambiar={D => patch({ enrollable: { ...p.enrollable, D } })} />
                  <Numero titulo="Margen lateral m (mm)" valor={p.enrollable.margen || null} cambiar={margen => patch({ enrollable: { ...p.enrollable, margen } })} />
                </div>
                {(p.enrollable.ventanales ?? []).map((v, i) => (
                  <div className="puerta-campos" key={i}>
                    <Numero titulo={`D ventanal ${i + 2} (mm)`} valor={v.D} cambiar={D => patch({ enrollable: { ...p.enrollable, ventanales: p.enrollable.ventanales!.map((x, j) => (j === i ? { ...x, D } : x)) } })} />
                    <Numero titulo={`Margen ventanal ${i + 2} (mm)`} valor={v.margen} cambiar={margen => patch({ enrollable: { ...p.enrollable, ventanales: p.enrollable.ventanales!.map((x, j) => (j === i ? { ...x, margen } : x)) } })} />
                    <button type="button" className="ghost-button" onClick={() => patch({ enrollable: { ...p.enrollable, ventanales: p.enrollable.ventanales!.filter((_, j) => j !== i) } })}>Quitar ventanal {i + 2}</button>
                  </div>
                ))}
                <button type="button" className="ghost-button" onClick={() => patch({ enrollable: { ...p.enrollable, ventanales: [...(p.enrollable.ventanales ?? []), { D: p.enrollable.D, margen: p.enrollable.margen }] } })}>Añadir ventanal debajo</button>
              </>}
            </fieldset>
          )}
          {(ple || (enr && p.enrollable.ventanasPequenas)) && <VentanasEntreTubos p={p} cambiar={cambiar} />}
        </>}

        {tab === 'saco' && <>
          {enr && (
            <fieldset>
              <legend>Cabecera</legend>
              <SegmentedField label="Remate superior" value={b.cabecera === 'corte' ? 'Al corte (+0 mm)' : 'Varilla negra 4,5 (+35 mm)'}
                options={['Varilla negra 4,5 (+35 mm)', 'Al corte (+0 mm)']}
                onChange={v => setBelts({ cabecera: v.startsWith('Al corte') ? 'corte' : 'varilla' })} />
            </fieldset>
          )}
          <fieldset>
            <legend>E.T. inferior integrada en el paño</legend>
            <div className="puerta-campos">
              <div className="puerta-saco-util">
                <Numero titulo="Bajada bajo puerta (mm)" valor={b.bajoEt} cambiar={bajoEt => setBelts({ bajoEt, marcaBajoEt: bajoEt * 2 })} />
                <div className="puerta-saco-rapido" role="group" aria-label="Bajada según tubo inferior">
                  {(Object.entries(BAJADA_TUBO_INFERIOR_BELTS) as Array<[keyof typeof BAJADA_TUBO_INFERIOR_BELTS, number]>).map(([tubo, cm]) => (
                    <button type="button" key={tubo} className={`chip-3d ${Math.abs(b.bajoEt - cm) < 0.01 && (b.etiquetaEtInferior ?? '').includes(tubo.replace('×', 'X')) ? 'glass-chip-activo' : ''}`}
                      onClick={() => setBelts({ bajoEt: cm, marcaBajoEt: cm * 2, etiquetaEtInferior: `E.T ${tubo.replace('×', 'X')}` })}>{tubo}</button>
                  ))}
                </div>
              </div>
              <Numero titulo="Marca desde borde inferior (mm)" valor={b.marcaBajoEt ?? b.bajoEt * 2} cambiar={marcaBajoEt => setBelts({ marcaBajoEt })} />
              <label className="field puerta-campo">
                <span>Etiqueta E.T. inferior</span>
                <input aria-label="Etiqueta E.T. inferior" value={b.etiquetaEtInferior ?? ''} onChange={e => setBelts({ etiquetaEtInferior: e.target.value })} />
              </label>
            </div>
            <label className="puerta-casilla"><input type="checkbox" checked={b.pestana3} onChange={e => setBelts({ pestana3: e.target.checked })} />Pestaña lateral izquierda de 30 mm (cerrar E.T. 20 mm máx.)</label>
          </fieldset>
          <fieldset>
            <legend>Saco exterior rectangular (sin pestaña)</legend>
            <div className="puerta-campos">
              <div className="puerta-saco-util">
                <Numero titulo="Alto de corte del saco (mm)" valor={b.altoSaco} cambiar={altoSaco => setBelts({ altoSaco })} />
                <div className="puerta-saco-rapido" role="group" aria-label="Altos de saco habituales">
                  {[34, 39, 58].map(cm => (
                    <button type="button" key={cm} className={`chip-3d ${Math.abs(b.altoSaco - cm) < 0.01 ? 'glass-chip-activo' : ''}`}
                      aria-pressed={Math.abs(b.altoSaco - cm) < 0.01} onClick={() => setBelts({ altoSaco: cm })}>{cm * 10}</button>
                  ))}
                </div>
              </div>
            </div>
            <p className="puerta-ayuda">Corte del saco: {p.frente > 0 ? `${num(p.frente)} × ${num(b.altoSaco)} mm` : 'indica frente'} (ancho exacto del frente, sin pestaña de velcro).</p>
            <label className="puerta-casilla"><input type="checkbox" checked={Boolean(p.sacoDiagonalesAmarillas)} onChange={e => patch({ sacoDiagonalesAmarillas: e.target.checked, materialSaco: e.target.checked ? 'LAC900 AMARILLO' : 'LAC900 NEGRO' })} />Saco con franjas amarillas / negras (impresión digital)</label>
          </fieldset>
        </>}

        {tab === 'otros' && <>
          <fieldset>
            <legend>Materiales y rollos</legend>
            <div className="puerta-campos">
              {texto('Material de lona', 'material')}
              <Numero titulo="Rollo de lona (mm)" valor={p.rollo} cambiar={rollo => patch({ rollo })} />
              <Numero titulo="Rollo transparente (mm)" valor={p.rolloCristal} cambiar={rolloCristal => patch({ rolloCristal })} />
              {texto('Material transparente', 'materialCristal')}
              {texto('Material de saco', 'materialSaco')}
              <Numero titulo="Rollo de saco (mm)" valor={p.rolloSaco} cambiar={rolloSaco => patch({ rolloSaco })} />
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
            Confirmado con el dibujo: tipo, medidas, E.T., ventanas y saco
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
