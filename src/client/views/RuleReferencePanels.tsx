import React, { useState } from 'react';
import { NumberField } from '../components/NumberField';
import { SelectField } from '../components/SelectField';
import type { FabricJobParameters } from '../types';
import { anticaVariants, calculateAnticaBodyDrop } from '../../domain/anticaRules.js';
import { ANTICA_RULES, anticaRoundEntrySpecs, getAnticaDiscounts, getAnticaDropRule } from '../../domain/anticaParameters.js';
import { HERA_RULES, HERA_FABRIC_ALLOWANCES, HERA_SPECIAL_TUBE_FROM_CM } from '../../domain/heraParameters.js';
import { defaultIrisParameters, getIrisDiscounts, getIrisFabricDropAllowance, getIrisLimits, irisSubmodels, irisGuideTypes, irisDevices, irisSeriesOf, irisHasCassette } from '../../domain/irisParameters.js';

const number = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
function Band({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return <div className="parameter-band rule-reference-band"><div className="parameter-band-title"><span>{id}</span><div><h3>{title}</h3><p>{description}</p></div></div><div className="rule-reference-content">{children}</div></div>;
}
function Table({ label, columns, rows }: { label: string; columns: string[]; rows: React.ReactNode[][] }) {
  return <div className="parameter-table-wrap"><table className="parameter-table rule-reference-table" aria-label={label}><thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
function anticaFormula(variant: string, separate: boolean) {
  const rule = getAnticaDropRule(variant, separate);
  const base = rule.base === 'diagonal' ? '√(S² + H²)' : rule.base === 'squareDiagonal' ? 'S × √2' : 'S';
  return base + ' + ' + number(rule.allowance) + (rule.includeValance ? ' + B' : '');
}

export function AnticaRuleReference() {
  const [variant, setVariant] = useState<string>(anticaVariants[0] || '');
  const [projection, setProjection] = useState<number | null>(200);
  const [supportHeight, setSupportHeight] = useState<number | null>(100);
  const [valanceHeight, setValanceHeight] = useState<number | null>(25);
  const [separate, setSeparate] = useState(false);
  const noValance = variant === 'TUBO 50X30 SIN BAMBA';
  const actualSeparate = !noValance && separate && Number(valanceHeight) > 0;
  const rule = getAnticaDropRule(variant, actualSeparate);
  const complete = projection !== null && projection > 0 && (rule.base !== 'diagonal' || (supportHeight !== null && supportHeight > 0)) && (noValance || (valanceHeight !== null && valanceHeight >= 0));
  const result = complete ? calculateAnticaBodyDrop({ awning: { projection }, variant, supportHeight: supportHeight || 0, valanceHeight: noValance ? 0 : valanceHeight || 0, separateValance: actualSeparate }) : null;
  return <>
    <Band id="01" title="Aumentos de tela" description="Antica completo. S = salida; H = altura soporte-brazo; B = alto de bamba. Todas las medidas en cm.">
      <Table label="Aumentos de Antica" columns={['Configuración', 'Bamba en la misma tela / sin bamba', 'Bamba en otra tela']} rows={anticaVariants.map(v => [v, anticaFormula(v, false), v === 'TUBO 50X30 SIN BAMBA' ? 'No admite bamba' : anticaFormula(v, true)])} />
      <p>Con bamba en otra tela, la pieza separada mide el frente indicado × (B + {number(ANTICA_RULES.valanceExtraCm)} cm). Con B = 0 se aplica la columna de la misma tela. El corte se redondea a una décima de cm.</p>
    </Band>
    <Band id="02" title="Comprobar un ejemplo" description="Estas medidas solo sirven para consultar el cálculo; no se guardan en ningún pedido.">
      <div className="parameter-grid parameter-grid-3">
        <SelectField label="Configuración de ejemplo" value={variant} options={[...anticaVariants] as string[]} onChange={setVariant} />
        <NumberField label="Salida de ejemplo (cm)" value={projection} min={0} step={0.1} onChange={setProjection} />
        <NumberField label="Altura soporte-brazo de ejemplo (cm)" value={supportHeight} min={0} step={0.1} onChange={setSupportHeight} />
        {!noValance && <NumberField label="Bamba de ejemplo (cm)" value={valanceHeight} min={0} step={0.1} onChange={setValanceHeight} />}
      </div>
      {!noValance && <label className="rule-reference-toggle"><input type="checkbox" checked={separate} onChange={e => setSeparate(e.target.checked)} />Bamba en otra tela</label>}
      <output className="rule-reference-result" aria-live="polite">{result === null ? 'Indica las medidas necesarias para calcular.' : 'Caída de corte: ' + number(Math.round((result + Number.EPSILON) * 10) / 10) + ' cm'}<small>{anticaFormula(variant, actualSeparate)}</small></output>
    </Band>
    <Band id="03" title="Descuentos al frente" description="Restar al frente indicado para obtener cada pieza. Los descuentos de Ø33 y Ø42 son específicos de máquina.">
      <Table label="Descuentos de Antica" columns={['Configuración', 'Dispositivo', 'Tela (cm)', 'Tubo enrollamiento (cm)', 'Carga (cm)']} rows={anticaVariants.flatMap(v => ['MAQUINA', 'MOTOR'].map(device => { const d = getAnticaDiscounts(v, device); return [v, device, number(d.fabric), number(d.roll), number(d.load)]; }))} />
    </Band>
    <Band id="04" title="Brazos, stock y confección" description="Reglas actuales de selección automática.">
      <Table label="Reglas generales de Antica" columns={['Regla', 'Aplicación']} rows={[
        ['Brazos', 'Hasta ' + ANTICA_RULES.armSwitchWidth + ' cm: 2; por encima: 3. Se pueden indicar de 2 a 4 por toldo.'],
        ['Tubo de enrollamiento', 'Hasta ' + ANTICA_RULES.armSwitchWidth + ' cm: P701; por encima: P801. Depende del frente, no del cambio manual de brazos.'],
        ['Motor', '2 brazos: 15/17; 3 o 4 brazos: 35/17.'],
        ['Barras comerciales', ANTICA_RULES.stockLengths.map(number).join(' / ') + ' cm. Se elige la menor que admita tubo y carga.'],
        ['Costura entre paños', number(ANTICA_RULES.seamAllowanceCm) + ' cm'], ['Margen base de paño', number(ANTICA_RULES.seamBaseCm) + ' cm']
      ]} />
      <p>Estos aumentos corresponden al toldo completo. Para sustituir únicamente la tela consulta «Cambio Antica», que utiliza otras reglas.</p>
    </Band>
  </>;
}

export function HeraRuleReference() {
  return <>
    <Band id="01" title="Descuentos y aumentos" description="F = frente; C = caída indicada; A = altura de instalación. Todas las medidas en cm.">
      <Table label="Reglas HERA por variante" columns={['Variante', 'Frente tela', 'Caída tela', 'Tubo', 'Longitud cadena']} rows={Object.entries(HERA_RULES).map(([variant, rule]) => [variant, 'F − ' + number(rule.fabricWidthDiscountCm), 'C + ' + number(rule.fabricDropAllowanceCm), 'F − ' + number(rule.rollTubeDiscountCm), rule.chainHeightDiscountCm === null ? 'No lleva' : '(A − ' + number(rule.chainHeightDiscountCm) + ') × 2'])} />
    </Band>
    <Band id="02" title="Confección y empates" description="Se aplican después de obtener las medidas de tela de la tabla superior.">
      <Table label="Confección HERA" columns={['Concepto', 'Aplicación']} rows={[
        ['Bastillas en acrílico', '+' + number(HERA_FABRIC_ALLOWANCES.acrylicSideHemCm) + ' cm a cada lado del frente.'],
        ['Empate', '+' + number(HERA_FABRIC_ALLOWANCES.joinCm) + ' cm por unión.'],
        ['Escuadrado con empate', '+' + number(HERA_FABRIC_ALLOWANCES.squaringEachEndCm) + ' cm en cada extremo del largo de paño.'],
        ['Vertical', 'Las uniones amplían el frente; el largo de paño es caída de tela + escuadrado.'],
        ['Horizontal', 'Las uniones amplían la caída; el largo de paño es frente con bastillas + escuadrado.'],
        ['Sin empate', 'El frente con bastillas debe caber en el rollo. Sin aumento de escuadrado.'],
        ['Tubo especial', 'Aviso cuando el frente supera ' + number(HERA_SPECIAL_TUBE_FROM_CM) + ' cm.']
      ]} />
      <p>En el pedido se eligen variante, empate, cara interior y remate inferior. La web sigue requiriendo completar el planteamiento en CAD y reserva únicamente tela para HERA.</p>
    </Band>
  </>;
}

export function IrisRuleReference() {
  const [submodel, setSubmodel] = useState(irisSubmodels[0]);
  const [guideType, setGuideType] = useState(irisGuideTypes[0]);
  const [device, setDevice] = useState('MAQUINA');
  const [windBlock, setWindBlock] = useState(false);
  const params = defaultIrisParameters;
  const config = { submodel, guideType, device, windBlock };
  const cuts = getIrisDiscounts(params, config) as Record<string, number | boolean> | null;
  const limits = getIrisLimits(irisSeriesOf(submodel));
  const discount = (key: string) => typeof cuts?.[key] === 'number' ? number(cuts[key] as number) + ' cm' : 'No aplica';
  return <>
    <Band id="01" title="Configuración a consultar" description="La tabla cambia con el tamaño, cofre, guía, accionamiento y sistema SWBS.">
      <div className="parameter-grid parameter-grid-3"><SelectField label="Variante Iris" value={submodel} options={irisSubmodels} onChange={setSubmodel} /><SelectField label="Guía Iris" value={guideType} options={irisGuideTypes} onChange={setGuideType} /><SelectField label="Dispositivo Iris" value={device} options={irisDevices} onChange={setDevice} /></div>
      <label className="rule-reference-toggle"><input type="checkbox" checked={windBlock} onChange={e => setWindBlock(e.target.checked)} />Sistema de bloqueo de viento SWBS</label>
      {!cuts ? <p role="status" className="rule-reference-warning">Esta combinación no tiene tabla de descuentos y la web no la admite como configuración estándar.</p> : <>
        {cuts.unverified && <p className="rule-reference-warning">IRIS 130 sin cofre: descuentos basados en históricos; pendiente de tabla del fabricante.</p>}
        {irisSeriesOf(submodel) === '110' && guideType === 'COMPENSADORA' && device === 'MAQUINA' && !windBlock && <p className="rule-reference-warning">Descuento de tela de 9,7 cm pendiente de aclarar con OT: existe una anotación «NON DESCONTAR» en la evidencia original. Aquí se muestra el valor que aplica actualmente la web.</p>}
        <Table label="Descuentos Iris seleccionados" columns={['Pieza', 'Descuento', 'Medida de partida']} rows={[
          ['Tela', discount('fabric'), 'Frente del toldo'], ['Cofre', irisHasCassette(submodel, guideType) ? discount('box') : 'No lleva', 'Frente; con compensadora, frente superior si es el mayor'],
          ['Tubo de enrollamiento', discount('roll'), 'Frente del toldo'], ['Barra de carga', discount('loadBar'), 'Frente del toldo'], ['Contrapeso', discount('ballast'), 'Frente del toldo'],
          ['Guía · pared / techo', discount('guideWall') + ' / ' + discount('guideCeiling'), 'Altura de cada lado'],
          ['ZIP · pared / techo', discount('zipWall') + ' / ' + discount('zipCeiling'), 'Altura de cada lado'],
          ['Compensador · pared / techo', discount('compensatorWall') + ' / ' + discount('compensatorCeiling'), 'Altura de cada lado'],
          ['Terminal SWBS', discount('windBlockTerminal'), 'Frente del toldo']
        ]} />
        <p>Caída de tela = caída del hueco escuadrado + <strong>{number(getIrisFabricDropAllowance(params, irisSeriesOf(submodel), device))} cm</strong>. Entre paredes: descuento adicional de <strong>{number(params.betweenWallsDiscountCm)} cm</strong> en piezas horizontales.</p>
      </>}
    </Band>
    <Band id="02" title="Aumentos de caída" description="Valores actuales de taller pendientes de ratificación por OT; no son aumentos certificados por el fabricante.">
      <Table label="Aumentos de caída Iris" columns={['Serie', 'Máquina', 'Motor']} rows={['110', '130', '150'].map(series => [series, series === '150' ? 'Sin configuración admitida' : '+' + number(getIrisFabricDropAllowance(params, series, 'MAQUINA')) + ' cm', '+' + number(getIrisFabricDropAllowance(params, series, 'MOTOR')) + ' cm'])} />
    </Band>
    <Band id="03" title="Límites y comprobaciones" description="El hueco se escuadra con frentes, laterales y diagonales; el resultado sirve como base de corte.">
      <Table label="Límites Iris" columns={['Concepto', 'Valor actual']} rows={[
        ['Serie seleccionada · frente mínimo / máximo', limits ? number(limits.minWidth) + ' / ' + number(limits.maxWidth) + ' cm' : 'No disponible'],
        ['Serie seleccionada · caída mínima / máxima', limits ? number(limits.minDrop) + ' / ' + number(limits.maxDrop) + ' cm' : 'No disponible'],
        ['Compensación por guía', 'Aviso desde más de ' + number(params.compensatorWarnCm) + ' cm; máximo OT ' + number(params.compensatorMaxCm) + ' cm.'],
        ['Diferencia de frentes sin compensadora', 'Aviso si supera ' + number(params.frontDifferenceWarnCm) + ' cm.'],
        ['Ventana de cristal', 'Descuenta ' + number(params.glassFabricSavingM) + ' ml de tela por paño. Rollos de cristal hasta 450 cm.']
      ]} />
      <p>Esta consulta muestra los valores generales actuales. Un pedido con parámetros guardados o una excepción técnica debe revisarse en su propio cálculo.</p>
    </Band>
  </>;
}

export function CambioAnticaRuleReference({ parameters }: { parameters: FabricJobParameters }) {
  return <Band id="03" title="Aumentos por configuración" description="Cambio de tela Antica. S = salida base y B = alto de bamba; medidas en cm.">
    <Table label="Aumentos Cambio Antica" columns={['Configuración', 'Misma tela / sin bamba', 'Bamba en otra tela']} rows={[
      ['Configuraciones no redondas', 'S + ' + number(parameters.dropAllowanceByModel['CAMBIO ANTICA']) + ' + B + ' + number(parameters.valanceExtraCm), 'S + ' + number(parameters.anticaSeparateValanceAllowanceCm)],
      ...Object.entries(anticaRoundEntrySpecs).map(([variant, rule]) => [variant + ' · medida base', 'S + ' + number(rule.cambioDropAllowanceCm) + ' + B + ' + number(parameters.valanceExtraCm), 'S + ' + number(rule.cambioSeparateValanceAllowanceCm)]),
      ['Ø33 / Ø42 · tela terminada', 'Caída indicada, sin aumento adicional', 'Caída indicada, sin aumento adicional']
    ]} />
    <p>El modo «tela terminada» ya incluye la entrada de tubo y la bamba. La bamba de otro tejido se corta aparte con B + {number(parameters.valanceExtraCm)} cm. «50×30 sin bamba» no admite B mayor que cero.</p>
    <p>Las entradas redondas en medida base utilizan sus aumentos específicos, no el margen general. Las excepciones técnicas del pedido pueden cambiar frente, remate y aumento; con tela terminada no se vuelve a sumar el aumento. En las variantes no redondas con bamba separada se aplica el aumento específico de bamba en otra tela.</p>
  </Band>;
}
