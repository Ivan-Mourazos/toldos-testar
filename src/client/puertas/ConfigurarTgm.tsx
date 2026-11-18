import React, { useMemo } from 'react';
import { calcularPuerta, calcularPuertaDerivada } from '../../puertas/calcular.ts';
import { fichaPorId } from '../../puertas/clientes.ts';
import { enrolleTgm, puertaTgmDerivada } from '../../puertas/tgm.ts';
import type { Puerta } from '../../puertas/tipos.ts';
import { SelectField } from '../components/SelectField';
import { SegmentedField } from '../components/SegmentedField';
import { AlzadoPuerta } from './AlzadoPuerta';
import { NumeroPuerta as Numero } from './NumeroPuerta';
import { SimuladorEnrolle } from './SimuladorEnrolle';
import { medidaPuerta, textoMedidasMm } from './medidasPuertas';

type Tgm = NonNullable<Puerta['tgm']>;

export function ConfigurarTgm({ p, cambiar, corte, derecha, letra, vistas }: {
  p: Puerta;
  cambiar: (p: Puerta) => void;
  corte?: React.ReactNode;
  derecha: 'alzado' | 'corte';
  letra: string;
  vistas?: React.ReactNode;
}) {
  const t = p.tgm!;
  const { enrolle, derivada, resultado } = useMemo(() => {
    const enrolle = enrolleTgm(p);
    if (!enrolle) return { enrolle, derivada: p, resultado: calcularPuerta(p) };
    const derivada = puertaTgmDerivada(p, enrolle);
    const r = calcularPuertaDerivada(derivada);
    return { enrolle, derivada, resultado: { ...r, avisos: [...enrolle.colocacion.avisos, ...r.avisos] } };
  }, [p]);

  const datos = (cambios: Partial<Puerta>) => cambiar({ ...p, ...cambios, confirmada: false, ventanasConfirmadas: false });
  const medidas = (cambios: Partial<Tgm>, otros?: Partial<Puerta>) => datos({ ...otros, tgm: { ...t, ...cambios } });
  const ajustes = (cambios: Partial<Tgm['ajustes']>) => medidas({ ajustes: { ...t.ajustes, ...cambios } });
  const errores = resultado.avisos.filter(a => a.nivel === 'error').length;
  const texto = (titulo: string, campo: 'of' | 'material' | 'color' | 'materialSaco') => <label className="field puerta-campo">
    <span>{titulo}</span><input value={p[campo]} onChange={e => datos({ [campo]: e.target.value })} />
  </label>;

  function restaurarAjustes() {
    const { margen, desvio, altoPerfil, anchoPerfil, anguloPerfil } = fichaPorId('tgm')!.enrolle!;
    ajustes({ margen, desvio, altoPerfil, anchoPerfil, anguloPerfil });
  }

  function elegirLona(opcion: string) {
    const lona = opcion === 'Rejilla' ? 'rejilla' : 'pvc';
    if (lona === t.lona) return;
    let material = p.material;
    if (lona === 'rejilla' && ['LAC650', 'LAC900'].includes(material.trim().toUpperCase())) material = 'REJILLA';
    if (lona === 'pvc' && /^rejilla\b/i.test(material)) material = 'LAC900';
    medidas({ lona }, { material });
  }

  return <>
    <div className="puerta-config-alzado puerta-config-tgm">
      <section className="puerta-config panel panel-vidrio" aria-label="Configurador TGM">
        <header><h2>Datos de la puerta</h2><span>TGM · medidas en mm</span></header>
        <div className="puerta-campos">
          <Numero titulo="Frente (mm)" valor={p.frente || null} cambiar={v => datos({ frente: v ?? 0 })} />
          <Numero titulo="Alto del hueco (mm)" valor={t.altoHueco || null} cambiar={v => medidas({ altoHueco: v ?? 0 }, { alto: v ?? 0 })} />
          <Numero titulo="Alto total (mm, opcional)" valor={t.altoTotal} cambiar={altoTotal => medidas({ altoTotal })} />
          <Numero titulo="Añadido para enrollar (mm)" valor={t.anadido} cambiar={v => medidas({ anadido: v ?? 0 })} />
          <Numero titulo="Número de tubos" unidad="cantidad" valor={t.nTubos || null} cambiar={v => medidas({ nTubos: Math.trunc(v ?? 0) })} />
          <label className="field puerta-campo"><span>Diámetro de los tubos (mm)</span><input value={t.diametroTubo} readOnly /></label>
          <Numero titulo="Diámetro de enrolle (mm)" unidad="mm" valor={t.diametroEnrolle || null} cambiar={v => medidas({ diametroEnrolle: v ?? 0 })} />
          <Numero titulo="Ancho de E.T. (mm)" valor={t.anchoEt || null} cambiar={v => medidas({ anchoEt: v ?? 0 }, { enrollable: { ...p.enrollable, anchoEt: v ?? 0 } })} />
          <Numero titulo="Grosor de la lona (mm)" unidad="mm" valor={t.grosor || null} cambiar={v => medidas({ grosor: v ?? 0 })} />
          <SegmentedField label="Lona" value={t.lona === 'rejilla' ? 'Rejilla' : 'PVC'} options={['PVC', 'Rejilla']} onChange={elegirLona} />
          <SegmentedField label="Abajo" value={t.abajo === 'saco' ? 'Saco' : 'Tubo'} options={['Saco', 'Tubo']} onChange={v => {
            const abajo = v === 'Saco' ? 'saco' : 'tubo';
            if (abajo !== t.abajo) medidas({ abajo }, { enrollable: { ...p.enrollable, sinSaco: abajo === 'tubo' } });
          }} />
          {t.abajo === 'saco' && <Numero titulo="Saco útil (mm)" unidad="mm" valor={p.enrollable.saco ?? null}
            cambiar={saco => datos({ enrollable: { ...p.enrollable, saco } })} />}
          {texto('Material de lona', 'material')}{texto('Color de puerta', 'color')}
          <Numero titulo="Rollo de lona (mm)" valor={p.rollo} cambiar={v => datos({ rollo: v ?? 0 })} />
          {t.lona === 'rejilla' && <SelectField label="Material de las E.T." value={t.materialEt} options={['LAC650', 'LAC900']}
            optionLabel={v => v} onChange={v => medidas({ materialEt: v === 'LAC650' ? 'LAC650' : 'LAC900' })} />}
          {t.abajo === 'saco' && texto('Material del saco', 'materialSaco')}
          {texto('OF de puerta', 'of')}
          <Numero titulo="Cantidad de puertas iguales" unidad="cantidad" valor={p.cantidad || null} cambiar={v => datos({ cantidad: Math.trunc(v ?? 0) })} />
        </div>
        <details className="puerta-tgm-ajustes">
          <summary>Ajustes del enrolle</summary>
          <div className="puerta-campos">
            <Numero titulo="Margen mínimo (mm)" unidad="mm" valor={t.ajustes.margen} cambiar={v => ajustes({ margen: v ?? 0 })} />
            <Numero titulo="Desvío máximo (mm)" unidad="mm" valor={t.ajustes.desvio} cambiar={v => ajustes({ desvio: v ?? 0 })} />
            <Numero titulo="Alto del perfil fleco (mm)" unidad="mm" valor={t.ajustes.altoPerfil} cambiar={v => ajustes({ altoPerfil: v ?? 0 })} />
            <Numero titulo="Ancho del perfil fleco (mm)" unidad="mm" valor={t.ajustes.anchoPerfil} cambiar={v => ajustes({ anchoPerfil: v ?? 0 })} />
            <Numero titulo="Ángulo mínimo al perfil (°)" unidad="cantidad" valor={t.ajustes.anguloPerfil} cambiar={v => ajustes({ anguloPerfil: v ?? 0 })} />
          </div>
          <button type="button" className="ghost-button" onClick={restaurarAjustes}>Restaurar valores por defecto</button>
        </details>
        <label className="puerta-casilla">
          <input type="checkbox" checked={p.confirmada && p.ventanasConfirmadas}
            onChange={e => cambiar({ ...p, confirmada: e.target.checked, ventanasConfirmadas: e.target.checked })} />
          Confirmado con el dibujo y los rollos reales
        </label>
      </section>
      <div className="puerta-derecha">
        <div className="puerta-dibujo"><div className="puerta-tgm-vista">
          {vistas}{derecha === 'corte' && corte ? corte : <AlzadoPuerta puerta={derivada} resultado={resultado} letra={letra} />}
        </div></div>
        <section className="puerta-avisos panel panel-vidrio" aria-label="Comprobaciones de puerta">
          <h2>Qué falta o revisar <span>{errores} pendientes</span></h2>
          {resultado.avisos.length > 0 && <ul>{resultado.avisos.map(a => <li key={`${a.codigo}-${a.texto}`} className={a.nivel === 'error' ? 'es-error' : undefined}>
            {textoMedidasMm(a.texto)}
          </li>)}</ul>}
        </section>
      </div>
    </div>
    {enrolle ? <SimuladorEnrolle enrolle={enrolle} manual={t.tubosManual !== null} cambiarManual={tubosManual => medidas({ tubosManual })} />
      : <section className="simulador-enrolle panel panel-vidrio" aria-label="Simulador de enrolle">
        <h2>Simulador de enrolle</h2><p className="puerta-ayuda">Escribe el frente y el alto del hueco para ver el enrolle.</p>
      </section>}
    <details className="puerta-piezas panel panel-vidrio">
      <summary>Piezas calculadas · {resultado.piezas.reduce((s, x) => s + x.cantidad, 0)} piezas</summary>
      <table><thead><tr><th>Pieza</th><th>Corte (mm)</th><th>Material</th><th>Cantidad</th></tr></thead>
        <tbody>{resultado.piezas.map(x => <tr key={x.id}><td>{x.nombre}</td><td>{medidaPuerta(x.ancho)} × {medidaPuerta(x.alto)}</td>
          <td>{x.material}</td><td>{x.cantidad}</td></tr>)}</tbody>
      </table>
    </details>
  </>;
}
